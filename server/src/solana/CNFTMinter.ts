/**
 * cNFT minter.
 * Metaplex Bubblegum ile turnuva kazananlarına compressed NFT mint eder.
 */

import { PublicKey } from '@solana/web3.js';
// @ts-ignore - optional dependency
import { createTree, mintCompressedNft } from '@metaplex-foundation/mpl-bubblegum';
// @ts-ignore - optional dependency
import { dasApi, irysStorage } from '@metaplex-foundation/umi';
// @ts-ignore - optional dependency
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
// @ts-ignore - optional dependency
import { walletAdapterIdentity } from '@metaplex-foundation/umi-signer-wallet-adapters';
import { SolanaClient } from './SolanaClient.js';
import { CNFTMetadata } from '../types/tournament.js';
import { config } from '../config.js';

/**
 * Compressed NFT (cNFT) Minter using Bubblegum
 */
export class CNFTMinter {
  private client: SolanaClient;
  private umi: any;
  private merkleTree: PublicKey;

  constructor(merkleTreeAddress: string) {
    this.client = new SolanaClient();
    this.merkleTree = new PublicKey(merkleTreeAddress);

    // Initialize Umi for Bubblegum operations
    this.umi = createUmi(config.solanaRpcUrl)
      .use(walletAdapterIdentity(this.createWalletAdapter()))
      .use(irysStorage())
      .use(dasApi());
  }

  /**
   * Create wallet adapter for Umi
   */
  private createWalletAdapter(): any {
    const keypair = this.client.getPayer();
    return {
      publicKey: keypair.publicKey.toBase58(),
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };
  }

  /**
   * Create a new Merkle tree for cNFTs
   */
  async createMerkleTree(maxDepth: number = 14, maxBufferSize: number = 64): Promise<string> {
    try {
      const builder = createTree(this.umi, {
        maxDepth,
        maxBufferSize,
      });

      const result = await builder.sendAndConfirm(this.umi);

      console.log(`[cNFT] Created Merkle tree: ${result.signature}`);
      return result.signature;
    } catch (error) {
      console.error('[cNFT] Failed to create Merkle tree:', error);
      throw error;
    }
  }

  /**
   * Mint a compressed NFT to winner
   */
  async mintRewardNFT(
    winnerAddress: string,
    metadata: CNFTMetadata
  ): Promise<{ signature: string; assetId: string }> {
    try {
      // Upload metadata to Arweave/Irys
      const metadataUri = await this.uploadMetadata(metadata);

      // Mint compressed NFT
      const builder = mintCompressedNft(this.umi, {
        leafOwner: new PublicKey(winnerAddress) as any,
        merkleTree: this.merkleTree as any,
        metadataUrl: metadataUri,
        name: metadata.name,
        symbol: metadata.symbol,
        sellerFeeBasisPoints: 500, // 5% royalty
        creators: [
          {
            address: this.client.getPayer().publicKey as any,
            verified: true,
            share: 100,
          },
        ],
        collection: null,
        isMutable: false, // Immutable for MVP
      });

      const result = await builder.sendAndConfirm(this.umi);

      console.log(`[cNFT] Minted reward NFT: ${result.signature}`);

      return {
        signature: result.signature,
        assetId: result.assetId || 'pending',
      };
    } catch (error) {
      console.error('[cNFT] Failed to mint reward NFT:', error);
      throw error;
    }
  }

  /**
   * Upload metadata to Arweave/Irys
   */
  private async uploadMetadata(metadata: CNFTMetadata): Promise<string> {
    try {
      // In production, would upload to Irys/Arweave
      // For MVP, using placeholder URI
      JSON.stringify(metadata);

      // Mock URI (replace with actual upload in production)
      const uri = `https://arweave.net/placeholder-${Date.now()}`;
      console.log(`[cNFT] Metadata uploaded (mock): ${uri}`);

      return uri;
    } catch (error) {
      console.error('[cNFT] Failed to upload metadata:', error);
      throw error;
    }
  }

  /**
   * Get NFT metadata for tournament winner
   */
  getTournamentMetadata(
    tournamentId: string,
    _winnerAddress: string,
    rewardTier: 'bronze' | 'silver' | 'gold',
    date: Date
  ): CNFTMetadata {
    const tierEmojis = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇'
    };

    return {
      name: `Batak Champion ${tierEmojis[rewardTier]} - S1`,
      symbol: 'BTK',
      description: `Winner of Batak Tournament #${tournamentId} on ${date.toISOString().split('T')[0]}`,
      image: 'https://example.com/nft-image.png', // Upload actual image in production
      attributes: [
        {
          trait_type: 'Tournament ID',
          value: tournamentId,
        },
        {
          trait_type: 'Date',
          value: date.toISOString().split('T')[0],
        },
        {
          trait_type: 'Season',
          value: '1',
        },
        {
          trait_type: 'Rank',
          value: '1st Place',
        },
        {
          trait_type: 'Prize Tier',
          value: rewardTier.charAt(0).toUpperCase() + rewardTier.slice(1),
        },
      ],
      collection: {
        name: 'Batak Champions',
        family: 'Batak Tournament',
      },
    };
  }

  /**
   * Mint tournament reward
   */
  async mintTournamentReward(
    tournamentId: string,
    winnerAddress: string,
    rewardTier: 'bronze' | 'silver' | 'gold'
  ): Promise<{ signature: string; assetId: string }> {
    const metadata = this.getTournamentMetadata(
      tournamentId,
      winnerAddress,
      rewardTier,
      new Date()
    );

    return await this.mintRewardNFT(winnerAddress, metadata);
  }

  /**
   * Get asset by ID
   */
  async getAsset(assetId: string): Promise<any> {
    try {
      const asset = await this.umi.rpc.getAsset(assetId);
      return asset;
    } catch (error) {
      console.error('[cNFT] Failed to fetch asset:', error);
      return null;
    }
  }

  /**
   * Get assets by owner
   */
  async getAssetsByOwner(ownerAddress: string): Promise<any[]> {
    try {
      const assets = await this.umi.rpc.getAssetsByOwner({
        owner: ownerAddress,
      });
      return assets;
    } catch (error) {
      console.error('[cNFT] Failed to fetch assets by owner:', error);
      return [];
    }
  }
}
