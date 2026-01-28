/**
 * Unit tests for Card module
 */

import { describe, it, expect } from '@jest/globals';
import { createDeck, shuffleDeck, dealCards, canPlayCard, compareCards } from '../Card.js';
import { Suit, Rank } from '../../types/game.js';

describe('Card Module', () => {
  describe('createDeck', () => {
    it('should create exactly 52 cards', () => {
      const deck = createDeck();
      expect(deck.length).toBe(52);
    });

    it('should have 13 cards per suit', () => {
      const deck = createDeck();
      const spades = deck.filter(c => c.suit === Suit.SPADES);
      const hearts = deck.filter(c => c.suit === Suit.HEARTS);
      const diamonds = deck.filter(c => c.suit === Suit.DIAMONDS);
      const clubs = deck.filter(c => c.suit === Suit.CLUBS);

      expect(spades.length).toBe(13);
      expect(hearts.length).toBe(13);
      expect(diamonds.length).toBe(13);
      expect(clubs.length).toBe(13);
    });

    it('should have all ranks from 2 to Ace', () => {
      const deck = createDeck();
      const expectedRanks = [
        Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX,
        Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN,
        Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE
      ];

      const spadesRanks = deck
        .filter(c => c.suit === Suit.SPADES)
        .map(c => c.rank)
        .sort((a, b) => a - b);

      expect(spadesRanks).toEqual(expectedRanks);
    });

    it('should have unique IDs for each card', () => {
      const deck = createDeck();
      const ids = deck.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(52);
    });
  });

  describe('dealCards', () => {
    it('should deal 13 cards to each of 4 players', () => {
      const deck = createDeck();
      const hands = dealCards(deck, 4);

      expect(hands.length).toBe(4);
      expect(hands[0].length).toBe(13);
      expect(hands[1].length).toBe(13);
      expect(hands[2].length).toBe(13);
      expect(hands[3].length).toBe(13);
    });

    it('should distribute all 52 cards', () => {
      const deck = createDeck();
      const hands = dealCards(deck, 4);

      const totalCards = hands.reduce((sum, hand) => sum + hand.length, 0);
      expect(totalCards).toBe(52);
    });

    it('should not duplicate any cards', () => {
      const deck = createDeck();
      const hands = dealCards(deck, 4);

      const allDealtCards = hands.flat();
      const ids = allDealtCards.map(c => c.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(52);
    });
  });

  describe('shuffleDeck', () => {
    it('should return same number of cards', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck);

      expect(shuffled.length).toBe(52);
    });

    it('should not lose or duplicate cards', () => {
      const deck = createDeck();
      const shuffled = shuffleDeck(deck);

      const originalIds = deck.map(c => c.id).sort();
      const shuffledIds = shuffled.map(c => c.id).sort();

      expect(shuffledIds).toEqual(originalIds);
    });
  });
});
