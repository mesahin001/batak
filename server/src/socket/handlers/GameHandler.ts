/**
 * Oyun socket handler.
 * Kart oynama, ihale ve tur geçişi event'lerini işler.
 */

import { Socket } from 'socket.io';
import { GameStateMachine } from '../../game/GameStateMachine.js';
import { ServerEvent } from '../../types/socket.js';
import { Suit } from '../../types/game.js';
export class GameHandler {
  /**
   * Handle card play
   */
  static handlePlayCard(socket: Socket, gameMachine: GameStateMachine, playerId: string, cardId: string): void {
    try {
      gameMachine.playCard(playerId, cardId);
      console.log(`[Game] Player ${playerId} played card ${cardId}`);
    } catch (error) {
      socket.emit(ServerEvent.ERROR, {
        message: error instanceof Error ? error.message : 'Failed to play card'
      });
    }
  }

  /**
   * Handle trump bid
   */
  static handleBidTrump(socket: Socket, gameMachine: GameStateMachine, playerId: string, suit: Suit, amount: number): void {
    try {
      if (amount === 0) {
        gameMachine.passBid(playerId);
        console.log(`[Game] Player ${playerId} passed`);
      } else {
        gameMachine.submitBid(playerId, suit, amount);
        console.log(`[Game] Player ${playerId} bid ${amount} ${suit}`);
      }
    } catch (error) {
      socket.emit(ServerEvent.ERROR, {
        message: error instanceof Error ? error.message : 'Failed to submit bid'
      });
    }
  }

  /**
   * Broadcast game state to room
   */
  static broadcastGameState(_io: any, _roomId: string, gameMachine: GameStateMachine, playerSockets: Map<string, Socket>): void {
    for (const [playerId, socket] of playerSockets) {
      const state = gameMachine.getStateForClient(playerId);
      socket.emit(ServerEvent.GAME_STATE_UPDATE, state);
    }
  }

  /**
   * Handle trick completion
   */
  static handleTrickComplete(io: any, roomId: string, winnerId: string, cards: any[]): void {
    io.to(roomId).emit(ServerEvent.TRICK_COMPLETE, {
      winnerId,
      cards
    });
  }

  /**
   * Handle round completion
   */
  static handleRoundComplete(io: any, roomId: string, scores: number[]): void {
    io.to(roomId).emit(ServerEvent.ROUND_COMPLETE, {
      scores
    });
  }
}
