/**
 * Oyuncu eşleştirme sistemi.
 * Gerçek oyuncuları eşleştirir, bulunamazsa bot ile doldurur.
 */

import { Socket } from 'socket.io';
import { PlayerType, GameState, Suit } from '../types/game.js';
import { GameStateMachine } from '../game/GameStateMachine.js';
import { BatakBot, BotManager } from '../bots/BatakBot.js';
import { BotManager as BotManagerClass } from '../bots/BatakBot.js';

interface QueueEntry {
  socketId: string;
  socket: Socket;  // Store socket reference to emit events
  publicKey: string;
  botDifficulty: 'easy' | 'normal' | 'hard';
  botCount: number;
  gameMode: 'koz_maca' | 'ihaleli_batak';
  timestamp: Date;
}

/**
 * Room with game state
 */
interface GameRoom {
  id: string;
  gameMachine: GameStateMachine;
  players: Map<string, Socket>;
  botManager: BotManagerClass;
  createdAt: Date;
}

/**
 * Matchmaker for pairing players and creating games
 *
 * REAL MP Logic:
 * - 4 gerçek oyuncu bulunca bekle
 * - X saniye bekleyip bulunamazsa bot ile doldur (botCount > 0 ise)
 * - Queue status broadcast: "3/4 oyuncu bekleniyor..."
 */
export class Matchmaker {
  private queue: QueueEntry[] = [];
  private rooms: Map<string, GameRoom> = new Map();
  private botManager = new BotManager();

  // Queue matching settings
  private readonly MATCH_TIMEOUT_MS = 30000; // 30 saniye bekle
  private readonly PLAYERS_PER_GAME = 4;

  /**
   * Add player to queue
   */
  joinQueue(entry: Omit<QueueEntry, 'timestamp'>): string | null {
    // Remove OLD entries for this wallet that have disconnected
    // But only if there's a newer connected entry for the same wallet
    this.queue = this.queue.filter(e => {
      if (e.publicKey === entry.publicKey && e.socketId !== entry.socketId) {
        // Old entry for same wallet
        if (!e.socket.connected) {
          // This old socket is disconnected and we're adding a new one
          // Safe to remove the old one
          console.log('[Matchmaker] Removing old disconnected entry for', e.publicKey.slice(0, 8));
          return false;
        }
      }
      return true;
    });

    const queueEntry: QueueEntry = {
      ...entry,
      timestamp: new Date()
    };

    this.queue.push(queueEntry);

    console.log('[Matchmaker] Player added to queue:', {
      socketId: entry.socketId,
      publicKey: entry.publicKey.slice(0, 8),
      gameMode: entry.gameMode,
      totalInQueue: this.queue.length
    });

    // Broadcast queue status
    this.broadcastQueueStatus();

    // Check if we can make a match immediately
    const roomId = this.tryMatchForGameMode(queueEntry.gameMode);

    if (roomId) {
      return roomId;
    }

    // No immediate match, set timeout for bot fallback
    if (entry.botCount > 0) {
      setTimeout(() => {
        this.checkBotFallback(queueEntry);
      }, this.MATCH_TIMEOUT_MS);
    }

    return null;
  }

  /**
   * Remove player from queue by public key
   */
  leaveQueue(socketId: string, publicKey?: string): void {
    if (publicKey) {
      // Remove all entries for this wallet (player explicitly left)
      this.queue = this.queue.filter(entry => entry.publicKey !== publicKey);
    } else {
      // Remove only this socket ID (disconnect)
      // Keep other entries for same wallet (other tabs)
      this.queue = this.queue.filter(entry => entry.socketId !== socketId);
    }
    this.broadcastQueueStatus();
  }

  /**
   * Get queue entry by socket ID (helper for leaveQueue)
   */
  getQueueEntryBySocketId(socketId: string): QueueEntry | undefined {
    return this.queue.find(entry => entry.socketId === socketId);
  }

