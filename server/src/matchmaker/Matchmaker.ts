/**
 * Oyuncu eşleştirme sistemi.
 * Kuyruktaki oyuncuları botlarla birlikte 4 kişilik odalara yerleştirir.
 */

import { Socket } from 'socket.io';
import { PlayerType, GameState, Suit } from '../types/game.js';
import { GameStateMachine } from '../game/GameStateMachine.js';
import { BatakBot, BotManager } from '../bots/BatakBot.js';
import { BotManager as BotManagerClass } from '../bots/BatakBot.js';
interface QueueEntry {
  socketId: string;
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
 */
export class Matchmaker {
  private queue: QueueEntry[] = [];
  private rooms: Map<string, GameRoom> = new Map();
  private botManager = new BotManager();

  /**
   * Add player to queue
   */
  joinQueue(entry: Omit<QueueEntry, 'timestamp'>): string | null {
    const queueEntry: QueueEntry = {
      ...entry,
      timestamp: new Date()
    };

    this.queue.push(queueEntry);

    // Check if we can make a match
    return this.tryMatch(queueEntry);
  }

  /**
   * Remove player from queue
   */
  leaveQueue(socketId: string): void {
    this.queue = this.queue.filter(entry => entry.socketId !== socketId);
  }

  /**
   * Try to find a match for a player
   */
  private tryMatch(entry: QueueEntry): string | null {
    const botCount = entry.botCount;

    // For MVP, create room immediately with bots
    // In production, would look for other players in queue
    const roomId = this.createRoom(entry);

    return roomId;
  }

  /**
   * Create a new game room
   */
  private createRoom(entry: QueueEntry): string {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
