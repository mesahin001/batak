/**
 * Lobi socket handler.
 * Kuyruk katılma/ayrılma ve matchmaking event'lerini işler.
 */

import { Socket } from 'socket.io';
import { Matchmaker } from '../../matchmaker/Matchmaker.js';
import { ServerEvent } from '../../types/socket.js';
export class LobbyHandler {
  constructor(private matchmaker: Matchmaker) {}

  /**
   * Handle player joining queue
   */
  handleJoinQueue(socket: Socket, publicKey: string, botCount: number = 3, botDifficulty: 'easy' | 'normal' | 'hard' = 'normal', gameMode: 'koz_maca' | 'ihaleli_batak' = 'koz_maca'): void {
    console.log(`[Lobby] Player ${socket.id} joining queue`);

    const roomId = this.matchmaker.joinQueue({
      socketId: socket.id,
      publicKey,
      botDifficulty,
      botCount,
      gameMode
      // timestamp is added automatically by joinQueue method
    });

    if (roomId) {
      this.matchmaker.addPlayerToRoom(roomId, publicKey, socket);
      socket.join(roomId);

      const room = this.matchmaker.getRoom(roomId);
      if (room) {
        const roomData = room.gameMachine.getRoom();

        socket.emit(ServerEvent.MATCH_FOUND, {
          roomId,
          players: roomData.players.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type
          }))
        });

        console.log(`[Lobby] Match found for ${socket.id} in room ${roomId}`);
      }
    }
  }

  /**
   * Handle player leaving queue
   */
  handleLeaveQueue(socket: Socket): void {
    console.log(`[Lobby] Player ${socket.id} leaving queue`);
    this.matchmaker.leaveQueue(socket.id);
  }

  /**
   * Send queue position to player
   */
  sendQueueUpdate(socket: Socket, position: number, estimatedWait: number): void {
    socket.emit(ServerEvent.QUEUE_UPDATE, {
      position,
      estimatedWait
    });
  }

  /**
   * Notify tournament started
   */
  notifyTournamentStarted(roomId: string, tournamentId: string): void {
    // In production, would emit to room
    console.log(`[Lobby] Tournament ${tournamentId} started in room ${roomId}`);
  }
}
