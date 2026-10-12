/**
 * SKR Token Service
 * Queries SKR SPL token balance on Solana mainnet (plain JSON-RPC, no Buffer needed).
 * SKR is the native token of Solana Mobile (Seeker ecosystem).
 */

import { PublicKey } from '@solana/web3.js';

// SKR token mint address on mainnet (6 decimals)
const SKR_MINT = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';
const SKR_DECIMALS = 6;

const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// The default Solana RPC rejects or rate-limits many mobile clients; a failure
// there must not look like "0 SKR". The fallback RPC only serves non-indexed
// token calls, so it reads the wallet's associated token account directly.
const PRIMARY_RPC = 'https://api.mainnet-beta.solana.com';
const FALLBACK_RPC = 'https://solana-rpc.publicnode.com';

async function rpc(url: string, method: string, params: unknown[]): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${url} HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`RPC ${url}: ${json.error.message}`);
  return json.result;
}

async function balanceByOwner(owner: string): Promise<number> {
  const result = await rpc(PRIMARY_RPC, 'getTokenAccountsByOwner', [
    owner,
    { mint: SKR_MINT },
    { encoding: 'jsonParsed', commitment: 'confirmed' },
  ]);
  // A wallet can hold several token accounts for the same mint: add them all up.
  return (result?.value ?? []).reduce(
    (sum: number, a: any) => sum + Number(a.account?.data?.parsed?.info?.tokenAmount?.uiAmount ?? 0),
    0
  );
}

async function balanceByAta(owner: string): Promise<number> {
  const [ata] = PublicKey.findProgramAddressSync(
    [new PublicKey(owner).toBuffer(), TOKEN_PROGRAM.toBuffer(), new PublicKey(SKR_MINT).toBuffer()],
    ATA_PROGRAM
  );
  const result = await rpc(FALLBACK_RPC, 'getAccountInfo', [ata.toBase58(), { encoding: 'base64', commitment: 'confirmed' }]);
  // No account = the wallet never held SKR, which is a real 0.
  if (!result?.value) return 0;
  // SPL token account layout: u64 little-endian amount at offset 64.
  const raw = atob(result.value.data[0]);
  let amount = 0;
  for (let i = 7; i >= 0; i--) amount = amount * 256 + raw.charCodeAt(64 + i);
  return amount / 10 ** SKR_DECIMALS;
}

/**
 * Get SKR token balance (human-readable) for a base58 wallet address.
 * Returns 0 only when the chain says the wallet holds none; throws if no RPC
 * could be reached, so callers can show "unavailable" instead of a wrong 0.
 */
export async function getSkrBalance(walletAddress: string): Promise<number> {
  try {
    return await balanceByOwner(walletAddress);
  } catch (error) {
    console.warn('[SkrService] primary RPC failed, trying fallback:', error);
    return balanceByAta(walletAddress);
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

export const SKR_MINT_ADDRESS = SKR_MINT;
