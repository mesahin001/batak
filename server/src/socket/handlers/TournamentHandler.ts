/**
 * Turnuva socket handler.
 * cNFT ödül claim ve turnuva sonuç event'lerini işler.
 */

import { Socket } from 'socket.io';
import { ServerEvent } from '../../types/socket.js';
export class TournamentHandler {
  /**
   * Handle reward claim
   */
  static handleClaimReward(socket: Socket, tournamentId: string, _publicKey: string): void {
    console.log(`[Tournament] Player claiming reward for tournament ${tournamentId}`);

    // In production, would verify with Solana program
    // and mint cNFT to winner

    socket.emit(ServerEvent.REWARD_MINTED, {
      tournamentId,
      mintAddress: 'mock_mint_address',
      metadata: {
        name: 'Batak Champion',
        description: `Winner of tournament ${tournamentId}`
      }
    });
  }

  /**
   * Handle tournament error
   */
  static handleTournamentError(socket: Socket, message: string): void {
    socket.emit(ServerEvent.TOURNAMENT_ERROR, {
      message
    });
  }

  /**
   * Notify tournament started
   */
  static notifyTournamentStarted(io: any, roomId: string, tournamentId: string): void {
    io.to(roomId).emit(ServerEvent.TOURNAMENT_STARTED, {
      tournamentId
    });
  }
}
