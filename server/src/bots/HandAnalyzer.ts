/**
 * El analizi.
 * Bot kararları için el gücü, garanti trikler ve boş renkleri hesaplar.
 */

import { Card, Suit } from '../types/game.js';
import { getCardStrength } from '../game/Card.js';
export interface HandAnalysis {
  totalStrength: number;
  suitStrength: Record<Suit, number>;
  highCards: number; // Aces and Kings
  trumpSuit: Suit | null;
  guaranteedTricks: number;
  possibleTricks: number;
  voidSuits: Suit[];
}

/**
 * Analyze a player's hand for bidding strategy
 */
export function analyzeHand(hand: Card[], trumpSuit: Suit | null = null): HandAnalysis {
  const suitStrength: Record<Suit, number> = {
    [Suit.SPADES]: 0,
    [Suit.HEARTS]: 0,
    [Suit.DIAMONDS]: 0,
    [Suit.CLUBS]: 0,
    [Suit.NONE]: 0
  };

  let totalStrength = 0;
  let highCards = 0;
  let guaranteedTricks = 0;

  // Count cards in each suit and calculate strengths
  const suitCounts: Record<Suit, number> = {
    [Suit.SPADES]: 0,
    [Suit.HEARTS]: 0,
    [Suit.DIAMONDS]: 0,
    [Suit.CLUBS]: 0,
    [Suit.NONE]: 0
  };

  for (const card of hand) {
    suitCounts[card.suit]++;
    const strength = getCardStrength(card, trumpSuit);
    suitStrength[card.suit] += strength;
    totalStrength += strength;

    // Count high cards
    if (card.rank >= 13) {
      highCards++;
    }

    // Count guaranteed tricks (aces)
    if (card.rank === 14) {
      guaranteedTricks++;
    }
  }

  // Find void suits (no cards in suit)
  const voidSuits: Suit[] = [];
  for (const suit of [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS]) {
    if (suitCounts[suit] === 0) {
      voidSuits.push(suit);
    }
  }

  // Estimate possible tricks
  let possibleTricks = guaranteedTricks;

  // Add potential for kings (80% chance)
  const kings = hand.filter(c => c.rank === 13).length;
  possibleTricks += Math.floor(kings * 0.8);

  // Bonus for long suits (can draw out trumps)
  for (const suit of [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS]) {
    if (suitCounts[suit] >= 5) {
      possibleTricks += 1;
    }
  }

  // Bonus for void suits (can trump)
  possibleTricks += voidSuits.length * 0.5;

  return {
    totalStrength,
    suitStrength,
    highCards,
    trumpSuit,
    guaranteedTricks,
    possibleTricks: Math.min(13, Math.floor(possibleTricks)),
    voidSuits
  };
}

/**
 * Find best trump suit based on hand
 */
export function findBestTrumpSuit(hand: Card[]): Suit {
  const suitCounts: Record<Suit, number> = {
    [Suit.SPADES]: 0,
    [Suit.HEARTS]: 0,
    [Suit.DIAMONDS]: 0,
    [Suit.CLUBS]: 0,
    [Suit.NONE]: 0
  };

  const suitStrength: Record<Suit, number> = {
    [Suit.SPADES]: 0,
    [Suit.HEARTS]: 0,
    [Suit.DIAMONDS]: 0,
    [Suit.CLUBS]: 0,
    [Suit.NONE]: 0
  };

  for (const card of hand) {
    suitCounts[card.suit]++;
    suitStrength[card.suit] += card.rank;
  }

  // Find suit with most cards and highest strength
  let bestSuit = Suit.SPADES;
  let bestScore = -1;

  for (const suit of [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS]) {
    // Score: count * 10 + strength
    const score = suitCounts[suit] * 10 + suitStrength[suit];
    if (score > bestScore) {
      bestScore = score;
      bestSuit = suit;
    }
  }

  return bestSuit;
}

/**
 * Check if should bid or pass
 */
export function shouldBid(
  _hand: Card[],
  currentHighestBid: number,
  analysis: HandAnalysis
): boolean {
  // Always bid if have strong hand
  if (analysis.possibleTricks > currentHighestBid) {
    return true;
  }

  // Bid if analysis shows good potential
  if (analysis.highCards >= 3 && currentHighestBid < 6) {
    return true;
  }

  // Pass if can't make bid
  if (analysis.possibleTricks <= currentHighestBid) {
    return true; // Actually pass, but function returns true to make a decision
  }

  return false;
}

/**
 * Determine bid amount
 */
export function determineBidAmount(
  analysis: HandAnalysis,
  currentHighestBid: number
): number {
  // Bid at least 1 more than current highest
  const minBid = currentHighestBid + 1;

  // Conservative bid based on analysis
  const conservativeBid = Math.floor(analysis.possibleTricks);

  // Don't overbid
  if (conservativeBid < minBid) {
    return 0; // Pass
  }

  // Bid somewhere between min and conservative
  return Math.max(minBid, conservativeBid);
}

/**
 * Sort hand by suit and rank
 */
export function sortHand(hand: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = { [Suit.SPADES]: 0, [Suit.HEARTS]: 1, [Suit.DIAMONDS]: 2, [Suit.CLUBS]: 3, [Suit.NONE]: 4 };

  return [...hand].sort((a, b) => {
    const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return b.rank - a.rank; // Descending by rank
  });
}
