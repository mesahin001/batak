/**
 * Mint budget. The server wallet pays for every cNFT mint (and the Merkle tree has
 * a fixed number of leaves), so automatic rewards are capped per player and per day,
 * and stop entirely when the wallet runs low.
 */

export interface MintLimits {
  maxPerPlayerPerDay: number;
  maxPerDay: number;
  minPayerLamports: number;
  /** Keep this many Merkle tree leaves unused (the tree has a fixed size). */
  minTreeLeavesLeft: number;
}

export interface MintLedger {
  countMintsSince(hours: number, playerPk?: string): number;
}

export type MintDenial = 'player_daily_limit' | 'daily_limit' | 'payer_low' | 'tree_full';

/**
 * Returns why a mint must be refused, or null when it may go ahead.
 * `payerLamports` and `treeLeavesLeft` are null when they could not be read; that is
 * treated as "unknown" and does not block (the DB limits still apply).
 */
export function evaluateMint(
  ledger: MintLedger,
  limits: MintLimits,
  playerPk: string,
  payerLamports: number | null,
  treeLeavesLeft: number | null = null
): MintDenial | null {
  if (treeLeavesLeft !== null && treeLeavesLeft <= limits.minTreeLeavesLeft) return 'tree_full';
  if (payerLamports !== null && payerLamports < limits.minPayerLamports) return 'payer_low';
  if (ledger.countMintsSince(24) >= limits.maxPerDay) return 'daily_limit';
  if (ledger.countMintsSince(24, playerPk) >= limits.maxPerPlayerPerDay) return 'player_daily_limit';
  return null;
}
