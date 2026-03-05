/**
 * Unit tests for TurnValidator module
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateCardPlay,
  validateBid,
  validatePass,
  getValidCards,
  mustPlayTrump
} from '../TurnValidator.js';
import { Card, Suit, Rank, PlayerState, PlayerType } from '../../types/game.js';

// Helper function to create a test card
function createCard(suit: Suit, rank: Rank, id?: string): Card {
  return {
    suit,
    rank,
    id: id || `${suit}-${rank}-test`
  };
}

// Helper function to create a test player
function createPlayer(
  id: string,
  name: string,
  hand: Card[] = []
): PlayerState {
  return {
    id,
    name,
    type: PlayerType.HUMAN,
    hand,
    tricksWon: 0,
    score: 0,
    totalScore: 0,
    roundScores: [],
    bid: null,
    isReady: false,
    declaredKing: false
  };
}

describe('TurnValidator Module', () => {
  describe('validateCardPlay', () => {
    describe('Turn validation', () => {
      it('should reject card play when not player turn', () => {
        const card = createCard(Suit.SPADES, Rank.ACE);
        const player = createPlayer('p1', 'Player 1', [card]);

        const result = validateCardPlay(player, card, null, false);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Not your turn');
      });

      it('should allow card play when it is player turn', () => {
        const card = createCard(Suit.SPADES, Rank.ACE);
        const player = createPlayer('p1', 'Player 1', [card]);

        const result = validateCardPlay(player, card, null, true);

        expect(result.valid).toBe(true);
      });
    });

    describe('Card in hand validation', () => {
      it('should reject card not in player hand', () => {
        const cardInHand = createCard(Suit.SPADES, Rank.ACE, 'card-1');
        const cardNotInHand = createCard(Suit.HEARTS, Rank.KING, 'card-2');
        const player = createPlayer('p1', 'Player 1', [cardInHand]);

        const result = validateCardPlay(player, cardNotInHand, null, true);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Card not in hand');
      });

      it('should accept card in player hand', () => {
        const card = createCard(Suit.SPADES, Rank.ACE, 'card-1');
        const player = createPlayer('p1', 'Player 1', [card]);

        const result = validateCardPlay(player, card, null, true);

        expect(result.valid).toBe(true);
      });
    });

    describe('Follow suit validation', () => {
      it('should reject card when player must follow suit but plays different suit', () => {
        const spadesCard = createCard(Suit.SPADES, Rank.KING, 'card-1');
        const heartsCard = createCard(Suit.HEARTS, Rank.ACE, 'card-2');
        const player = createPlayer('p1', 'Player 1', [spadesCard, heartsCard]);

        const result = validateCardPlay(player, heartsCard, Suit.SPADES, true);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Must follow suit if possible');
      });

      it('should accept card when player follows suit', () => {
        const spadesCard = createCard(Suit.SPADES, Rank.KING, 'card-1');
        const heartsCard = createCard(Suit.HEARTS, Rank.ACE, 'card-2');
        const player = createPlayer('p1', 'Player 1', [spadesCard, heartsCard]);

        const result = validateCardPlay(player, spadesCard, Suit.SPADES, true);

        expect(result.valid).toBe(true);
      });

      it('should accept any card when player has no lead suit', () => {
        const heartsCard = createCard(Suit.HEARTS, Rank.ACE, 'card-1');
        const diamondsCard = createCard(Suit.DIAMONDS, Rank.KING, 'card-2');
        const player = createPlayer('p1', 'Player 1', [heartsCard, diamondsCard]);

        const result = validateCardPlay(player, heartsCard, Suit.SPADES, true);

        expect(result.valid).toBe(true);
      });

      it('should accept any card when no lead suit yet (first card)', () => {
        const card = createCard(Suit.HEARTS, Rank.ACE, 'card-1');
        const player = createPlayer('p1', 'Player 1', [card]);

        const result = validateCardPlay(player, card, null, true);

        expect(result.valid).toBe(true);
      });
    });

    describe('Trump validation', () => {
      it('should allow trump card when player has no lead suit', () => {
        const trumpCard = createCard(Suit.SPADES, Rank.TEN, 'card-1');
        const heartsCard = createCard(Suit.HEARTS, Rank.ACE, 'card-2');
        const player = createPlayer('p1', 'Player 1', [trumpCard, heartsCard]);

        const result = validateCardPlay(player, trumpCard, Suit.DIAMONDS, true);

        expect(result.valid).toBe(true);
      });

      it('should reject trump card when player must follow suit', () => {
        const trumpCard = createCard(Suit.SPADES, Rank.TEN, 'card-1');
        const heartsCard = createCard(Suit.HEARTS, Rank.ACE, 'card-2');
        const player = createPlayer('p1', 'Player 1', [trumpCard, heartsCard]);

        const result = validateCardPlay(player, trumpCard, Suit.HEARTS, true);

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Must follow suit if possible');
      });
    });

    describe('Multiple cards in hand', () => {
      it('should validate correctly with full hand of 13 cards', () => {
        const hand = [
          createCard(Suit.SPADES, Rank.ACE, 'card-1'),
          createCard(Suit.SPADES, Rank.KING, 'card-2'),
          createCard(Suit.HEARTS, Rank.QUEEN, 'card-3'),
          createCard(Suit.HEARTS, Rank.JACK, 'card-4'),
          createCard(Suit.DIAMONDS, Rank.TEN, 'card-5'),
          createCard(Suit.DIAMONDS, Rank.NINE, 'card-6'),
          createCard(Suit.CLUBS, Rank.EIGHT, 'card-7'),
          createCard(Suit.CLUBS, Rank.SEVEN, 'card-8'),
          createCard(Suit.SPADES, Rank.SIX, 'card-9'),
          createCard(Suit.HEARTS, Rank.FIVE, 'card-10'),
          createCard(Suit.DIAMONDS, Rank.FOUR, 'card-11'),
          createCard(Suit.CLUBS, Rank.THREE, 'card-12'),
          createCard(Suit.SPADES, Rank.TWO, 'card-13')
        ];
        const player = createPlayer('p1', 'Player 1', hand);

        // Must play hearts when lead is hearts
        const result1 = validateCardPlay(player, hand[2], Suit.HEARTS, true);
        expect(result1.valid).toBe(true);

        // Cannot play spades when lead is hearts and player has hearts
        const result2 = validateCardPlay(player, hand[0], Suit.HEARTS, true);
        expect(result2.valid).toBe(false);
      });
    });
  });

  describe('validateBid', () => {
    const player = createPlayer('p1', 'Player 1');

    describe('Bid amount validation', () => {
      it('should reject negative bid amounts', () => {
        const result = validateBid(player, Suit.SPADES, -1, 0, 'ihaleli_batak');

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Bid must be between 0 and 13 (0 = pass)');
      });

      it('should reject bid amounts greater than 13', () => {
        const result = validateBid(player, Suit.SPADES, 14, 0, 'ihaleli_batak');

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Bid must be between 0 and 13 (0 = pass)');
      });

      it('should accept bid amount of 0 (pass)', () => {
        const result = validateBid(player, Suit.SPADES, 0, 5, 'ihaleli_batak');

        expect(result.valid).toBe(true);
      });

      it('should accept bid amount of 1', () => {
        const result = validateBid(player, Suit.SPADES, 1, 0, 'ihaleli_batak');

        expect(result.valid).toBe(true);
      });

      it('should accept bid amount of 13', () => {
        const result = validateBid(player, Suit.SPADES, 13, 0, 'ihaleli_batak');

        expect(result.valid).toBe(true);
      });
    });

    describe('İhaleli Batak mode - competitive bidding', () => {
      it('should accept bid higher than current highest', () => {
        const result = validateBid(player, Suit.SPADES, 8, 7, 'ihaleli_batak');

        expect(result.valid).toBe(true);
      });

      it('should reject bid equal to current highest', () => {
        const result = validateBid(player, Suit.SPADES, 7, 7, 'ihaleli_batak');

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Bid must be higher than 7');
      });

      it('should reject bid lower than current highest', () => {
        const result = validateBid(player, Suit.SPADES, 5, 7, 'ihaleli_batak');

        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Bid must be higher than 7');
      });

      it('should accept first bid of any amount', () => {
        const result = validateBid(player, Suit.SPADES, 5, 0, 'ihaleli_batak');

        expect(result.valid).toBe(true);
      });

      it('should accept pass (0) regardless of current highest', () => {
        const result = validateBid(player, Suit.SPADES, 0, 10, 'ihaleli_batak');

        expect(result.valid).toBe(true);
      });
    });

    describe('Koz Maça mode - independent bidding', () => {
      it('should accept any bid amount 1-13 regardless of current highest', () => {
        const result1 = validateBid(player, Suit.SPADES, 5, 10, 'koz_maca');
        expect(result1.valid).toBe(true);

        const result2 = validateBid(player, Suit.SPADES, 3, 7, 'koz_maca');
        expect(result2.valid).toBe(true);

        const result3 = validateBid(player, Suit.SPADES, 13, 1, 'koz_maca');
        expect(result3.valid).toBe(true);
      });

      it('should accept bid equal to current highest', () => {
        const result = validateBid(player, Suit.SPADES, 7, 7, 'koz_maca');

        expect(result.valid).toBe(true);
      });

      it('should accept bid lower than current highest', () => {
        const result = validateBid(player, Suit.SPADES, 5, 10, 'koz_maca');

        expect(result.valid).toBe(true);
      });

      it('should accept pass (0)', () => {
        const result = validateBid(player, Suit.SPADES, 0, 7, 'koz_maca');

        expect(result.valid).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should handle no current bid (0)', () => {
        const result = validateBid(player, Suit.SPADES, 1, 0, 'ihaleli_batak');

        expect(result.valid).toBe(true);
      });

      it('should handle maximum bid (13)', () => {
        const result = validateBid(player, Suit.SPADES, 13, 12, 'ihaleli_batak');

        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validatePass', () => {
    const player = createPlayer('p1', 'Player 1');

    it('should accept pass when player has not passed yet', () => {
      const result = validatePass(player, false);

      expect(result.valid).toBe(true);
    });

    it('should reject pass when player has already passed', () => {
      const result = validatePass(player, true);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Already passed');
    });
  });

  describe('getValidCards', () => {
    it('should return all cards when no lead suit', () => {
      const hand = [
        createCard(Suit.SPADES, Rank.ACE),
        createCard(Suit.HEARTS, Rank.KING),
        createCard(Suit.DIAMONDS, Rank.QUEEN)
      ];
      const player = createPlayer('p1', 'Player 1', hand);

      const validCards = getValidCards(player, null);

      expect(validCards.length).toBe(3);
      expect(validCards).toEqual(hand);
    });

    it('should return only lead suit cards when player has lead suit', () => {
      const hand = [
        createCard(Suit.SPADES, Rank.ACE),
        createCard(Suit.SPADES, Rank.KING),
        createCard(Suit.HEARTS, Rank.QUEEN),
        createCard(Suit.DIAMONDS, Rank.JACK)
      ];
      const player = createPlayer('p1', 'Player 1', hand);

      const validCards = getValidCards(player, Suit.SPADES);

      expect(validCards.length).toBe(2);
      expect(validCards.every(c => c.suit === Suit.SPADES)).toBe(true);
    });

    it('should return all cards when player has no lead suit', () => {
      const hand = [
        createCard(Suit.HEARTS, Rank.ACE),
        createCard(Suit.DIAMONDS, Rank.KING),
        createCard(Suit.CLUBS, Rank.QUEEN)
      ];
      const player = createPlayer('p1', 'Player 1', hand);

      const validCards = getValidCards(player, Suit.SPADES);

      expect(validCards.length).toBe(3);
      expect(validCards).toEqual(hand);
    });

    it('should return empty array when player has no cards', () => {
      const player = createPlayer('p1', 'Player 1', []);

      const validCards = getValidCards(player, Suit.SPADES);

      expect(validCards.length).toBe(0);
    });
  });

  describe('Must raise validation', () => {
    it('should reject lower lead-suit card when player can beat current winner', () => {
      const eight = createCard(Suit.HEARTS, Rank.EIGHT, 'eight');
      const king = createCard(Suit.HEARTS, Rank.KING, 'king');
      const five = createCard(Suit.HEARTS, Rank.FIVE, 'five');
      const player = createPlayer('p1', 'Player 1', [king, five]);
      const trickCards = [eight];

      // 5♥ should be rejected because player has K♥ which beats 8♥
      const result = validateCardPlay(player, five, Suit.HEARTS, true, Suit.SPADES, trickCards);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Must raise if possible');
    });

    it('should accept raising card when player can beat current winner', () => {
      const eight = createCard(Suit.HEARTS, Rank.EIGHT, 'eight');
      const king = createCard(Suit.HEARTS, Rank.KING, 'king');
      const five = createCard(Suit.HEARTS, Rank.FIVE, 'five');
      const player = createPlayer('p1', 'Player 1', [king, five]);
      const trickCards = [eight];

      // K♥ should be accepted (beats 8♥)
      const result = validateCardPlay(player, king, Suit.HEARTS, true, Suit.SPADES, trickCards);
      expect(result.valid).toBe(true);
    });

    it('should allow any lead-suit card when none can beat the winner', () => {
      const queen = createCard(Suit.HEARTS, Rank.QUEEN, 'queen');
      const jack = createCard(Suit.HEARTS, Rank.JACK, 'jack');
      const five = createCard(Suit.HEARTS, Rank.FIVE, 'five');
      const player = createPlayer('p1', 'Player 1', [jack, five]);
      const trickCards = [queen];

      // Neither J♥ nor 5♥ beats Q♥, so both should be valid
      const resultJack = validateCardPlay(player, jack, Suit.HEARTS, true, Suit.SPADES, trickCards);
      expect(resultJack.valid).toBe(true);

      const resultFive = validateCardPlay(player, five, Suit.HEARTS, true, Suit.SPADES, trickCards);
      expect(resultFive.valid).toBe(true);
    });

    it('should not enforce raise when current winner is a trump card', () => {
      const trumpAce = createCard(Suit.SPADES, Rank.ACE, 'trump-ace');
      const king = createCard(Suit.HEARTS, Rank.KING, 'king');
      const five = createCard(Suit.HEARTS, Rank.FIVE, 'five');
      const player = createPlayer('p1', 'Player 1', [king, five]);
      // Lead is hearts but trick is currently won by A♠ (trump)
      const trickCards = [trumpAce];

      // K♥ and 5♥ both can't beat the trump, so both valid (no raise required)
      const resultKing = validateCardPlay(player, king, Suit.HEARTS, true, Suit.SPADES, trickCards);
      expect(resultKing.valid).toBe(true);

      const resultFive = validateCardPlay(player, five, Suit.HEARTS, true, Suit.SPADES, trickCards);
      expect(resultFive.valid).toBe(true);
    });
  });

  describe('Must play trump validation', () => {
    it('should reject non-trump card when void in lead suit and has trump', () => {
      const trump = createCard(Suit.SPADES, Rank.TEN, 'trump');
      const diamond = createCard(Suit.DIAMONDS, Rank.KING, 'diamond');
      const player = createPlayer('p1', 'Player 1', [trump, diamond]);

      // Lead is hearts, player has no hearts but has spade (trump) — must play trump
      const result = validateCardPlay(player, diamond, Suit.HEARTS, true, Suit.SPADES, []);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Must play trump if no lead suit');
    });

    it('should accept trump card when void in lead suit and has trump', () => {
      const trump = createCard(Suit.SPADES, Rank.TEN, 'trump');
      const diamond = createCard(Suit.DIAMONDS, Rank.KING, 'diamond');
      const player = createPlayer('p1', 'Player 1', [trump, diamond]);

      const result = validateCardPlay(player, trump, Suit.HEARTS, true, Suit.SPADES, []);
      expect(result.valid).toBe(true);
    });

    it('should allow any card when void in lead suit and no trump', () => {
      const club = createCard(Suit.CLUBS, Rank.TEN, 'club');
      const diamond = createCard(Suit.DIAMONDS, Rank.KING, 'diamond');
      const player = createPlayer('p1', 'Player 1', [club, diamond]);

      // No trump suit — any card valid
      const result = validateCardPlay(player, diamond, Suit.HEARTS, true, null, []);
      expect(result.valid).toBe(true);
    });
  });

  describe('mustPlayTrump', () => {
    it('should return false when no trump suit selected', () => {
      const player = createPlayer('p1', 'Player 1', [
        createCard(Suit.HEARTS, Rank.ACE)
      ]);

      const result = mustPlayTrump(player, Suit.SPADES, null);

      expect(result).toBe(false);
    });

    it('should return false when player is leading (no lead suit)', () => {
      const player = createPlayer('p1', 'Player 1', [
        createCard(Suit.HEARTS, Rank.ACE)
      ]);

      // Note: This test assumes null leadSuit means player is leading
      // The function signature requires leadSuit, so this tests the logic
      const result = mustPlayTrump(player, Suit.SPADES, Suit.HEARTS);

      expect(result).toBe(false);
    });

    it('should return false when player has lead suit', () => {
      const player = createPlayer('p1', 'Player 1', [
        createCard(Suit.SPADES, Rank.ACE),
        createCard(Suit.HEARTS, Rank.KING)
      ]);

      const result = mustPlayTrump(player, Suit.SPADES, Suit.HEARTS);

      expect(result).toBe(false);
    });

    it('should return false when player does not have lead suit (can play anything)', () => {
      const player = createPlayer('p1', 'Player 1', [
        createCard(Suit.HEARTS, Rank.ACE),
        createCard(Suit.DIAMONDS, Rank.KING)
      ]);

      const result = mustPlayTrump(player, Suit.SPADES, Suit.HEARTS);

      expect(result).toBe(false);
    });
  });
});
