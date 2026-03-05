/**
 * WebSocket sunucusu.
 * Client-server arası tüm oyun iletişimini yönetir: kuyruk, ihale, kart oynama, tur geçişleri.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Matchmaker } from '../matchmaker/Matchmaker.js';
import { ClientEvent, ServerEvent, JoinQueuePayload, PlayCardPayload, BidTrumpPayload } from '../types/socket.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { CNFTMinter } from '../solana/CNFTMinter.js';
import { AuthService } from '../auth/AuthService.js';
import { setupRedisAdapter, getRedisConfig } from './RedisAdapter.js';

export class SocketServer {
  private io: SocketIOServer;
  private matchmaker: Matchmaker;
  private db: DatabaseManager | null;
  private cnftMinter: CNFTMinter | null;
  private authService: AuthService | null;

  constructor(httpServer: HTTPServer, db?: DatabaseManager | null, cnftMinter?: CNFTMinter | null, authService?: AuthService | null) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.matchmaker = new Matchmaker();
    this.db = db || null;
    this.cnftMinter = cnftMinter || null;
    this.authService = authService || null;

    // Setup Redis adapter if configured
    const redisConfig = getRedisConfig();
    setupRedisAdapter(this.io, redisConfig).then(() => {
      this.setupEventHandlers();
    });
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

      // Handle leave game (player wants to abandon current game)
      socket.on('leave_game', (payload: { publicKey: string }) => {
        this.handleLeaveGame(socket, payload);
      });

      // Handle disconnect
      socket.on(ClientEvent.DISCONNECT, () => {
        this.handleDisconnect(socket);
      });

      // Handle rejoin game (reconnect)
      socket.on(ClientEvent.REJOIN_GAME, (payload: { publicKey: string }) => {
        this.handleRejoinGame(socket, payload);
      });

      // Handle create_private_room
      socket.on('create_private_room', (payload: { publicKey: string; username?: string; botDifficulty?: string; gameMode?: string }, callback: (data: any) => void) => {
        const code = this.matchmaker.createPrivateRoom({
          hostPk: payload.publicKey,
          hostSocket: socket,
          username: payload.username,
          botDifficulty: (payload.botDifficulty as any) || 'normal',
          gameMode: (payload.gameMode as any) || 'koz_maca'
        });
        const room = this.matchmaker.getPrivateRoom(code);
        callback({
          code,
          players: room?.players.map(p => ({ publicKey: p.publicKey, username: p.username })) || []
        });
      });

      // Handle join_private_room
      socket.on('join_private_room', (payload: { code: string; publicKey: string; username?: string }, callback: (data: any) => void) => {
        const room = this.matchmaker.joinPrivateRoom(payload.code, {
          publicKey: payload.publicKey,
          socket,
          username: payload.username
        });
        if (!room) {
          return callback({ error: 'Oda bulunamadi veya dolu' });
        }
        callback({
          code: room.code,
          players: room.players.map(p => ({ publicKey: p.publicKey, username: p.username })),
          hostPk: room.hostPk
        });
        // Broadcast update to all room members
        for (const p of room.players) {
          p.socket.emit(ServerEvent.PRIVATE_ROOM_UPDATE, {
            code: room.code,
            players: room.players.map(pl => ({ publicKey: pl.publicKey, username: pl.username })),
            hostPk: room.hostPk
          });
        }
      });

      // Handle start_private_room
      socket.on('start_private_room', (payload: { code: string; publicKey: string }) => {
        const result = this.matchmaker.startPrivateRoom(payload.code, payload.publicKey);
        if (!result) {
          socket.emit(ServerEvent.ERROR, { message: 'Oda baslatilamadi' });
          return;
        }
        const { roomId, room } = result;
        // Send match_found to all human players
        for (const [pk, playerSocket] of room.players) {
          const clientState = room.gameMachine.getStateForClient(pk);
          playerSocket.emit(ServerEvent.MATCH_FOUND, { roomId, gameState: clientState });
        }
        // Start bot bidding
        this.handleBotBidding(roomId, room);
      });

      // Handle leave_private_room
      socket.on('leave_private_room', (payload: { code: string; publicKey: string }) => {
        const privateRoom = this.matchmaker.getPrivateRoom(payload.code);
        const { closed } = this.matchmaker.leavePrivateRoom(payload.code, payload.publicKey);
        if (closed && privateRoom) {
          // Notify remaining players
          for (const p of privateRoom.players) {
            if (p.publicKey !== payload.publicKey) {
              p.socket.emit(ServerEvent.PRIVATE_ROOM_CLOSED, { code: payload.code });
            }
          }
        } else if (privateRoom) {
          // Broadcast updated player list
          const updatedRoom = this.matchmaker.getPrivateRoom(payload.code);
          if (updatedRoom) {
            for (const p of updatedRoom.players) {
              p.socket.emit(ServerEvent.PRIVATE_ROOM_UPDATE, {
                code: updatedRoom.code,
                players: updatedRoom.players.map(pl => ({ publicKey: pl.publicKey, username: pl.username })),
                hostPk: updatedRoom.hostPk
              });
            }
          }
        }
      });

      // Handle set_username
      socket.on('set_username', (payload: { publicKey: string; username: string }, callback: (data: any) => void) => {
        if (!this.db) return callback({ error: 'Database not available' });
        const { publicKey: pk, username } = payload;
        if (!pk || !username) return callback({ error: 'Missing fields' });
        // Validate: 3-20 chars, alphanumeric + underscore
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          return callback({ error: '3-20 karakter, harf/rakam/alt çizgi kullanın' });
        }
        if (this.db.usernameExists(username, pk)) {
          return callback({ error: 'Bu kullanıcı adı zaten alınmış' });
        }
        this.db.updateUsername(pk, username);
        callback({ success: true, username });
      });

      // Handle get_username
      socket.on('get_username', (payload: { publicKey: string }, callback: (data: any) => void) => {
        if (!this.db) return callback({ username: null });
        const player = this.db.getPlayer(payload.publicKey);
        callback({ username: player?.username || null });
      });

      // API: Get leaderboard
      socket.on('get_leaderboard', (options: { limit?: number }, callback: (data: any) => void) => {
        if (!this.db) return callback({ error: 'Database not available' });
        try {
          const leaderboard = this.db.getLeaderboard(options?.limit || 100);
          callback({ leaderboard });
        } catch (error) {
          callback({ error: 'Failed to fetch leaderboard' });
        }
      });

      // API: Get player stats
      socket.on('get_player_stats', (payload: { publicKey: string }, callback: (data: any) => void) => {
        if (!this.db) return callback({ error: 'Database not available' });
        try {
          const player = this.db.getPlayer(payload.publicKey);
          const nfts = this.db.getPlayerNfts(payload.publicKey);
          callback({ player, nfts });
        } catch (error) {
          callback({ error: 'Failed to fetch player stats' });
        }
      });

      // API: Get player games
      socket.on('get_player_games', (payload: { publicKey: string; limit?: number }, callback: (data: any) => void) => {
        if (!this.db) return callback({ error: 'Database not available' });
        try {
          const games = this.db.getPlayerGames(payload.publicKey, payload.limit || 20);
          callback({ games });
        } catch (error) {
          callback({ error: 'Failed to fetch player games' });
        }
      });

      // API: Claim NFT reward — called after client signs the claim tx via MWA
      socket.on(ClientEvent.CLAIM_REWARD, async (payload: { tournamentId: string; publicKey: string; claimSignature?: string }, callback: (data: any) => void) => {
        const { tournamentId, publicKey: pk, claimSignature } = payload;
        console.log(`[Tournament] Claim reward request from ${pk?.slice(0, 8)} for tournament ${tournamentId}`);

        if (!this.cnftMinter) {
          // cNFT minting not configured — record pending reward and notify
          if (this.db) {
            try {
              this.db.recordNftReward({
                playerPk: pk,
                tournamentId: 1,
                gameId: tournamentId,
                tier: 3,
                metadataUri: '',
                mintAddress: null,
                signature: claimSignature || undefined,
                onChainMinted: false,
              });
            } catch (_e) { /* ignore duplicate */ }
          }
          if (callback) callback({ success: true, mintAddress: null, message: 'Reward recorded, minting pending' });
          socket.emit(ServerEvent.REWARD_MINTED, { tournamentId, mintAddress: 'pending', tier: 'gold' });
          return;
        }

        try {
          const result = await this.cnftMinter.mintTournamentReward(tournamentId, pk, 'gold');

          if (this.db) {
            this.db.recordNftReward({
              playerPk: pk,
              tournamentId: 1,
              gameId: tournamentId,
              tier: 3,
              metadataUri: result.metadataUri,
              mintAddress: result.assetId !== 'pending' ? result.assetId : null,
              signature: result.signature,
              onChainMinted: true,
            });
          }

          socket.emit(ServerEvent.REWARD_MINTED, {
            tournamentId,
            mintAddress: result.assetId,
            signature: result.signature,
            metadataUri: result.metadataUri,
            tier: 'gold',
          });

          if (callback) callback({ success: true, mintAddress: result.assetId, signature: result.signature });
        } catch (error) {
          console.error('[Tournament] Mint failed:', error);
          if (callback) callback({ error: 'Minting failed: ' + (error as Error).message });
        }
      });

      // SKR Tournament: create a room with SKR stake
      socket.on('create_skr_room', (payload: {
        publicKey: string;
        username?: string;
        botDifficulty?: string;
        gameMode?: string;
        skrStake: number;
        claimSignature: string; // MWA-signed transaction as proof of stake approval
      }, callback: (data: any) => void) => {
        if (!payload.publicKey || !payload.claimSignature) {
          return callback({ error: 'Wallet signature required to create SKR room' });
        }

        const code = this.matchmaker.createPrivateRoom({
          hostPk: payload.publicKey,
          hostSocket: socket,
          username: payload.username,
          botDifficulty: (payload.botDifficulty as any) || 'normal',
          gameMode: (payload.gameMode as any) || 'koz_maca',
          skrStake: payload.skrStake,
        });

        const room = this.matchmaker.getPrivateRoom(code);
        console.log(`[SKR] Room created by ${payload.publicKey.slice(0, 8)} with ${payload.skrStake} SKR stake`);

        callback({
          code,
          skrStake: payload.skrStake,
          players: room?.players.map(p => ({ publicKey: p.publicKey, username: p.username })) || [],
        });
      });

      // =====================================================
      // AUTH HANDLERS
      // =====================================================

      // Auth: Register with email
      socket.on(ClientEvent.AUTH_REGISTER, async (payload: { email: string; password: string }, callback: (data: any) => void) => {
        if (!this.authService) return callback({ error: 'Auth not available' });
        const result = await this.authService.register(payload.email, payload.password);
        if (result.success) {
          socket.data.playerId = result.playerId;
          socket.data.authType = 'email';
        }
        callback(result);
      });

      // Auth: Login with email
      socket.on(ClientEvent.AUTH_LOGIN, async (payload: { email: string; password: string }, callback: (data: any) => void) => {
        if (!this.authService) return callback({ error: 'Auth not available' });
        const result = await this.authService.login(payload.email, payload.password);
        if (result.success) {
          socket.data.playerId = result.playerId;
          socket.data.authType = 'email';
        }
        callback(result);
      });

      // Auth: Validate existing token (auto-login on page refresh)
      socket.on(ClientEvent.AUTH_VALIDATE, (payload: { token: string }, callback: (data: any) => void) => {
        if (!this.authService) return callback({ success: false, error: 'Auth not available' });
        const decoded = this.authService.verifyToken(payload.token);
        if (!decoded) return callback({ success: false, error: 'Token gecersiz' });

        socket.data.playerId = decoded.playerId;
        socket.data.authType = decoded.authType;

        // Get username from DB
        const player = this.db?.getPlayer(decoded.playerId);
        callback({
          success: true,
          playerId: decoded.playerId,
          authType: decoded.authType,
          username: player?.username || null,
        });
      });

      // Auth: Generate token for wallet user
      socket.on(ClientEvent.AUTH_WALLET, (payload: { publicKey: string }, callback: (data: any) => void) => {
        if (!this.authService) return callback({ error: 'Auth not available' });
        const result = this.authService.generateWalletToken(payload.publicKey);
        if (result.success) {
          socket.data.playerId = result.playerId;
          socket.data.authType = 'wallet';
        }
        callback(result);
      });
    });
  }

  /**
   * Handle join queue request
   */
  private handleJoinQueue(socket: Socket, payload: JoinQueuePayload): void {
    console.log(`[Matchmaker] Player ${socket.id} joining queue`);
    console.log('[Matchmaker] Payload:', payload);

    // Check if player is already in an active game (reconnection scenario)
    if (payload.publicKey) {
      const existingRoom = this.matchmaker.getRoomByPlayerId(payload.publicKey);
      console.log(`[Debug] Player ${payload.publicKey.slice(0, 8)} check - existing room:`, existingRoom ? existingRoom.roomId : 'NONE');
      if (existingRoom) {
        const roomData = existingRoom.room.gameMachine.getRoom();
        if (roomData.state !== 'finished') {
          console.log(`[Reconnect] Player ${payload.publicKey.slice(0, 8)} already in active game, rejoining`);
          this.handleRejoinGame(socket, { publicKey: payload.publicKey });
          return;
        }
      }
    }

    // Look up username from DB or use payload
    let username = payload.username;
    if (!username && this.db && payload.publicKey) {
      const player = this.db.getPlayer(payload.publicKey);
      username = player?.username || undefined;
    }

    const roomId = this.matchmaker.joinQueue({
      socketId: socket.id,
      socket,  // Pass socket reference for emitting queue_status
      publicKey: payload.publicKey,
      username,
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
   * Handle leave game request (player abandoning current game)
   */
  private handleLeaveGame(socket: Socket, payload: { publicKey: string }): void {
    console.log(`[LeaveGame] Player ${payload.publicKey.slice(0, 8)} leaving game`);

    // Find the room the player is in
    const roomInfo = this.matchmaker.getRoomByPlayerId(payload.publicKey);
    if (!roomInfo) {
      console.log(`[LeaveGame] Player not in any room`);
      return;
    }

    const { roomId } = roomInfo;

    // Remove player from room
    this.matchmaker.removePlayerFromRoomByPublicKey(roomId, payload.publicKey);

    // Leave the socket.io room
    socket.leave(roomId);

    console.log(`[LeaveGame] Player ${payload.publicKey.slice(0, 8)} removed from room ${roomId}`);
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
        gameMode: roomData.gameMode,
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

      // Save to database and mint cNFT
      this.handleGameCompletion(roomId, room);
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

  // Track disconnect grace periods (publicKey -> timeout)
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Handle disconnect with grace period for reconnection
   */
  private handleDisconnect(socket: Socket): void {
    console.log(`Client disconnected: ${socket.id}`);

    // Remove from queue - try to find publicKey first
    const queueEntry = this.matchmaker.getQueueEntryBySocketId(socket.id);
    this.matchmaker.leaveQueue(socket.id, queueEntry?.publicKey);

    // Find player's room and publicKey
    const roomInfo = this.matchmaker.findRoomBySocketId(socket.id);
    if (!roomInfo) return;

    const { roomId, publicKey } = roomInfo;
    const room = this.matchmaker.getRoom(roomId);
    if (!room) return;

    const roomData = room.gameMachine.getRoom();
    const isGameActive = roomData.state !== 'finished' && roomData.state !== 'lobby';

    // Check if this is a bot game (all other players are bots)
    const players = roomData.players || [];
    const humanPlayers = players.filter((p: any) => p.type === 'human');
    const isBotGame = humanPlayers.length === 1;

    // For bot games, remove player immediately (no grace period)
    // For PvP games, use grace period
    if (isGameActive && publicKey && !isBotGame) {
      // Game in progress: wait 30 seconds, then replace with bot
      console.log(`[Reconnect] Player ${publicKey.slice(0, 8)} disconnected during active game. Grace period: 30s`);

      const timer = setTimeout(() => {
        console.log(`[Reconnect] Grace period expired for ${publicKey.slice(0, 8)}, replacing with bot`);
        this.disconnectTimers.delete(publicKey);
        // Replace with bot instead of removing
        const currentRoom = this.matchmaker.getRoom(roomId);
        if (currentRoom) {
          const currentRoomData = currentRoom.gameMachine.getRoom();
          if (currentRoomData.state !== 'finished') {
            this.replaceDisconnectedPlayerWithBot(roomId, publicKey, currentRoom);
          } else {
            this.matchmaker.removePlayerFromRoomByPublicKey(roomId, publicKey);
          }
        }
      }, 30000);

      this.disconnectTimers.set(publicKey, timer);
    } else {
      // No active game OR bot game: remove immediately
      if (isBotGame) {
        console.log(`[Disconnect] Bot game, removing player ${publicKey.slice(0, 8)} immediately`);
      }
      this.matchmaker.removePlayerFromRoomByPublicKey(roomId, publicKey);
    }
  }

  /**
   * Handle rejoin game (reconnect after disconnect)
   */
  private handleRejoinGame(socket: Socket, payload: { publicKey: string }): void {
    const { publicKey } = payload;
    if (!publicKey) return;

    // Check for active room with this player
    const roomInfo = this.matchmaker.getRoomByPlayerId(publicKey);
    if (!roomInfo) {
      socket.emit(ServerEvent.ERROR, { message: 'No active game found' });
      return;
    }

    const { roomId, room } = roomInfo;
    const roomData = room.gameMachine.getRoom();

    if (roomData.state === 'finished') {
      socket.emit(ServerEvent.ERROR, { message: 'Game already finished' });
      return;
    }

    // Clear grace period timer
    const timer = this.disconnectTimers.get(publicKey);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(publicKey);
    }

    // Replace old socket with new socket
    room.players.set(publicKey, socket);
    socket.join(roomId);

    console.log(`[Reconnect] Player ${publicKey.slice(0, 8)} rejoined room ${roomId}`);

    // Send current game state
    const clientState = room.gameMachine.getStateForClient(publicKey);
    socket.emit(ServerEvent.GAME_REJOINED, {
      roomId,
      gameState: clientState
    });
  }

  /**
   * Handle game completion - save stats to DB and mint cNFT
   */
  private async handleGameCompletion(roomId: string, room: any): Promise<void> {
    if (!this.db) return;

    const roomData = room.gameMachine.getRoom();
    const winnerId = roomData.winner;

    try {
      // Save game record
      const finalScores = roomData.players.map((p: any) => p.totalScore);
      const playerIds = roomData.players.map((p: any) => p.id);
      this.db.completeGame(
        roomId,
        winnerId || '',
        finalScores,
        roomData.roundHistory || [],
        roomData.gameMode,
        roomData.totalRounds,
        playerIds
      );

      // Update stats for each human player
      for (const player of roomData.players) {
        if (player.type !== 'human') continue;

        // Get or create player in DB
        this.db.getOrCreatePlayer(player.id, player.name);

        // Find this player's bid in the last round
        const lastBids = roomData.bids || [];
        const playerBid = lastBids.find((b: any) => b.playerId === player.id);
        const bidAmount = playerBid?.amount || 0;

        this.db.updatePlayerStats(
          player.id,
          player.tricksWon,
          bidAmount,
          player.totalScore,
          player.id === winnerId
        );
      }

      // Mint cNFT for winner (if configured and winner is human)
      const winner = roomData.players.find((p: any) => p.id === winnerId);
      if (this.cnftMinter && winner && winner.type === 'human') {
        try {
          const result = await this.cnftMinter.mintTournamentReward(roomId, winnerId, 'gold');
          console.log(`[cNFT] Minted reward for winner ${winnerId.slice(0, 8)}: ${result.signature}`);

          // Record in DB with actual metadata URI and mint address
          this.db.recordNftReward({
            playerPk: winnerId,
            tournamentId: 1,
            gameId: roomId,
            tier: 3, // Gold
            metadataUri: result.metadataUri,
            mintAddress: result.assetId !== 'pending' ? result.assetId : null,
            signature: result.signature,
            onChainMinted: true
          });

          // Notify winner
          const winnerSocket = room.players.get(winnerId);
          if (winnerSocket) {
            winnerSocket.emit(ServerEvent.REWARD_MINTED, {
              signature: result.signature,
              assetId: result.assetId,
              metadataUri: result.metadataUri,
              tier: 'gold'
            });
          }
        } catch (error) {
          console.error('[cNFT] Failed to mint reward, continuing without it:', error);
        }
      }
    } catch (error) {
      console.error('[Database] Error handling game completion:', error);
    }
  }

  /**
   * Handle bot bidding
   */
  private handleBotBidding(roomId: string, room: any): void {
    const roomData = room.gameMachine.getRoom();
    const currentPlayer = roomData.players[roomData.currentPlayerIndex];

    if (currentPlayer.type === 'bot') {
      setTimeout(() => {
        // Check if room still exists (player might have left)
        const currentRoom = this.matchmaker.getRoom(roomId);
        if (!currentRoom) {
          console.log('[BotBidding] Room', roomId, 'no longer exists, skipping bot bid');
          return;
        }

        // Check if players array is valid
        const currentRoomData = currentRoom.gameMachine.getRoom();
        if (!currentRoomData.players || currentRoomData.players.length === 0) {
          console.log('[BotBidding] Room', roomId, 'has no players, skipping bot bid');
          return;
        }

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

          // Check if everyone passed (all bids are 0) - requires allPlayersHadChance to
          // avoid false positive on empty array ([].every() = true in JS) or partial bids.
          // Note: GameStateMachine.passBid() already calls redeal() internally when all 4
          // players pass, resetting bids to []. So this block is a safety net only.
          const everyonePassed = allPlayersHadChance && newRoomData.bids.every((b: any) => b.amount === 0);

          // Everyone passed - GameStateMachine already handled the redeal internally
          if (everyonePassed) {
            console.log('[BotBidding] Everyone passed, redeal already handled by GameStateMachine');
            this.io.to(roomId).emit('info', {
              message: 'Herkes pas geçti. Kartlar yeniden dağıtılıyor...'
            });
            this.broadcastGameState(roomId, room);
            // Continue bot bidding with new hand
            this.handleBotBidding(roomId, room);
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
   * Replace a disconnected player with a bot
   */
  private replaceDisconnectedPlayerWithBot(roomId: string, publicKey: string, room: any): void {
    const roomData = room.gameMachine.getRoom();
    const playerIndex = roomData.players.findIndex((p: any) => p.id === publicKey);
    if (playerIndex === -1) return;

    // Create a bot for this player index
    const bot = room.botManager.createBot(playerIndex, 'normal');
    const botId = bot.getId();
    const botName = bot.getName();

    // Replace in game state
    const replaced = room.gameMachine.replacePlayerWithBot(publicKey, botId, botName);
    if (!replaced) return;

    // Remove old socket from room.players
    room.players.delete(publicKey);

    console.log(`[Disconnect→Bot] Player ${publicKey.slice(0, 8)} replaced with bot ${botName} in room ${roomId}`);

    // Broadcast updated state + notify
    this.broadcastGameState(roomId, room);
    this.io.to(roomId).emit(ServerEvent.PLAYER_REPLACED, {
      oldPlayerId: publicKey,
      newPlayerId: botId,
      newPlayerName: botName
    });

    // If it's now the bot's turn, trigger bot action
    const updatedRoom = room.gameMachine.getRoom();
    const currentPlayer = updatedRoom.players[updatedRoom.currentPlayerIndex];
    if (currentPlayer && currentPlayer.id === botId) {
      if (updatedRoom.state === 'bidding') {
        this.handleBotBidding(roomId, room);
      } else if (updatedRoom.state === 'playing') {
        this.handleBotTurns(roomId, room);
      }
    }
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
  private broadcastGameState(_roomId: string, room: any): void {
    const roomData = room.gameMachine.getRoom();

    console.log('[broadcastGameState] Room data players (first 20 chars of id):', roomData.players.map((p: any) => ({ id: p.id.slice(0, 20), name: p.name, type: p.type })));
    console.log('[broadcastGameState] Room.players Map keys (first 20 chars):', Array.from(room.players.keys() as Iterable<string>).map((k: string) => k.slice(0, 20)));

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