  /**
   * Try to find a match for a specific game mode
   * Checks the ENTIRE queue and creates match when 4+ players found
   */
  private tryMatchForGameMode(gameMode: 'koz_maca' | 'ihaleli_batak'): string | null {
    const now = Date.now();

    console.log('[Matchmaker] Queue before filtering:', {
      total: this.queue.length,
      entries: this.queue.map(e => ({ wallet: e.publicKey.slice(0, 8), connected: e.socket.connected }))
    });

    // Get all valid players for this game mode
    const validPlayers = this.queue.filter(e =>
      e.gameMode === gameMode &&
      (now - e.timestamp.getTime()) < this.MATCH_TIMEOUT_MS
    );

    console.log('[Matchmaker] After timestamp filter:', {
      valid: validPlayers.length,
      entries: validPlayers.map(e => ({ wallet: e.publicKey.slice(0, 8), connected: e.socket.connected }))
    });

    // Deduplicate by PUBLIC KEY (wallet) - keep latest entry for each wallet
    const uniquePlayers = new Map<string, QueueEntry>();
    for (const player of validPlayers) {
      const existing = uniquePlayers.get(player.publicKey);
      if (!existing || player.timestamp > existing.timestamp) {
        uniquePlayers.set(player.publicKey, player);
      }
    }

    const playerArray = Array.from(uniquePlayers.values());

    console.log('[Matchmaker] After deduplication:', {
      unique: playerArray.length,
      wallets: playerArray.map(p => p.publicKey.slice(0, 8) + '...')
    });

    // Need 4 players
    if (playerArray.length >= 4) {
      const selectedPlayers = playerArray.slice(0, 4);

      console.log('[Matchmaker] Creating match with 4 unique players:', {
        players: selectedPlayers.map(p => ({ socket: p.socketId, wallet: p.publicKey.slice(0, 8) + '...' })),
        gameMode
      });

      // Remove all from queue
      selectedPlayers.forEach(p => {
        this.queue = this.queue.filter(e => e.publicKey !== p.publicKey);
      });

      // Create room with 4 real players
      return this.createRealRoom(selectedPlayers);
    }

    console.log('[Matchmaker] Not enough players for match:', {
      have: playerArray.length,
      uniqueWallets: playerArray.map(p => p.publicKey.slice(0, 8) + '...'),
      need: 4,
      gameMode
    });

    return null;
  }

  /**
   * After timeout, create room with bots if no match found
   */
  private checkBotFallback(entry: QueueEntry): void {
    // Check if player is still in queue (by public key since sockets change)
    const stillInQueue = this.queue.find(e => e.publicKey === entry.publicKey);
    if (!stillInQueue) return;

    // Try to match with real players one more time
    const roomId = this.tryMatchForGameMode(entry.gameMode);
    if (roomId) return;

    // No match found, create room with bots
    console.log('[Matchmaker] No match found, creating room with bots for', entry.publicKey.slice(0, 8) + '...');

    // Remove from queue
    this.queue = this.queue.filter(e => e.publicKey !== entry.publicKey);

    // Create bot-filled room
    const botRoomId = this.createBotRoom(entry);

    // Add socket to room
    this.addPlayerToRoom(botRoomId, entry.socketId, entry.socket);
    // IMPORTANT: Join socket to Socket.IO room so events work
    entry.socket.join(botRoomId);
    console.log('[Matchmaker] Socket joined room:', botRoomId);

    // Start the game
    const room = this.getRoom(botRoomId);
    if (room) {
      room.gameMachine.startGame();

      // Send match_found to the human player
      const clientState = room.gameMachine.getStateForClient(entry.socketId);

      console.log('[Matchmaker] Sending match_found with bot game to', entry.socketId);
      console.log('[Matchmaker] Game state:', {
        state: clientState.state,
        currentPlayerIndex: clientState.currentPlayerIndex,
        players: clientState.players.map((p: any) => ({ name: p.name, type: p.type, isHumanTurn: p.isHumanTurn }))
      });

      entry.socket.emit('match_found', {
        roomId: botRoomId,
        gameState: clientState
      });

      // Trigger bot turns if current player is a bot
      this.triggerBotTurns(botRoomId, room, entry.socket);
    } else {
      entry.socket.emit('error', { message: 'Failed to create bot room' });
    }
  }

