#!/usr/bin/env tsx
/**
 * Create a Merkle tree using Solana CLI.
 * This is the most reliable method for devnet setup.
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SOLANA_PRIVATE_KEY = process.env.SOLANA_PRIVATE_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

if (!SOLANA_PRIVATE_KEY) {
  console.error('❌ SOLANA_PRIVATE_KEY not set in .env file');
  console.error('Run "npm run create-wallet" first');
  process.exit(1);
}

console.log('=================================');
console.log('🌳 MERKLE TREE CREATION');
console.log('=================================\n');

console.log('RPC:', SOLANA_RPC_URL);
console.log();

// Check if solana CLI is available
try {
  execSync('solana --version', { stdio: 'inherit' });
} catch {
  console.error('❌ Solana CLI not installed');
  console.error('Install from: https://solana.com/docs/cli');
  process.exit(1);
}

// Parse private key to get address
const privateKeyArray = JSON.parse(SOLANA_PRIVATE_KEY);
const { Keypair } = await import('@solana/web3.js');
const payerKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));

console.log('Wallet:', payerKeypair.publicKey.toBase58());
console.log();

try {
  // Configure solana CLI for devnet
  console.log('Configuring Solana CLI for devnet...');
  execSync('solana config set --url devnet', { stdio: 'inherit' });

  // Create the tree using spl-token CLI
  console.log('\nCreating Merkle tree...');
  console.log('This may take 15-30 seconds...\n');

  // Create tree with maxDepth=14, maxBufferSize=64
  const command = `spl-token bubblegum create-tree --max-depth 14 --max-buffer-size 64`;
  console.log('$', command);

  const output = execSync(command, {
    encoding: 'utf-8',
    stdio: 'pipe'
  });

  console.log(output);

  // Parse the output to find the tree address
  const treeMatch = output.match(/Tree\s+(address:\s+)?([1-9A-HJ-NP-Za-km-z]{32,44})/i);
  const signatureMatch = output.match(/Signature:\s+([1-9A-HJ-NP-Za-km-z]+)/);

  if (treeMatch) {
    const treeAddress = treeMatch[2];
    console.log('\n=================================');
    console.log('📋 MERKLE TREE ADDRESS');
    console.log('=================================\n');
    console.log(treeAddress);
    console.log();
    console.log('Add this to server/.env:');
    console.log('-----------------------------------');
    console.log(`MERKLE_TREE=${treeAddress}`);
    console.log('-----------------------------------');
  } else if (signatureMatch) {
    const signature = signatureMatch[1];
    console.log('\nTransaction sent! Signature:', signature);
    console.log('\nCheck Solana Explorer for tree address:');
    console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } else {
    console.log('\nTree created. Use the transaction signature to find the tree address.');
  }

} catch (error: any) {
  console.error('❌ Failed:', error.message);
  console.error('\nMake sure spl-token is installed:');
  console.error('  cargo install spl-token-cli');
  process.exit(1);
}
