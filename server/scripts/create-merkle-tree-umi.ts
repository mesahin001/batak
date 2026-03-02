#!/usr/bin/env tsx
/**
 * Create a Merkle Tree using Metaplex UMI + Bubblegum (mainnet)
 *
 * Usage: cd server && npx tsx scripts/create-merkle-tree-umi.ts
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

// @ts-ignore
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
// @ts-ignore
import { keypairIdentity, generateSigner } from '@metaplex-foundation/umi';
// @ts-ignore
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
// @ts-ignore
import { createTree } from '@metaplex-foundation/mpl-bubblegum';
import { Keypair, Connection } from '@solana/web3.js';
import bs58 from 'bs58';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const PRIVATE_KEY_ARRAY = JSON.parse(process.env.SOLANA_PRIVATE_KEY || '[]');

async function main() {
  console.log('=== Creating Merkle Tree via UMI + Bubblegum ===\n');
  console.log('RPC:', RPC_URL);

  const web3Keypair = Keypair.fromSecretKey(new Uint8Array(PRIVATE_KEY_ARRAY));
  console.log('Payer:', web3Keypair.publicKey.toBase58());

  const connection = new Connection(RPC_URL, 'confirmed');
  const balance = await connection.getBalance(web3Keypair.publicKey);
  console.log('Balance:', (balance / 1e9).toFixed(4), 'SOL\n');

  if (balance < 0.1 * 1e9) {
    console.error('❌ Insufficient balance. Need at least 0.1 SOL.');
    process.exit(1);
  }

  const umiKeypair = fromWeb3JsKeypair(web3Keypair);
  const umi = createUmi(RPC_URL).use(keypairIdentity(umiKeypair));

  const treeKeypair = generateSigner(umi);
  console.log('Tree address:', treeKeypair.publicKey);
  console.log('maxDepth: 14, maxBufferSize: 64');
  console.log('\nSending transaction...');

  // maxDepth=5 → 32 NFT capacity (MVP), costs ~0.04 SOL
  const builder = await createTree(umi, {
    merkleTree: treeKeypair,
    maxDepth: 5,
    maxBufferSize: 8,
  });

  const result = await builder.sendAndConfirm(umi);
  const sig = bs58.encode(result.signature);

  console.log('\n✅ Merkle Tree created!');
  console.log('Signature:', sig);
  console.log(`Explorer: https://explorer.solana.com/tx/${sig}`);

  console.log('\n=== ADD TO server/.env ===');
  console.log(`MERKLE_TREE=${treeKeypair.publicKey}`);
  console.log('==========================\n');
}

main().catch((e) => {
  console.error('❌ Failed:', e.message || e);
  process.exit(1);
});