  /**
   * Trigger bot turns for bidding/playing
   */
  private triggerBotTurns(roomId: string, room: any, humanSocket: Socket): void {
    const roomData = room.gameMachine.getRoom();
    const currentPlayer = roomData.players[roomData.currentPlayerIndex];

    if (currentPlayer?.type === 'bot') {
      console.log('[Matchmaker] Current player is bot, triggering bot turn:', currentPlayer.name);

      setTimeout(() => {
        const bot = room.botManager.getBot(currentPlayer.id);
        if (bot) {
          if (roomData.state === 'bidding') {
            // Bot bidding
            const highestBid = this.getCurrentHighestBid(roomData);
            const bid = bot.makeBid(currentPlayer, highestBid, ['spades'], roomData.gameMode);

            if (bid && bid.amount > 0) {
              console.log('[Matchmaker] Bot', currentPlayer.name, 'bids', bid.amount);
              room.gameMachine.submitBid(currentPlayer.id, bid.suit as any, bid.amount);
            } else {
              console.log('[Matchmaker] Bot', currentPlayer.name, 'passes');
              room.gameMachine.passBid(currentPlayer.id);
            }

            // Broadcast updated state
            const clientState = room.gameMachine.getStateForClient(humanSocket.id);
            humanSocket.emit('game_state_update', clientState);

            // Check if more bot turns needed
            this.triggerBotTurns(roomId, room, humanSocket);
          } else if (roomData.state === 'playing') {
            // Bot card playing - similar logic
            // For now, let SocketServer handle playing state
          }
        }
      }, 3000); // 3 second delay for bot turns
    } else {
      console.log('[Matchmaker] Current player is human, waiting for input:', currentPlayer.name);
      // IMPORTANT: Send game state update so client knows it's their turn!
      const clientState = room.gameMachine.getStateForClient(humanSocket.id);
      humanSocket.emit('game_state_update', clientState);
      console.log('[Matchmaker] Sent game_state_update to human, currentPlayerIndex:', clientState.currentPlayerIndex);
    }
  }

  /**
   * Get current highest bid from room data
   */
  private getCurrentHighestBid(roomData: any): any {
    const realBids = roomData.bids.filter((b: any) => b.amount > 0);
    if (realBids.length === 0) return { amount: 0, suit: null };
    return realBids.reduce((highest: any, bid: any) =>
      bid.amount > highest.amount ? bid : highest
    );
  }

