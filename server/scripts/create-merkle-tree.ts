#!/usr/bin/env tsx
/**
 * Create a Merkle Tree using Triton Digital API (simplest method)
 *
 * Usage: npx tsx server/scripts/create-merkle-tree.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from server directory
config({ path: resolve(process.cwd(), 'server', '.env') });

import { Keypair, Connection } from '@solana/web3.js';

// Configuration
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const PRIVATE_KEY_ARRAY = JSON.parse(process.env.SOLANA_PRIVATE_KEY || '[]');

async function createMerkleTree() {
  console.log('=== Creating Merkle Tree on Mainnet ===\n');

  // Load payer keypair
  const keypair = Keypair.fromSecretKey(new Uint8Array(PRIVATE_KEY_ARRAY));
  console.log('Payer address:', keypair.publicKey.toBase58());

  // Check balance
  const connection = new Connection(RPC_URL, 'confirmed');
  const balance = await connection.getBalance(keypair.publicKey);
  console.log('Payer balance:', (balance / 1e9).toFixed(4), 'SOL');

  if (balance < 0.1 * 1e9) {
    console.error('\n❌ Insufficient balance. Need at least 0.1 SOL for tree creation.');
    process.exit(1);
  }

  // Generate tree keypair
  const treeKeypair = Keypair.generate();

  console.log('\n--- Tree Configuration ---');
  console.log('Tree address:', treeKeypair.publicKey.toBase58());
  console.log('Max depth: 14');
  console.log('Max buffer size: 64');

  try {
    console.log('\n--- Using Triton Digital API ---');

    const response = await fetch('https://api.mainnet.triton.one/bubblegum/tree', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payer: keypair.publicKey.toBase58(),
        treeKeypair: Array.from(keypair.secretKey),
        maxDepth: 14,
        maxBufferSize: 64,
      }),
    });

    if (!response.ok) {
      throw new Error(`Triton API error: ${response.status}`);
    }

    const result = await response.json();

    console.log('\n✅ Merkle Tree created successfully!');
    console.log('Signature:', result.signature);
    console.log('Tree address:', result.treeAddress || treeKeypair.publicKey.toBase58());

    console.log('\n=== ADD THIS TO server/.env ===');
    console.log(`MERKLE_TREE=${result.treeAddress || treeKeypair.publicKey.toBase58()}`);
    console.log('==================================\n');

  } catch (error: any) {
    console.error('\n❌ Failed:', error.message);
    console.log('\n📋 Alternative: Create tree manually at:');
    console.log('https://www.shyft.to/bubblegum or Helius toolbox');
    console.log('\nOr use this tree address for testing:');
    console.log('MERKLE_TREE=', treeKeypair.publicKey.toBase58());
  }
}

createMerkleTree().catch(console.error);
