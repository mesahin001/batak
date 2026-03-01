/**
 * Solana client wrapper.
 * Solana RPC bağlantısı ve Anchor program etkileşimlerini yönetir.
 */

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import BN from 'bn.js';
import { config } from '../config.js';
export class SolanaClient {
  private connection: Connection;
  private payer: Keypair;
  private program: Program<any> | undefined;

  constructor() {
    if (!config.solanaPrivateKey) {
      throw new Error('SOLANA_PRIVATE_KEY not set');
    }

    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');

    // Load payer keypair from private key
    const privateKeyArray = JSON.parse(config.solanaPrivateKey);
    this.payer = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));

    // Program initialization deferred - IDL not currently available
    // CNFTMinter works fine without the Anchor Program
    // The Anchor Program is only needed for unused on-chain tournament features
    this.program = undefined;
  }

  /**
   * Get connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get payer keypair
   */
  getPayer(): Keypair {
    return this.payer;
  }

  /**
   * Get program (may be undefined if IDL not loaded)
   */
  getProgram(): Program<any> | undefined {
    return this.program;
  }

  /**
   * Get current slot
   */
  async getCurrentSlot(): Promise<number> {
    return await this.connection.getSlot();
  }

  /**
   * Get balance
   */
  async getBalance(pubkey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(pubkey);
    return balance / 1e9; // Convert to SOL
  }

  /**
   * Request airdrop (devnet only)
   */
  async requestAirdrop(amount: number = 1): Promise<string> {
    const signature = await this.connection.requestAirdrop(
      this.payer.publicKey,
      amount * 1e9
    );
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  /**
   * Derive tournament PDA
   */
  deriveTournamentPDA(tournamentId: number): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('tournament'),
        this.payer.publicKey.toBuffer(),
        new BN(tournamentId).toArrayLike(Buffer, 'le', 8)
      ],
      new PublicKey(config.programId)
    );
  }

  /**
   * Derive registration PDA
   */
  deriveRegistrationPDA(tournament: PublicKey, player: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from('registration'),
        tournament.toBuffer(),
        player.toBuffer()
      ],
      new PublicKey(config.programId)
    );
  }

  /**
   * Send and confirm transaction
   */
  async sendAndConfirmTransaction(tx: Transaction): Promise<string> {
    const signature = await this.connection.sendTransaction(tx, [this.payer]);
    await this.connection.confirmTransaction(signature);
    return signature;
  }
}
