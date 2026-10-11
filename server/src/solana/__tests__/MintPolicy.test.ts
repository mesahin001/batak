import { evaluateMint, MintLimits } from '../MintPolicy';

const limits: MintLimits = { maxPerPlayerPerDay: 3, maxPerDay: 10, minPayerLamports: 20_000_000, minTreeLeavesLeft: 3 };

const ledger = (total: number, perPlayer: number) => ({
  countMintsSince: (_h: number, pk?: string) => (pk ? perPlayer : total),
});

describe('mint budget', () => {
  it('allows a mint under every limit', () => {
    expect(evaluateMint(ledger(5, 1), limits, 'pk', 60_000_000)).toBeNull();
  });

  it('refuses a player who reached the per-player daily cap', () => {
    expect(evaluateMint(ledger(5, 3), limits, 'pk', 60_000_000)).toBe('player_daily_limit');
  });

  it('refuses everyone once the global daily cap is reached', () => {
    expect(evaluateMint(ledger(10, 0), limits, 'pk', 60_000_000)).toBe('daily_limit');
  });

  it('refuses when the server wallet is below the reserve, before any other check', () => {
    expect(evaluateMint(ledger(0, 0), limits, 'pk', 19_999_999)).toBe('payer_low');
    expect(evaluateMint(ledger(0, 0), limits, 'pk', 20_000_000)).toBeNull();
  });

  it('does not block on an unreadable balance but still applies the DB limits', () => {
    expect(evaluateMint(ledger(0, 0), limits, 'pk', null)).toBeNull();
    expect(evaluateMint(ledger(10, 0), limits, 'pk', null)).toBe('daily_limit');
  });

  it('refuses when only the reserved Merkle tree leaves remain', () => {
    expect(evaluateMint(ledger(0, 0), limits, 'pk', 60_000_000, 3)).toBe('tree_full');
    expect(evaluateMint(ledger(0, 0), limits, 'pk', 60_000_000, 4)).toBeNull();
    expect(evaluateMint(ledger(0, 0), limits, 'pk', 60_000_000, null)).toBeNull();
  });
});
