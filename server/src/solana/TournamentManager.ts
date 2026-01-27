/**
 * Turnuva yöneticisi.
 * On-chain turnuva oluşturma, oyuncu kayıt ve sonuç kaydetme işlemleri.
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { SolanaClient } from './SolanaClient.js';
import { TournamentStatus, TournamentResult } from '../types/tournament.js';
export class TournamentManager {
  private client: SolanaClient;

  constructor() {
    this.client = new SolanaClient();
  }

  /**
   * Create a new tournament on-chain
   */
  async createTournament(
    tournamentId: number,
    rewardTier: 'bronze' | 'silver' | 'gold',
    maxPlayers: number = 4
  ): Promise<string> {
    const program = this.client.getProgram();
    const [tournamentPda] = this.client.deriveTournamentPDA(tournamentId);

    // Convert reward tier to number
    const tierMap = { bronze: 1, silver: 2, gold: 3 };
    const tier = tierMap[rewardTier];

    // Create merkle tree keypair (in production, would be pre-created)
    const merkleTree = Keypair.generate();

    try {
      const signature = await program.methods
        .createTournament(
          new BN(tournamentId),
          new BN(tier),
          new BN(maxPlayers)
        )
        .accounts({
          tournament: tournamentPda,
          authority: this.client.getPayer().publicKey,
          merkleTree: merkleTree.publicKey,
          systemProgram: PublicKey.default,
        })
        .rpc();

      console.log(`[Tournament] Created tournament ${tournamentId}: ${signature}`);
      return signature;
    } catch (error) {
      console.error('[Tournament] Failed to create tournament:', error);
      throw error;
    }
  }

  /**
   * Register a player for a tournament
   */
  async registerPlayer(
    tournamentId: number,
    playerPublicKey: string
  ): Promise<string> {
    const program = this.client.getProgram();
    const [tournamentPda] = this.client.deriveTournamentPDA(tournamentId);
    const playerPubkey = new PublicKey(playerPublicKey);
    const [registrationPda] = this.client.deriveRegistrationPDA(tournamentPda, playerPubkey);

    try {
      const signature = await program.methods
        .registerPlayer(new BN(tournamentId))
        .accounts({
          tournament: tournamentPda,
          registration: registrationPda,
          player: playerPubkey,
          systemProgram: PublicKey.default,
        })
        .rpc();

      console.log(`[Tournament] Registered player ${playerPublicKey} for tournament ${tournamentId}`);
      return signature;
    } catch (error) {
      console.error('[Tournament] Failed to register player:', error);
      throw error;
    }
  }

  /**
   * Submit match result to blockchain
   */
  async submitMatchResult(result: TournamentResult): Promise<string> {
    const program = this.client.getProgram();
    const [tournamentPda] = this.client.deriveTournamentPDA(parseInt(result.tournamentId));

    try {
      const signature = await program.methods
        .submitMatchResult(
          new BN(parseInt(result.tournamentId)),
          new PublicKey(result.winnerPublicKey),
          Buffer.from(result.serverSignature, 'base64') as any
        )
        .accounts({
          tournament: tournamentPda,
          server: this.client.getPayer().publicKey,
        })
        .rpc();

      console.log(`[Tournament] Submitted result for tournament ${result.tournamentId}`);
      return signature;
    } catch (error) {
      console.error('[Tournament] Failed to submit match result:', error);
      throw error;
    }
  }

  /**
   * Get tournament account data
   */
  async getTournament(tournamentId: number): Promise<any> {
    const program = this.client.getProgram();
    const [tournamentPda] = this.client.deriveTournamentPDA(tournamentId);

    try {
      const account = await program.account.tournament.fetch(tournamentPda);
      return account;
    } catch (error) {
      console.error('[Tournament] Failed to fetch tournament:', error);
      return null;
    }
  }

  /**
   * Check if tournament exists
   */
  async tournamentExists(tournamentId: number): Promise<boolean> {
    const account = await this.getTournament(tournamentId);
    return account !== null;
  }

  /**
   * Get all tournaments for authority
   */
  async getAllTournaments(): Promise<any[]> {
    const program = this.client.getProgram();
    const authority = this.client.getPayer().publicKey;

    try {
      const accounts = await program.account.tournament.all([
        {
          memcmp: {
            offset: 8, // Skip discriminator
            bytes: authority.toBase58()
          }
        }
      ]);

      return accounts.map(acc => ({
        publicKey: acc.publicKey,
        account: acc.account
      }));
    } catch (error) {
      console.error('[Tournament] Failed to fetch tournaments:', error);
      return [];
    }
  }

  /**
   * Close tournament (cancel)
   */
  async closeTournament(tournamentId: number): Promise<string> {
    // In production, would add close_tournament instruction
    // For MVP, tournaments just stay on chain
    console.log(`[Tournament] Tournament ${tournamentId} closing (not implemented)`);
    return 'not-implemented';
  }
}
