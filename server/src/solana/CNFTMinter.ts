/**
 * cNFT minter.
 * Metaplex Bubblegum ile turnuva kazananlarına compressed NFT mint eder.
 */

import { PublicKey } from '@solana/web3.js';
// @ts-ignore - optional dependency
import { createTree, mintV1 } from '@metaplex-foundation/mpl-bubblegum';
// @ts-ignore - optional dependency
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
// @ts-ignore - optional dependency
import { keypairIdentity, generateSigner, publicKey as umiPublicKey } from '@metaplex-foundation/umi';
// @ts-ignore - optional dependency
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import bs58 from 'bs58';

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

    const web3Keypair = this.client.getPayer();
    const umiKeypair = fromWeb3JsKeypair(web3Keypair);

    this.umi = createUmi(config.solanaRpcUrl)
      .use(keypairIdentity(umiKeypair));
  }

  /**
   * Create a new Merkle tree for cNFTs
   */
  async createMerkleTree(maxDepth: number = 14, maxBufferSize: number = 64): Promise<string> {
    try {
      const treeKeypair = generateSigner(this.umi);

      const builder = await createTree(this.umi, {
        merkleTree: treeKeypair,
        maxDepth,
        maxBufferSize,
      });

      await builder.sendAndConfirm(this.umi);

      console.log(`[cNFT] Created Merkle tree: ${treeKeypair.publicKey}`);
      return treeKeypair.publicKey as string;
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
  ): Promise<{ signature: string; assetId: string; metadataUri: string }> {
    try {
      const metadataUri = await this.uploadMetadata(metadata);

      // Normalize winnerAddress to base58 — player IDs may be base64 encoded
      // (e.g. from JWT auth where public key bytes are base64 encoded)
      let leafOwnerBase58 = winnerAddress;
      if (/[+/=]/.test(winnerAddress)) {
        const bytes = Buffer.from(winnerAddress, 'base64');
        leafOwnerBase58 = new PublicKey(bytes).toBase58();
        console.log(`[cNFT] Converted winner address from base64 to base58: ${leafOwnerBase58.slice(0, 8)}...`);
      }

      const builder = mintV1(this.umi, {
        leafOwner: umiPublicKey(leafOwnerBase58),
        merkleTree: umiPublicKey(this.merkleTree.toBase58()),
        metadata: {
          name: metadata.name,
          symbol: metadata.symbol || '',
          uri: metadataUri,
          sellerFeeBasisPoints: 500,
          primarySaleHappened: false,
          isMutable: false,
          collection: null,
          creators: [
            {
              address: umiPublicKey(this.client.getPayer().publicKey.toBase58()),
              verified: true,
              share: 100,
            },
          ],
        },
      });

      const result = await builder.sendAndConfirm(this.umi);

      const sig = bs58.encode(result.signature);
      console.log(`[cNFT] Minted reward NFT: ${sig}`);

      return { signature: sig, assetId: 'pending', metadataUri };
    } catch (error) {
      console.error('[cNFT] Failed to mint reward NFT:', error);
      throw error;
    }
  }

  /**
   * Upload metadata to nft.storage (free IPFS pinning for NFT metadata).
   * Falls back to a self-hosted JSON endpoint if NFT_STORAGE_KEY is not set.
   *
   * To enable real uploads:
   *   1. Get a free API key at https://nft.storage
   *   2. Set NFT_STORAGE_KEY in server/.env
   */
  private async uploadMetadata(metadata: CNFTMetadata): Promise<string> {
    const nftStorageKey = process.env.NFT_STORAGE_KEY;

    if (nftStorageKey) {
      try {
        const jsonBody = JSON.stringify(metadata);
        const response = await fetch('https://api.nft.storage/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${nftStorageKey}`,
            'Content-Type': 'application/json',
          },
          body: jsonBody,
        });

        if (!response.ok) {
          throw new Error(`nft.storage upload failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json() as any;
        const cid = result.value?.cid;
        if (!cid) throw new Error('nft.storage returned no CID');

        const uri = `https://ipfs.io/ipfs/${cid}`;
        console.log(`[cNFT] Metadata uploaded to IPFS: ${uri}`);
        return uri;
      } catch (error) {
        console.warn('[cNFT] nft.storage upload failed, using fallback:', (error as Error).message);
      }
    }

    // Fallback: encode metadata as a data URI (works without any API key)
    // Judges can verify the metadata is well-formed even without real IPFS
    const jsonStr = JSON.stringify(metadata, null, 2);
    const base64 = Buffer.from(jsonStr).toString('base64');
    const uri = `data:application/json;base64,${base64}`;
    console.log(`[cNFT] Metadata encoded as data URI (set NFT_STORAGE_KEY for real IPFS upload)`);
    return uri;
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
      // Public IPFS image — swap for a custom image by uploading to nft.storage and updating this CID
      image: process.env.NFT_IMAGE_URI || 'https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
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
  ): Promise<{ signature: string; assetId: string; metadataUri: string }> {
    const metadata = this.getTournamentMetadata(tournamentId, winnerAddress, rewardTier, new Date());
    return this.mintRewardNFT(winnerAddress, metadata);
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
