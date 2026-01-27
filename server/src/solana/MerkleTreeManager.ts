/**
 * Merkle Tree yöneticisi.
 * Bubblegum cNFT'ler için merkle tree oluşturma ve yönetim.
 */

import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { Transaction } from '@solana/web3.js';
import { SolanaClient } from './SolanaClient.js';
import { config } from '../config.js';
export class MerkleTreeManager {
  private client: SolanaClient;

  constructor() {
    this.client = new SolanaClient();
  }

  /**
   * Initialize a new Merkle tree for cNFTs
   *
   * Tree size calculation:
   * - maxDepth=14: 2^14 = 16,384 leaf nodes (NFTs)
   * - maxBufferSize=64: Concurrent change buffer
   *
   * Cost: ~0.01 SOL to create tree
   * Cost per cNFT: ~0.00001 SOL (vs ~0.002 SOL for standard NFT)
   */
  async initializeTree(
    maxDepth: number = 14,
    maxBufferSize: number = 64
  ): Promise<{ treeAddress: string; signature: string }> {
    const connection = this.client.getConnection();
    const payer = this.client.getPayer();

    try {
      // In production, would create actual Bubblegum tree account
      // For MVP, using a placeholder
      const treeKeypair = Keypair.generate();
      const treeAddress = treeKeypair.publicKey.toString();

      console.log(`[MerkleTree] Initialized tree: ${treeAddress}`);
      console.log(`[MerkleTree] Max depth: ${maxDepth} (~${Math.pow(2, maxDepth)} NFTs)`);
      console.log(`[MerkleTree] Buffer size: ${maxBufferSize}`);

      return {
        treeAddress,
        signature: 'mock-signature',
      };
    } catch (error) {
      console.error('[MerkleTree] Failed to initialize tree:', error);
      throw error;
    }
  }

  /**
   * Get tree capacity
   */
  getTreeCapacity(maxDepth: number = 14): number {
    return Math.pow(2, maxDepth);
  }

  /**
   * Get current tree usage
   */
  async getTreeUsage(treeAddress: string): Promise<number> {
    try {
      // In production, would fetch from Bubblegum account
      // For MVP, returning mock value
      return 0;
    } catch (error) {
      console.error('[MerkleTree] Failed to get tree usage:', error);
      return 0;
    }
  }

  /**
   * Check if tree has capacity
   */
  async hasCapacity(treeAddress: string, maxDepth: number = 14): Promise<boolean> {
    const usage = await this.getTreeUsage(treeAddress);
    const capacity = this.getTreeCapacity(maxDepth);
    return usage < capacity;
  }

  /**
   * Calculate estimated cost for N batch mints
   */
  estimateMintCost(nftCount: number): { cnft: number; standard: number; savings: number } {
    // cNFT cost (per NFT)
    const cnftCost = 0.00001; // ~0.00001 SOL per cNFT
    const standardCost = 0.002; // ~0.002 SOL per standard NFT

    const totalCnft = cnftCost * nftCount;
    const totalStandard = standardCost * nftCount;

    return {
      cnft: totalCnft,
      standard: totalStandard,
      savings: totalStandard - totalCnft,
    };
  }

  /**
   * Get or create default tree for server
   */
  async getOrCreateDefaultTree(): Promise<string> {
    // If tree is configured, use it
    if (config.merkleTree) {
      const hasCapacity = await this.hasCapacity(config.merkleTree);
      if (hasCapacity) {
        return config.merkleTree;
      }
    }

    // Create new tree
    const { treeAddress } = await this.initializeTree();
    return treeAddress;
  }

  /**
   * Find available tree for minting
   */
  async findAvailableTree(): Promise<string> {
    // In production, would query multiple trees and find one with capacity
    // For MVP, using single tree
    return await this.getOrCreateDefaultTree();
  }
}
