import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import {
  Connection,
  Transaction,
  TransactionInstruction,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { AsyncStorageService } from '../storage/AsyncStorageService';

// Solana devnet connection for transaction submission
const DEVNET_CONNECTION = new Connection('https://api.devnet.solana.com', 'confirmed');

// SPL Memo program ID — used to write on-chain memos without transferring funds
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * App identity for Solana Mobile Wallet Adapter
 */
export const APP_IDENTITY = {
  name: 'Batak Tournament',
  uri: 'https://batak-tournament.com',
  icon: 'favicon.png', // TODO: Add app icon
};

/**
 * Wallet authorization result
 */
export interface WalletAuthResult {
  publicKey: string;
  authToken: string;
  walletUriBase: string;
}

/**
 * Seeker wallet service for Solana Mobile integration
 * Handles authorization, reauthorization, and signing
 */
export class SeekerWalletService {
  /**
   * Authorize with Seeker wallet
   * Opens Seeker app and requests authorization
   */
  static async authorize(): Promise<WalletAuthResult> {
    try {
      const result = await transact(async (wallet: Web3MobileWallet) => {
        const authResult = await wallet.authorize({
          identity: APP_IDENTITY,
        });

        return {
          publicKey: authResult.accounts[0].address.toString(),
          authToken: authResult.auth_token,
          walletUriBase: authResult.wallet_uri_base,
        };
      });

      // Store auth data for silent reconnect
      await AsyncStorageService.setWalletToken(result.authToken);
      await AsyncStorageService.setWalletPublicKey(result.publicKey);

      return result;
    } catch (error) {
      console.error('Wallet authorization failed:', error);
      throw new Error('Failed to authorize wallet: ' + (error as Error).message);
    }
  }

  /**
   * Reauthorize using saved auth token (silent reconnect)
   * Attempts to reconnect without opening Seeker app
   */
  static async reauthorize(): Promise<WalletAuthResult | null> {
    try {
      const authToken = await AsyncStorageService.getWalletToken();

      if (!authToken) {
        return null;
      }

      const result = await transact(async (wallet: Web3MobileWallet) => {
        const authResult = await wallet.reauthorize({
          identity: APP_IDENTITY,
          auth_token: authToken,
        });

        return {
          publicKey: authResult.accounts[0].address.toString(),
          authToken: authResult.auth_token,
          walletUriBase: authResult.wallet_uri_base,
        };
      });

      // Update stored auth token (might have changed)
      await AsyncStorageService.setWalletToken(result.authToken);
      await AsyncStorageService.setWalletPublicKey(result.publicKey);

      return result;
    } catch (error) {
      console.error('Wallet reauthorization failed:', error);
      // Clear invalid token
      await AsyncStorageService.removeWalletToken();
      return null;
    }
  }

  /**
   * Deauthorize (disconnect wallet)
   * Clears stored auth data
   */
  static async deauthorize(): Promise<void> {
    try {
      const authToken = await AsyncStorageService.getWalletToken();

      if (authToken) {
        await transact(async (wallet: Web3MobileWallet) => {
          await wallet.deauthorize({ auth_token: authToken });
        });
      }

      // Clear stored data
      await AsyncStorageService.removeWalletToken();
      await AsyncStorageService.removeWalletPublicKey();
    } catch (error) {
      console.error('Wallet deauthorization failed:', error);
      // Still clear local data even if deauthorize call fails
      await AsyncStorageService.removeWalletToken();
      await AsyncStorageService.removeWalletPublicKey();
    }
  }

  /**
   * Check if user has previously authorized
   */
  static async isAuthorized(): Promise<boolean> {
    const publicKey = await AsyncStorageService.getWalletPublicKey();
    const authToken = await AsyncStorageService.getWalletToken();
    return !!(publicKey && authToken);
  }

  /**
   * Get stored public key without reauthorization
   */
  static async getPublicKey(): Promise<string | null> {
    return await AsyncStorageService.getWalletPublicKey();
  }

  /**
   * Sign a transaction using authorized wallet
   */
  static async signTransaction(transaction: any): Promise<any> {
    try {
      const authToken = await AsyncStorageService.getWalletToken();

      if (!authToken) {
        throw new Error('Wallet not authorized');
      }

      const signedTransactions = await transact(async (wallet: Web3MobileWallet) => {
        const signatures = await wallet.signTransactions({
          transactions: [transaction],
        });
        return signatures;
      });

      return signedTransactions[0];
    } catch (error) {
      console.error('Transaction signing failed:', error);
      throw error;
    }
  }

  /**
   * Claim an NFT reward by signing a memo transaction on-chain.
   * This proves wallet ownership and initiates the minting process.
   * The memo contains the tournamentId so the reward can be verified on-chain.
   *
   * @returns transaction signature on Solana devnet
   */
  static async claimNftReward(tournamentId: string): Promise<string> {
    const authToken = await AsyncStorageService.getWalletToken();
    const publicKeyStr = await AsyncStorageService.getWalletPublicKey();

    if (!authToken || !publicKeyStr) {
      throw new Error('Wallet not authorized');
    }

    // Build a memo transaction: writes "batak:claim:<tournamentId>" on-chain.
    // This is a real on-chain transaction that costs ~0.000005 SOL.
    const walletPublicKey = new PublicKey(publicKeyStr);
    const memoText = `batak:claim:${tournamentId}`;

    const { blockhash, lastValidBlockHeight } = await DEVNET_CONNECTION.getLatestBlockhash();

    const transaction = new Transaction({
      feePayer: walletPublicKey,
      recentBlockhash: blockhash,
    }).add(
      new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        keys: [{ pubkey: walletPublicKey, isSigner: true, isWritable: false }],
        data: Buffer.from(memoText, 'utf-8'),
      })
    );

    // Sign via MWA (opens Seeker wallet for approval)
    const signedTxs = await transact(async (wallet: Web3MobileWallet) => {
      // Reauthorize to ensure session is fresh
      await wallet.reauthorize({
        identity: APP_IDENTITY,
        auth_token: authToken,
      });
      return await wallet.signTransactions({ transactions: [transaction] });
    });

    const signedTx = signedTxs[0];

    // Submit to devnet
    const signature = await DEVNET_CONNECTION.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Wait for confirmation
    await DEVNET_CONNECTION.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    );

    console.log(`[SeekerWallet] NFT claim transaction confirmed: ${signature}`);
    return signature;
  }

  /**
   * Sign a message using authorized wallet
   */
  static async signMessage(message: Uint8Array): Promise<Uint8Array> {
    try {
      const authToken = await AsyncStorageService.getWalletToken();

      if (!authToken) {
        throw new Error('Wallet not authorized');
      }

      const signatures = await transact(async (wallet: Web3MobileWallet) => {
        const signedMessages = await wallet.signMessages({
          addresses: [await AsyncStorageService.getWalletPublicKey() || ''],
          payloads: [message],
        });
        return signedMessages;
      });

      return signatures[0];
    } catch (error) {
      console.error('Message signing failed:', error);
      throw error;
    }
  }
}
