/**
 * Solana client wrapper.
 * Solana RPC bağlantısı ve Anchor program etkileşimlerini yönetir.
 */

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { config } from '../config.js';
export class SolanaClient {
  private connection: Connection;
  private payer: Keypair;
  private program: Program<any>;

  constructor() {
    if (!config.solanaPrivateKey) {
      throw new Error('SOLANA_PRIVATE_KEY not set');
    }

    this.connection = new Connection(config.solanaRpcUrl, 'confirmed');

    // Load payer keypair from private key
    const privateKeyArray = JSON.parse(config.solanaPrivateKey);
    this.payer = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));

    // Setup Anchor provider
    const dummyKeypair = new web3.Keypair();
    const provider = new AnchorProvider(
      this.connection,
      {
        publicKey: dummyKeypair.publicKey,
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
      } as any,
      { commitment: 'confirmed' }
    );

    // Load program (IDL loaded at runtime)
    this.program = new Program(
      {} as any,
      new PublicKey(config.programId),
      provider
    );
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
   * Get program
   */
  getProgram(): Program<any> {
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