  /**
   * Create room with 4 REAL players
   */
  private createRealRoom(entries: QueueEntry[]): string {
    const roomId = `room_real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const gameMachine = new GameStateMachine(roomId, 5, entries[0].gameMode);

    // Add all 4 human players
    entries.forEach((entry, index) => {
      gameMachine.addPlayer(entry.socketId, entry.socketId, false, entry.publicKey);
      console.log('[Matchmaker] Added player:', {
        socketId: entry.socketId,
        name: entry.socketId.slice(0, 8) + '...',
        publicKey: entry.publicKey.slice(0, 8)
      });
    });

    const room: GameRoom = {
      id: roomId,
      gameMachine,
      players: new Map(),
      botManager: this.botManager,
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);

    console.log('[Matchmaker] Created REAL MP room:', roomId, 'with 4 players');

    // Add all sockets to room
    entries.forEach(entry => {
      room.players.set(entry.socketId, entry.socket);
      entry.socket.join(roomId);
    });

    // Start the game
    gameMachine.startGame();

    // Send match_found to ALL players
    entries.forEach(entry => {
      const clientState = gameMachine.getStateForClient(entry.socketId);
      // Debug: log first card data
      const foundPlayer = clientState.players.find((p: any) => p.id === entry.socketId);
      console.log('[Matchmaker] For socket', entry.socketId.slice(0, 8), 'found player:', foundPlayer?.name, 'hand size:', foundPlayer?.hand?.length);
      const firstPlayerHand = clientState.players[0]?.hand;
      if (firstPlayerHand && firstPlayerHand.length > 0 && firstPlayerHand[0].id !== 'hidden-0-0') {
        console.log('[Matchmaker] First card in players[0]:', firstPlayerHand[0]);
      }
      entry.socket.emit('match_found', {
        roomId,
        gameState: clientState
      });
      console.log('[Matchmaker] Sent match_found to', entry.socketId, '(', entry.publicKey.slice(0, 8) + '...)');
    });

    return roomId;
  }

  /**
   * Create room with BOTs (fallback when no real players found)
   * Always creates 4 total players: 1 human + 3 bots
   */
  private createBotRoom(entry: QueueEntry): string {
    const roomId = `room_bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const gameMachine = new GameStateMachine(roomId, 5, entry.gameMode);

    // Add human player (index 0)
    gameMachine.addPlayer(entry.socketId, 'Player', false, entry.publicKey);

    // Always add 3 bots to make 4 total players (indices 1, 2, 3)
    const BOT_COUNT = 3;
    for (let i = 0; i < BOT_COUNT; i++) {
      const playerIndex = i + 1; // Human is at index 0, bots are at 1, 2, 3
      const bot = this.botManager.createBot(playerIndex, entry.botDifficulty);
      gameMachine.addPlayer(bot.getId(), bot.getName(), true);
    }

    const room: GameRoom = {
      id: roomId,
      gameMachine,
      players: new Map(),
      botManager: this.botManager,
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);

    console.log('[Matchmaker] Created BOT room:', roomId, 'with 1 human + 3 bots');

    return roomId;
  }

  /**
   * Broadcast queue status to all players in queue
   */
  private broadcastQueueStatus(): void {
    const gameModes = ['koz_maca', 'ihaleli_batak'] as const;

    gameModes.forEach(gameMode => {
      const playersInQueue = this.queue.filter(e => e.gameMode === gameMode).length;

      // Send status to each player in this game mode queue
      this.queue.forEach(entry => {
        if (entry.gameMode === gameMode) {
          entry.socket.emit('queue_status', {
            status: 'waiting',
            playersInQueue,
            playersNeeded: this.PLAYERS_PER_GAME,
            gameMode,
            message: `${playersInQueue}/${this.PLAYERS_PER_GAME} oyuncu bekleniyor...`
          });
        }
      });
    });
  }

  /**
   * Find which room a player is in
   */
  private findPlayerRoom(socketId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.players.has(socketId)) {
        return room;
      }
    }
    return undefined;
  }

  /**
   * Get room by ID
   */
  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Add player socket to room
   */
  addPlayerToRoom(roomId: string, socketId: string, socket: Socket): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.players.set(socketId, socket);
    }
  }

  /**
   * Remove player from room
   */
  removePlayerFromRoom(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.players.delete(socketId);

      // If no human players left, close room
      if (this.getHumanPlayerCount(room) === 0) {
        this.closeRoom(roomId);
      }
    }
  }

  /**
   * Get human player count in room
   */
  private getHumanPlayerCount(room: GameRoom): number {
    let count = 0;
    for (const [id, player] of room.gameMachine.getRoom().players) {
      if (player.type === 'human') {
        count++;
      }
    }
    return count;
  }

  /**
   * Close a room
   */
  private closeRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      // Disconnect all sockets
      for (const socket of room.players.values()) {
        socket.disconnect();
      }
      this.rooms.delete(roomId);
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Get active room count
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * Get all rooms
   */
  getAllRooms(): GameRoom[] {
    return Array.from(this.rooms.values());
  }
}
