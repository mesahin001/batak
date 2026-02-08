/**
 * Unit tests for Scoring module
 */

import { describe, it, expect } from '@jest/globals';
import {
  calculateScores,
  calculatePlayerScoreWithBid,
  checkGameWinner,
  getHighestScorer,
  getLowestScorer,
  checkKingWinner,
  calculateRankings,
  getHighestBidAmount
} from '../Scoring.js';
import { PlayerState, Bid, Suit, BidType, PlayerType } from '../../types/game.js';

// Helper function to create a test player
function createPlayer(
  id: string,
  name: string,
  tricksWon: number = 0,
  totalScore: number = 0,
  roundScores: number[] = [],
  bid: Bid | null = null,
  declaredKing: boolean = false
): PlayerState {
  return {
    id,
    name,
    type: PlayerType.HUMAN,
    hand: [],
    tricksWon,
    score: 0,
    totalScore,
    roundScores,
    bid,
    isReady: false,
    declaredKing
  };
}

describe('Scoring Module', () => {
  describe('calculatePlayerScoreWithBid', () => {
    describe('Successful bids', () => {
      it('should calculate score for bid exactly met (bid 7, take 7)', () => {
        const player = createPlayer('p1', 'Player 1', 7);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 7, type: BidType.NORMAL };
        const score = calculatePlayerScoreWithBid(player, bid, 'ihaleli_batak');
        expect(score).toBe(70); // 10 × 7 + 0 = 70
      });

      it('should calculate score for overbid (bid 7, take 9)', () => {
        const player = createPlayer('p1', 'Player 1', 9);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 7, type: BidType.NORMAL };
        const score = calculatePlayerScoreWithBid(player, bid, 'ihaleli_batak');
        expect(score).toBe(90); // İhaleli Batak: tricksWon × 10 = 9 × 10 = 90
      });

      it('should calculate score for bid 1 taken 1', () => {
        const player = createPlayer('p1', 'Player 1', 1);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 1, type: BidType.NORMAL };
        const score = calculatePlayerScoreWithBid(player, bid, 'ihaleli_batak');
        expect(score).toBe(10); // 10 × 1 + 0 = 10
      });

      it('should calculate score for bid 13 taken 13 (all tricks)', () => {
        const player = createPlayer('p1', 'Player 1', 13);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 13, type: BidType.NORMAL };
        const score = calculatePlayerScoreWithBid(player, bid, 'ihaleli_batak');
        expect(score).toBe(130); // 10 × 13 + 0 = 130
      });

      it('should calculate score for bid 5 taken 8', () => {
        const player = createPlayer('p1', 'Player 1', 8);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 5, type: BidType.NORMAL };
        const score = calculatePlayerScoreWithBid(player, bid, 'ihaleli_batak');
        expect(score).toBe(80); // İhaleli Batak: tricksWon × 10 = 8 × 10 = 80
      });
    });

    describe('Failed bids', () => {
      it('should calculate score for failed bid (bid 7, take 5)', () => {
        const player = createPlayer('p1', 'Player 1', 5);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 7, type: BidType.NORMAL };
        const score = calculatePlayerScoreWithBid(player, bid, 'ihaleli_batak');
        expect(score).toBe(-70); // -10 × 7 = -70
      });

      it('should calculate score for failed bid (bid 1, take 0)', () => {
        const player = createPlayer('p1', 'Player 1', 0);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 1, type: BidType.NORMAL };
        const score = calculatePlayerScoreWithBid(player, bid, 'ihaleli_batak');
        expect(score).toBe(-10); // -10 × 1 = -10
      });

      it('should calculate score for failed bid (bid 13, take 12)', () => {
        const player = createPlayer('p1', 'Player 1', 12);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 13, type: BidType.NORMAL };
        const score = calculatePlayerScoreWithBid(player, bid, 'ihaleli_batak');
        expect(score).toBe(-130); // -10 × 13 = -130
      });

      it('should calculate score for failed bid (bid 6, take 3)', () => {
        const player = createPlayer('p1', 'Player 1', 3);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 6, type: BidType.NORMAL };
        const score = calculatePlayerScoreWithBid(player, bid, 'ihaleli_batak');
        expect(score).toBe(-60); // -10 × 6 = -60
      });
    });

    describe('Non-bidders (passed)', () => {
      it('should calculate score for non-bidder with 3 tricks', () => {
        const player = createPlayer('p1', 'Player 1', 3);
        const score = calculatePlayerScoreWithBid(player, null, 'ihaleli_batak');
        expect(score).toBe(30); // 3 × 10 = 30
      });

      it('should calculate score for non-bidder with 0 tricks', () => {
        const player = createPlayer('p1', 'Player 1', 0);
        const score = calculatePlayerScoreWithBid(player, null, 'ihaleli_batak');
        expect(score).toBe(0); // 0 × 10 = 0
      });

      it('should calculate score for non-bidder with pass bid (amount: 0)', () => {
        const player = createPlayer('p1', 'Player 1', 5);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 0, type: BidType.NORMAL };
        const score = calculatePlayerScoreWithBid(player, bid, 'ihaleli_batak');
        expect(score).toBe(50); // 5 × 10 = 50
      });

      it('should calculate score for non-bidder with 1 trick', () => {
        const player = createPlayer('p1', 'Player 1', 1);
        const score = calculatePlayerScoreWithBid(player, null, 'ihaleli_batak');
        expect(score).toBe(10); // 1 × 10 = 10
      });

      it('should calculate score for non-bidder with 7 tricks', () => {
        const player = createPlayer('p1', 'Player 1', 7);
        const score = calculatePlayerScoreWithBid(player, null, 'ihaleli_batak');
        expect(score).toBe(70); // 7 × 10 = 70
      });
    });

    describe('El almaz (no tricks bid)', () => {
      it('should calculate +50 for successful el almaz (bid 0, take 0)', () => {
        const player = createPlayer('p1', 'Player 1', 0);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 0, type: BidType.EL_ALMAZ };
        const score = calculatePlayerScoreWithBid(player, bid, 'koz_maca');
        expect(score).toBe(50);
      });

      it('should calculate -50 for failed el almaz (bid 0, take 1)', () => {
        const player = createPlayer('p1', 'Player 1', 1);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 0, type: BidType.EL_ALMAZ };
        const score = calculatePlayerScoreWithBid(player, bid, 'koz_maca');
        expect(score).toBe(-50);
      });

      it('should calculate -50 for failed el almaz (bid 0, take 5)', () => {
        const player = createPlayer('p1', 'Player 1', 5);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 0, type: BidType.EL_ALMAZ };
        const score = calculatePlayerScoreWithBid(player, bid, 'koz_maca');
        expect(score).toBe(-50);
      });
    });

    describe('Game mode handling', () => {
      it('should calculate same scores for koz_maca mode (bid 5, take 5)', () => {
        const player = createPlayer('p1', 'Player 1', 5);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 5, type: BidType.NORMAL };
        const score = calculatePlayerScoreWithBid(player, bid, 'koz_maca');
        expect(score).toBe(50); // Same formula: 10 × 5 + 0 = 50
      });

      it('should calculate same scores for koz_maca mode (bid 7, take 9)', () => {
        const player = createPlayer('p1', 'Player 1', 9);
        const bid: Bid = { playerId: 'p1', suit: Suit.SPADES, amount: 7, type: BidType.NORMAL };
        const score = calculatePlayerScoreWithBid(player, bid, 'koz_maca');
        expect(score).toBe(72); // Same formula: 10 × 7 + 2 = 72
      });
    });
  });

  describe('calculateScores', () => {
    it('should calculate scores for all players in a round', () => {
      const players = [
        createPlayer('p1', 'Player 1', 7, 0, []),
        createPlayer('p2', 'Player 2', 3, 0, []),
        createPlayer('p3', 'Player 3', 2, 0, []),
        createPlayer('p4', 'Player 4', 1, 0, [])
      ];

      const bids: Bid[] = [
        { playerId: 'p1', suit: Suit.SPADES, amount: 7, type: BidType.NORMAL },
        { playerId: 'p2', suit: Suit.SPADES, amount: 0, type: BidType.NORMAL },
        { playerId: 'p3', suit: Suit.SPADES, amount: 0, type: BidType.NORMAL },
        { playerId: 'p4', suit: Suit.SPADES, amount: 0, type: BidType.NORMAL }
      ];

      const result = calculateScores(players, Suit.SPADES, bids, 'ihaleli_batak');

      expect(result[0].score).toBe(70); // Bid 7, take 7 = 70
      expect(result[0].totalScore).toBe(70);
      expect(result[0].roundScores).toEqual([70]);

      expect(result[1].score).toBe(30); // Non-bidder, 3 tricks = 30
      expect(result[1].totalScore).toBe(30);

      expect(result[2].score).toBe(20); // Non-bidder, 2 tricks = 20
      expect(result[3].score).toBe(10); // Non-bidder, 1 trick = 10
    });

    it('should accumulate total scores across multiple rounds', () => {
      const players = [
        createPlayer('p1', 'Player 1', 5, 50, [50]),
        createPlayer('p2', 'Player 2', 8, 30, [30])
      ];

      const bids: Bid[] = [
        { playerId: 'p1', suit: Suit.SPADES, amount: 5, type: BidType.NORMAL },
        { playerId: 'p2', suit: Suit.SPADES, amount: 0, type: BidType.NORMAL }
      ];

      const result = calculateScores(players, Suit.SPADES, bids, 'ihaleli_batak');

      expect(result[0].totalScore).toBe(100); // 50 + 50 = 100
      expect(result[0].roundScores).toEqual([50, 50]);

      expect(result[1].totalScore).toBe(110); // 30 + 80 = 110
      expect(result[1].roundScores).toEqual([30, 80]);
    });
  });

  describe('checkGameWinner', () => {
    it('should return null for ihaleli_batak (no early ending)', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, 1),
        createPlayer('p2', 'Player 2', 0, 50),
        createPlayer('p3', 'Player 3', 0, 75),
        createPlayer('p4', 'Player 4', 0, 100)
      ];

      const winner = checkGameWinner(players, 'ihaleli_batak');
      expect(winner).toBeNull();
    });

    it('should return null even when player has 0 score in ihaleli_batak', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, 45),
        createPlayer('p2', 'Player 2', 0, 0),
        createPlayer('p3', 'Player 3', 0, 30)
      ];

      const winner = checkGameWinner(players, 'ihaleli_batak');
      expect(winner).toBeNull();
    });

    it('should return null when no player has reached ≤1 in ihaleli_batak', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, 10),
        createPlayer('p2', 'Player 2', 0, 20),
        createPlayer('p3', 'Player 3', 0, 30)
      ];

      const winner = checkGameWinner(players, 'ihaleli_batak');
      expect(winner).toBeNull();
    });

    it('should always return null for koz_maca (no early ending)', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, 0),
        createPlayer('p2', 'Player 2', 0, -10),
        createPlayer('p3', 'Player 3', 0, 50)
      ];

      const winner = checkGameWinner(players, 'koz_maca');
      expect(winner).toBeNull();
    });

    it('should return null regardless of low scores (no early ending in ihaleli_batak)', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, 10),
        createPlayer('p2', 'Player 2', 0, 1),
        createPlayer('p3', 'Player 3', 0, -5)
      ];

      const winner = checkGameWinner(players, 'ihaleli_batak');
      expect(winner).toBeNull();
    });
  });

  describe('getHighestScorer', () => {
    it('should return player with highest total score', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, 50),
        createPlayer('p2', 'Player 2', 0, 100),
        createPlayer('p3', 'Player 3', 0, 75)
      ];

      const highest = getHighestScorer(players);
      expect(highest?.id).toBe('p2');
      expect(highest?.totalScore).toBe(100);
    });

    it('should return first player when multiple have same highest score', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, 100),
        createPlayer('p2', 'Player 2', 0, 100),
        createPlayer('p3', 'Player 3', 0, 50)
      ];

      const highest = getHighestScorer(players);
      expect(highest?.id).toBe('p1');
    });

    it('should return null for empty array', () => {
      const highest = getHighestScorer([]);
      expect(highest).toBeNull();
    });

    it('should handle negative scores', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, -30),
        createPlayer('p2', 'Player 2', 0, -10),
        createPlayer('p3', 'Player 3', 0, -50)
      ];

      const highest = getHighestScorer(players);
      expect(highest?.id).toBe('p2');
      expect(highest?.totalScore).toBe(-10);
    });
  });

  describe('getLowestScorer', () => {
    it('should return player with lowest total score', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, 50),
        createPlayer('p2', 'Player 2', 0, 10),
        createPlayer('p3', 'Player 3', 0, 75)
      ];

      const lowest = getLowestScorer(players);
      expect(lowest?.id).toBe('p2');
      expect(lowest?.totalScore).toBe(10);
    });

    it('should return first player when multiple have same lowest score', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, 10),
        createPlayer('p2', 'Player 2', 0, 10),
        createPlayer('p3', 'Player 3', 0, 50)
      ];

      const lowest = getLowestScorer(players);
      expect(lowest?.id).toBe('p1');
    });

    it('should return null for empty array', () => {
      const lowest = getLowestScorer([]);
      expect(lowest).toBeNull();
    });

    it('should handle negative scores', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, -10),
        createPlayer('p2', 'Player 2', 0, 20),
        createPlayer('p3', 'Player 3', 0, -50)
      ];

      const lowest = getLowestScorer(players);
      expect(lowest?.id).toBe('p3');
      expect(lowest?.totalScore).toBe(-50);
    });
  });

  describe('checkKingWinner', () => {
    it('should return true when player declared king and won all 13 tricks', () => {
      const player = createPlayer('p1', 'Player 1', 13, 0, [], null, true);
      expect(checkKingWinner(player)).toBe(true);
    });

    it('should return false when player declared king but did not win all tricks', () => {
      const player = createPlayer('p1', 'Player 1', 12, 0, [], null, true);
      expect(checkKingWinner(player)).toBe(false);
    });

    it('should return false when player won all tricks but did not declare king', () => {
      const player = createPlayer('p1', 'Player 1', 13, 0, [], null, false);
      expect(checkKingWinner(player)).toBe(false);
    });

    it('should return false when player declared king but won 0 tricks', () => {
      const player = createPlayer('p1', 'Player 1', 0, 0, [], null, true);
      expect(checkKingWinner(player)).toBe(false);
    });
  });

  describe('getHighestBidAmount', () => {
    it('should return highest bid amount excluding passes', () => {
      const bids: Bid[] = [
        { playerId: 'p1', suit: Suit.SPADES, amount: 7, type: BidType.NORMAL },
        { playerId: 'p2', suit: Suit.SPADES, amount: 0, type: BidType.NORMAL },
        { playerId: 'p3', suit: Suit.SPADES, amount: 5, type: BidType.NORMAL },
        { playerId: 'p4', suit: Suit.SPADES, amount: 0, type: BidType.NORMAL }
      ];

      expect(getHighestBidAmount(bids)).toBe(7);
    });

    it('should return 0 when all players passed', () => {
      const bids: Bid[] = [
        { playerId: 'p1', suit: Suit.SPADES, amount: 0, type: BidType.NORMAL },
        { playerId: 'p2', suit: Suit.SPADES, amount: 0, type: BidType.NORMAL },
        { playerId: 'p3', suit: Suit.SPADES, amount: 0, type: BidType.NORMAL }
      ];

      expect(getHighestBidAmount(bids)).toBe(0);
    });

    it('should return 0 for empty bids array', () => {
      expect(getHighestBidAmount([])).toBe(0);
    });

    it('should handle single bid', () => {
      const bids: Bid[] = [
        { playerId: 'p1', suit: Suit.SPADES, amount: 13, type: BidType.NORMAL }
      ];

      expect(getHighestBidAmount(bids)).toBe(13);
    });
  });

  describe('calculateRankings', () => {
    it('should rank players by lowest score first', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, 100),
        createPlayer('p2', 'Player 2', 0, 10),
        createPlayer('p3', 'Player 3', 0, 50),
        createPlayer('p4', 'Player 4', 0, 75)
      ];

      const rankings = calculateRankings(players);

      expect(rankings[0]).toEqual({ playerId: 'p2', playerName: 'Player 2', rank: 1, score: 10 });
      expect(rankings[1]).toEqual({ playerId: 'p3', playerName: 'Player 3', rank: 2, score: 50 });
      expect(rankings[2]).toEqual({ playerId: 'p4', playerName: 'Player 4', rank: 3, score: 75 });
      expect(rankings[3]).toEqual({ playerId: 'p1', playerName: 'Player 1', rank: 4, score: 100 });
    });

    it('should handle negative scores', () => {
      const players = [
        createPlayer('p1', 'Player 1', 0, 10),
        createPlayer('p2', 'Player 2', 0, -20)
      ];

      const rankings = calculateRankings(players);

      expect(rankings[0].playerId).toBe('p2');
      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].playerId).toBe('p1');
      expect(rankings[1].rank).toBe(2);
    });

    it('should return empty array for no players', () => {
      const rankings = calculateRankings([]);
      expect(rankings).toEqual([]);
    });
  });
});
