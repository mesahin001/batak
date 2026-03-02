#!/usr/bin/env tsx
/**
 * Generate a new Solana wallet for cNFT minting.
 *
 * This script:
 * 1. Generates a new Solana keypair
 * 2. Saves it to server/wallet.json (for backup)
 * 3. Outputs the private key in JSON array format for .env
 * 4. Displays the wallet address for funding
 *
 * Usage:
 *   cd server && npm run create-wallet
 *
 * After running:
 * 1. Fund the wallet with devnet SOL: solana airdrop 2 <address> --url devnet
 * 2. Copy SOLANA_PRIVATE_KEY to your .env file
 * 3. Run npm run setup-tree to create the Merkle tree
 */

import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate new keypair
const keypair = Keypair.generate();

// Wallet file path (in server directory, not scripts)
const walletPath = path.join(__dirname, '..', 'wallet.json');

// Save to wallet.json for backup
const walletData = {
  publicKey: keypair.publicKey.toBase58(),
  secretKey: Array.from(keypair.secretKey),
};

fs.writeFileSync(walletPath, JSON.stringify(walletData, null, 2));
console.log(`✅ Wallet saved to: ${walletPath}`);

// Output for .env file
console.log('\n=================================');
console.log('🔑 WALLET GENERATED');
console.log('=================================\n');

console.log('Public Key (Wallet Address):');
console.log(keypair.publicKey.toBase58());
console.log();

console.log('Add this to your server/.env file:');
console.log('-----------------------------------');
console.log(`SOLANA_PRIVATE_KEY=${JSON.stringify(Array.from(keypair.secretKey))}`);
console.log('-----------------------------------');
console.log();

console.log('Next steps:');
console.log('  1. Fund your wallet with devnet SOL:');
console.log(`     solana airdrop 2 ${keypair.publicKey.toBase58()} --url devnet`);
console.log('  2. Update server/.env with the SOLANA_PRIVATE_KEY above');
console.log('  3. Create Merkle tree: npm run setup-tree');
console.log();
