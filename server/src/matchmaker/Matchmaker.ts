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
    // Remove any existing entry for this PUBLIC KEY (wallet) to handle reconnections
    // This is better than socket-based dedup because sockets change on reconnect
    this.queue = this.queue.filter(e => e.publicKey !== entry.publicKey);

    const queueEntry: QueueEntry = {
      ...entry,
      timestamp: new Date()
    };

    this.queue.push(queueEntry);

    console.log('[Matchmaker] Player added to queue:', {
      socketId: entry.socketId,
      publicKey: entry.publicKey,
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
      // Remove by public key (preferred - handles reconnections)
      this.queue = this.queue.filter(entry => entry.publicKey !== publicKey);
    } else {
      // Fallback: remove by socket ID
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

    // Get all valid players for this game mode
    const validPlayers = this.queue.filter(e =>
      e.gameMode === gameMode &&
      (now - e.timestamp.getTime()) < this.MATCH_TIMEOUT_MS
    );

    // Deduplicate by PUBLIC KEY (wallet) - keep latest entry for each wallet
    const uniquePlayers = new Map<string, QueueEntry>();
    for (const player of validPlayers) {
      const existing = uniquePlayers.get(player.publicKey);
      if (!existing || player.timestamp > existing.timestamp) {
        uniquePlayers.set(player.publicKey, player);
      }
    }

    const playerArray = Array.from(uniquePlayers.values());

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
    // Check if player is still in queue
    const stillInQueue = this.queue.find(e => e.socketId === entry.socketId);
    if (!stillInQueue) return;

    // Try to match with real players one more time
    const roomId = this.tryMatch(entry);
    if (roomId) return;

    // No match found, create room with bots
    console.log('[Matchmaker] No match found, creating room with bots for', entry.socketId);

    // Remove from queue
    this.queue = this.queue.filter(e => e.socketId !== entry.socketId);

    // Create bot-filled room
    const botRoomId = this.createBotRoom(entry);

    // Notify player using socket from entry
    entry.socket.emit('queue_status', {
      status: 'matched_with_bots',
      message: 'Oyuncu bulunamadı, botlarla oynuyorsunuz'
    });
  }

  /**
   * Create room with 4 REAL players
   */
  private createRealRoom(entries: QueueEntry[]): string {
    const roomId = `room_real_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const gameMachine = new GameStateMachine(roomId, 5, entries[0].gameMode);

    // Add all 4 human players
    entries.forEach((entry, index) => {
      gameMachine.addPlayer(entry.socketId, `Player ${index + 1}`, false, entry.publicKey);
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

    return roomId;
  }

  /**
   * Create room with BOTs (fallback when no real players found)
   */
  private createBotRoom(entry: QueueEntry): string {
    const roomId = `room_bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const gameMachine = new GameStateMachine(roomId, 5, entry.gameMode);

    // Add human player (index 0)
    gameMachine.addPlayer(entry.socketId, 'Player', false, entry.publicKey);

    // Add bots (indices 1, 2, 3...)
    for (let i = 0; i < entry.botCount; i++) {
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
