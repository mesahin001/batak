/**
 * SKR Token Service
 * Queries SKR SPL token balance on Solana mainnet.
 * SKR is the native token of Solana Mobile (Seeker ecosystem).
 */

import { Connection, PublicKey } from '@solana/web3.js';

// SKR token mint address on mainnet
const SKR_MINT = new PublicKey('SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3');

// Use mainnet RPC for SKR (it's a mainnet token)
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';

// Token program ID
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

let connection: Connection | null = null;

function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(MAINNET_RPC, 'confirmed');
  }
  return connection;
}

/**
 * Get SKR token balance for a wallet address.
 * Returns balance in SKR (human-readable, divided by decimals).
 * Returns 0 if no account found or any error occurs.
 */
export async function getSkrBalance(walletAddress: string): Promise<number> {
  try {
    const conn = getConnection();
    const owner = new PublicKey(walletAddress);

    const tokenAccounts = await conn.getTokenAccountsByOwner(owner, {
      mint: SKR_MINT,
      programId: TOKEN_PROGRAM_ID,
    });

    if (tokenAccounts.value.length === 0) {
      return 0;
    }

    // Parse the first token account balance
    const accountInfo = tokenAccounts.value[0].account;
    const data = accountInfo.data;

    // SPL token account layout: amount is at offset 64 (8 bytes, little-endian u64)
    const amount = data.readBigUInt64LE(64);
    // SKR has 9 decimals
    const balance = Number(amount) / 1e9;

    return balance;
  } catch (error) {
    console.warn('[SkrService] Failed to fetch SKR balance:', error);
    return 0;
  }
}

/**
 * Format SKR balance for display.
 * Shows up to 2 decimal places, uses K suffix for thousands.
 */
export function formatSkrBalance(balance: number): string {
  if (balance >= 1000) {
    return `${(balance / 1000).toFixed(1)}K`;
  }
  if (balance >= 1) {
    return balance.toFixed(2);
  }
  return balance.toFixed(4);
}

export const SKR_MINT_ADDRESS = SKR_MINT.toBase58();
