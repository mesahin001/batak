/**
 * WebSocket sunucusu.
 * Client-server arası tüm oyun iletişimini yönetir: kuyruk, ihale, kart oynama, tur geçişleri.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Matchmaker } from '../matchmaker/Matchmaker.js';
import { ClientEvent, ServerEvent, JoinQueuePayload, PlayCardPayload, BidTrumpPayload } from '../types/socket.js';
import { config } from '../config.js';
export class SocketServer {
  private io: SocketIOServer;
  private matchmaker: Matchmaker;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.matchmaker = new Matchmaker();
    this.setupEventHandlers();
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle join queue
      socket.on(ClientEvent.JOIN_QUEUE, (payload: JoinQueuePayload) => {
        this.handleJoinQueue(socket, payload);
      });

      // Handle leave queue
      socket.on(ClientEvent.LEAVE_QUEUE, () => {
        this.handleLeaveQueue(socket);
      });

      // Handle play card
      socket.on(ClientEvent.PLAY_CARD, (payload: PlayCardPayload) => {
        this.handlePlayCard(socket, payload);
      });

      // Handle bid trump
      socket.on(ClientEvent.BID_TRUMP, (payload: BidTrumpPayload) => {
        this.handleBidTrump(socket, payload);
      });

      // Handle player ready
      socket.on(ClientEvent.PLAYER_READY, () => {
        this.handlePlayerReady(socket);
      });

      // Handle request next round (multi-round)
      socket.on(ClientEvent.REQUEST_NEXT_ROUND, () => {
        this.handleRequestNextRound(socket);
      });

      // Handle disconnect
      socket.on(ClientEvent.DISCONNECT, () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handle join queue request
   */
  private handleJoinQueue(socket: Socket, payload: JoinQueuePayload): void {
    console.log(`[Matchmaker] Player ${socket.id} joining queue`);
    console.log('[Matchmaker] Payload:', payload);

    const roomId = this.matchmaker.joinQueue({
      socketId: socket.id,
      socket,  // Pass socket reference for emitting queue_status
      publicKey: payload.publicKey,
      botDifficulty: payload.botDifficulty || 'normal',
      botCount: payload.botCount !== undefined ? payload.botCount : 3,
      gameMode: payload.gameMode || 'koz_maca'
    });

    console.log(`[Matchmaker] Room created: ${roomId}`);

    // Note: If roomId is returned, the matchmaker has already:
    // - Added sockets to room
    // - Started the game
    // - Sent match_found to all players
    // So we don't need to do anything here.

    // If roomId is null, player is in queue waiting for match
    // Bot fallback will trigger after 30s if no match found
  }

  /**
   * Handle leave queue request
   */
  private handleLeaveQueue(socket: Socket): void {
    console.log(`Player ${socket.id} leaving queue`);
    // Try to find publicKey from queue first, fallback to socketId only
    const queueEntry = this.matchmaker.getQueueEntryBySocketId(socket.id);
    this.matchmaker.leaveQueue(socket.id, queueEntry?.publicKey);
  }

  /**
   * Handle play card request
   */
  private handlePlayCard(socket: Socket, payload: PlayCardPayload): void {
    // Find room this socket is in
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    if (rooms.length === 0) return;

    const roomId = rooms[0];
    const room = this.matchmaker.getRoom(roomId);
    if (!room) return;

    // Find the player's actual ID (publicKey for humans) from the socket
    const playerId = this.getPlayerIdFromSocket(room, socket);
    if (!playerId) {
      socket.emit('game_error', {
        message: 'Player not found in room'
      });
      return;
    }

    // CRITICAL: Server-side validation - prevent double-plays
    const roomData = room.gameMachine.getRoom();
    if (roomData.state !== 'playing') {
      socket.emit('game_error', {
        message: 'Cannot play card - game is not in playing state'
      });
      return;
    }

    // Verify it's this player's turn
    const currentPlayer = roomData.players[roomData.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      socket.emit('game_error', {
        message: 'Cannot play card - not your turn'
      });
      return;
    }

    // CRITICAL: Prevent playing when trick is complete (waiting for clear)
    // During the 3-second delay after trick completion, no cards should be playable
    if (roomData.currentTrick.cards.length >= 4) {
      socket.emit('game_error', {
        message: 'Trick is complete, waiting for next trick'
      });
      return;
    }

    try {
      room.gameMachine.playCard(playerId, payload.cardId);

      // Broadcast card played
      this.io.to(roomId).emit(ServerEvent.CARD_PLAYED, {
        playerId: playerId,
        cardId: payload.cardId
      });

      // Send updated game state
      this.broadcastGameState(roomId, room);

      // Check if trick is complete (4 cards played)
      const roomData = room.gameMachine.getRoom();
      const trickComplete = roomData.currentTrick.cards.length >= 4;

      if (trickComplete) {
        // Wait longer before clearing trick and starting next trick
        console.log('[PlayCard] Trick complete, waiting before next trick...');
        setTimeout(() => {
          // Clear the trick and then check game state
          room.gameMachine.clearTrick();
          this.broadcastGameState(roomId, room);

          // Check if round/game is complete
          this.checkRoundComplete(roomId, room);
        }, 3000); // 3 second delay to see the last card
      } else {
        // Handle bot turns with normal pacing
        this.handleBotTurns(roomId, room);
      }

    } catch (error) {
      socket.emit('game_error', {
        message: error instanceof Error ? error.message : 'Failed to play card'
      });
    }
  }

  /**
   * Check if round or game is complete and send appropriate events
   */
  private checkRoundComplete(roomId: string, room: any): void {
    const roomData = room.gameMachine.getRoom();

    if (roomData.state === 'finished') {
      // Game is completely over - send GAME_COMPLETE
      console.log('[checkRoundComplete] Game COMPLETE! Sending game_complete event');
      const winnerId = roomData.winner;
      const winner = roomData.players.find((p: any) => p.id === winnerId);

      this.io.to(roomId).emit(ServerEvent.GAME_COMPLETE, {
        winner: winnerId,
        winnerName: winner?.name || 'Unknown',
        players: roomData.players.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          score: p.score,           // Current round score
          totalScore: p.totalScore, // Cumulative score
          roundScores: p.roundScores,
          tricksWon: p.tricksWon
        })),
        roundHistory: roomData.roundHistory,
        totalRounds: roomData.totalRounds,
        roundsPlayed: roomData.currentRound
      });
    } else if (roomData.state === 'scoring') {
      // Round is complete but game continues - send ROUND_COMPLETE
      console.log('[checkRoundComplete] Round complete! Sending round_complete event');
      const roundWinner = this.getRoundWinner(roomData);

      this.io.to(roomId).emit(ServerEvent.ROUND_COMPLETE, {
        roundNumber: roomData.currentRound,
        totalRounds: roomData.totalRounds,
        roundWinner, // Player who won most tricks this round
        players: roomData.players.map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          score: p.score,           // Current round score
          totalScore: p.totalScore, // Cumulative score
          roundScores: p.roundScores,
          tricksWon: p.tricksWon
        }))
      });
    } else {
      // Game continues - handle bot turns
      this.handleBotTurns(roomId, room);
    }
  }

  /**
   * Get the player who won the most tricks this round
   */
  private getRoundWinner(roomData: any): string | null {
    if (!roomData.players || roomData.players.length === 0) return null;
    const winner = roomData.players.reduce((prev: any, current: any) => {
      return (prev.tricksWon > current.tricksWon) ? prev : current;
    });
    return winner.id;
  }

  /**
   * Handle bid trump request
   */
  private handleBidTrump(socket: Socket, payload: BidTrumpPayload): void {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    if (rooms.length === 0) return;

    const roomId = rooms[0];
    const room = this.matchmaker.getRoom(roomId);
    if (!room) return;

    // Find the player's actual ID (publicKey for humans) from the socket
    const playerId = this.getPlayerIdFromSocket(room, socket);
    if (!playerId) {
      socket.emit(ServerEvent.ERROR, {
        message: 'Player not found in room'
      });
      return;
    }

    try {
      if (payload.amount === 0) {
        // Pass
        room.gameMachine.passBid(playerId);
      } else {
        // Bid
        room.gameMachine.submitBid(playerId, payload.suit, payload.amount);
      }

      // Send updated game state
      this.broadcastGameState(roomId, room);

      // Check if bidding is complete
      const roomData = room.gameMachine.getRoom();
      const allPlayersHadChance = roomData.bids.length >= roomData.players.length;
      const hasRealBid = roomData.bids.some((b: any) => b.amount > 0);
      const currentPlayerIsHuman = roomData.players[roomData.currentPlayerIndex]?.type === 'human';

      // Start playing if all had chance and at least one real bid
      if (allPlayersHadChance && hasRealBid) {
        room.gameMachine.startPlaying();
        this.broadcastGameState(roomId, room);
        // Start bot turns if first player is bot
        this.handleBotTurns(roomId, room);
      } else if (currentPlayerIsHuman) {
        // Human's turn to bid - wait for input
        console.log('[BidTrump] Waiting for human to bid');
      } else {
        // Continue bot bidding
        this.handleBotBidding(roomId, room);
      }

    } catch (error) {
      socket.emit(ServerEvent.ERROR, {
        message: error instanceof Error ? error.message : 'Failed to submit bid'
      });
    }
  }

  /**
   * Handle player ready
   */
  private handlePlayerReady(socket: Socket): void {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    if (rooms.length === 0) return;

    const roomId = rooms[0];
    this.broadcastGameState(roomId, this.matchmaker.getRoom(roomId)!);
  }

  /**
   * Handle request to start next round
   */
  private handleRequestNextRound(socket: Socket): void {
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    if (rooms.length === 0) return;

    const roomId = rooms[0];
    const room = this.matchmaker.getRoom(roomId);
    if (!room) return;

    try {
      if (!room.gameMachine.canStartNextRound()) {
        socket.emit(ServerEvent.ERROR, {
          message: 'Cannot start next round - game not ready'
        });
        return;
      }

      // Start next round
      room.gameMachine.startNextRound();

      // Get updated room data
      const roomData = room.gameMachine.getRoom();

      // Send next round starting notification
      this.io.to(roomId).emit(ServerEvent.NEXT_ROUND_STARTING, {
        roundNumber: roomData.currentRound,
        totalRounds: roomData.totalRounds
      });

      // Broadcast updated game state
      this.broadcastGameState(roomId, room);

      // Start bot bidding (both game modes have bidding)
      this.handleBotBidding(roomId, room);

    } catch (error) {
      socket.emit(ServerEvent.ERROR, {
        message: error instanceof Error ? error.message : 'Failed to start next round'
      });
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(socket: Socket): void {
    console.log(`Client disconnected: ${socket.id}`);

    // Remove from queue - try to find publicKey first
    const queueEntry = this.matchmaker.getQueueEntryBySocketId(socket.id);
    this.matchmaker.leaveQueue(socket.id, queueEntry?.publicKey);

    // Find and remove from room
    const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    for (const roomId of rooms) {
      this.matchmaker.removePlayerFromRoom(roomId, socket.id);
    }
  }

  /**
   * Start a game
   */
  private startGame(roomId: string): void {
    const room = this.matchmaker.getRoom(roomId);
    if (!room) return;

    room.gameMachine.startGame();
    this.broadcastGameState(roomId, room);

    // Start bot bidding (both game modes have bidding)
    this.handleBotBidding(roomId, room);
  }

  /**
   * Handle bot bidding
   */
  private handleBotBidding(roomId: string, room: any): void {
    const roomData = room.gameMachine.getRoom();
    const currentPlayer = roomData.players[roomData.currentPlayerIndex];

    if (currentPlayer.type === 'bot') {
      setTimeout(() => {
        const bot = room.botManager.getBot(currentPlayer.id);
        if (bot) {
          const bid = bot.makeBid(currentPlayer, this.getCurrentHighestBid(roomData), [
            'spades', 'hearts', 'diamonds', 'clubs'
          ] as any, roomData.gameMode);

          if (bid) {
            console.log('[BotBidding]', currentPlayer.name, 'bids', bid.amount, bid.suit);
            room.gameMachine.submitBid(currentPlayer.id, bid.suit as any, bid.amount);
          } else {
            console.log('[BotBidding]', currentPlayer.name, 'passes');
            room.gameMachine.passBid(currentPlayer.id);
          }

          this.broadcastGameState(roomId, room);

          // Check if bidding is complete
          const newRoomData = room.gameMachine.getRoom();
          const allPlayersHadChance = newRoomData.bids.length >= newRoomData.players.length;
          const hasRealBid = newRoomData.bids.some((b: any) => b.amount > 0);
          const currentPlayerIsHuman = newRoomData.players[newRoomData.currentPlayerIndex]?.type === 'human';

          // Check if everyone passed (all bids are 0)
          const everyonePassed = newRoomData.bids.every((b: any) => b.amount === 0);

          // Everyone passed - redeal
          if (everyonePassed) {
            console.log('[BotBidding] Everyone passed, redealing...');
            this.io.to(roomId).emit(ServerEvent.ERROR, {
              message: 'Herkes pas geçti. Kartlar yeniden dağıtılıyor...'
            });
            // Trigger redeal
            setTimeout(() => {
              this.startGame(roomId);
            }, 2000);
            return;
          }

          // Start playing if all had chance and at least one real bid
          if (allPlayersHadChance && hasRealBid) {
            room.gameMachine.startPlaying();
            this.broadcastGameState(roomId, room);
            // Start bot turns if first player is bot
            this.handleBotTurns(roomId, room);
          } else if (currentPlayerIsHuman) {
            // Human's turn - wait for human input
            console.log('[BotBidding] Waiting for human player to bid');
          } else {
            // Continue bot bidding
            this.handleBotBidding(roomId, room);
          }
        }
      }, 3000); // Delay to give human player time to select suit and bid amount
    }
  }

  /**
   * Handle bot turns
   */
  private handleBotTurns(roomId: string, room: any): void {
    const roomData = room.gameMachine.getRoom();

    // Check if game is still in playing state
    if (roomData.state !== 'playing') return;

    // Check if current player index is valid
    if (!roomData.players || roomData.currentPlayerIndex >= roomData.players.length) return;

    const currentPlayer = roomData.players[roomData.currentPlayerIndex];

    // Check if current player exists
    if (!currentPlayer) return;

    // Only proceed if it's a bot
    if (currentPlayer.type !== 'bot') return;

    setTimeout(() => {
      // Re-check room state (game might have ended)
      const latestRoomData = room.gameMachine.getRoom();
      if (latestRoomData.state !== 'playing') return;

      const bot = room.botManager.getBot(currentPlayer.id);
      if (bot) {
        try {
          const cardToPlay = bot.playCard(
            currentPlayer,
            latestRoomData.currentTrick.leadSuit,
            latestRoomData.trumpSuit,
            latestRoomData.currentTrick.cards.map((c: any) => c.card)
          );

          room.gameMachine.playCard(currentPlayer.id, cardToPlay.id);

          this.io.to(roomId).emit(ServerEvent.CARD_PLAYED, {
            playerId: currentPlayer.id,
            cardId: cardToPlay.id
          });

          this.broadcastGameState(roomId, room);

          // Check if trick is complete (4 cards played)
          const afterPlayRoomData = room.gameMachine.getRoom();
          const trickComplete = afterPlayRoomData.currentTrick.cards.length >= 4;

          if (trickComplete) {
            // Wait longer before clearing trick and starting next trick
            console.log('[BotTurn] Trick complete, waiting before next trick...');
            setTimeout(() => {
              // Clear the trick and then check game state
              room.gameMachine.clearTrick();
              this.broadcastGameState(roomId, room);

              // Check if round/game is complete
              this.checkRoundComplete(roomId, room);
            }, 3000); // 3 second delay to see the last card
          } else {
            // Continue bot turns with normal pacing
            this.handleBotTurns(roomId, room);
          }
        } catch (error) {
          console.error('[BotTurn] Error:', error);
        }
      }
    }, 2000); // Delay for realistic pacing - gives human time to see bot plays
  }

  /**
   * Get current highest bid
   */
  private getCurrentHighestBid(roomData: any): number {
    if (roomData.bids.length === 0) return 0;
    return Math.max(...roomData.bids.map((b: any) => b.amount));
  }

  /**
   * Get player ID (publicKey for humans) from socket
   * Iterates through room.players Map to find the key (publicKey) that maps to this socket
   */
  private getPlayerIdFromSocket(room: any, socket: Socket): string | null {
    for (const [playerId, roomSocket] of room.players) {
      if (roomSocket.id === socket.id) {
        return playerId;
      }
    }
    return null;
  }

  /**
   * Broadcast game state to all players in room
   * Iterates over actual players from gameMachine using their player ID (publicKey for humans)
   */
  private broadcastGameState(roomId: string, room: any): void {
    const roomData = room.gameMachine.getRoom();

    console.log('[broadcastGameState] Room data players (first 20 chars of id):', roomData.players.map((p: any) => ({ id: p.id.slice(0, 20), name: p.name, type: p.type })));
    console.log('[broadcastGameState] Room.players Map keys (first 20 chars):', Array.from(room.players.keys()).map(k => k.slice(0, 20)));

    // Send customized state to each player using their actual player ID (publicKey for humans)
    for (const player of roomData.players) {
      // Find the socket for this player
      // For human players: key is publicKey (matches player.id)
      // For bot players: no socket needed, they don't receive events
      const socket = room.players.get(player.id);
      console.log('[broadcastGameState] Player:', player.name, 'id (first 20):', player.id.slice(0, 20), 'socket found:', !!socket);
      if (socket) {
        const state = room.gameMachine.getStateForClient(player.id);
        console.log('[broadcastGameState] Emitting to', player.name, 'playerIndex in state:', state.players.findIndex((p: any) => p.id === player.id));
        socket.emit(ServerEvent.GAME_STATE_UPDATE, state);
      }
    }
  }

  /**
   * Get IO instance
   */
  getIO(): SocketIOServer {
    return this.io;
  }

  /**
   * Get matchmaker
   */
  getMatchmaker(): Matchmaker {
    return this.matchmaker;
  }
}
