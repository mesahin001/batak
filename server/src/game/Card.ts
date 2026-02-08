/**
 * Kart yardımcı fonksiyonları.
 * Deste oluşturma, karıştırma, dağıtma ve kart karşılaştırma işlemleri.
 */

import { Suit, Rank, Card } from '../types/game.js';
export function createDeck(): Card[] {
  const deck: Card[] = [];
  const suits: Suit[] = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
  const ranks: Rank[] = [
    Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX,
    Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN,
    Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE
  ];

  let idCounter = 0;
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}-${idCounter++}`
      });
    }
  }

  return deck;
}

/**
 * Shuffle deck using Fisher-Yates algorithm
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deal cards to players (13 cards each for 4 players)
 */
export function dealCards(deck: Card[], playerCount: number = 4): Card[][] {
  const hands: Card[][] = Array.from({ length: playerCount }, () => []);

  for (let i = 0; i < deck.length; i++) {
    const playerIndex = i % playerCount;
    hands[playerIndex].push(deck[i]);
  }

  return hands;
}

/**
 * Compare two cards, returns winner based on suit and trump
 */
export function compareCards(
  card1: Card,
  card2: Card,
  leadSuit: Suit,
  trumpSuit: Suit | null
): Card {
  // If cards are the same, return first
  if (card1.id === card2.id) return card1;

  // If one card is trump and other isn't, trump wins
  const card1IsTrump = trumpSuit && card1.suit === trumpSuit;
  const card2IsTrump = trumpSuit && card2.suit === trumpSuit;

  if (card1IsTrump && !card2IsTrump) return card1;
  if (card2IsTrump && !card1IsTrump) return card2;

  // If both are trump, compare ranks
  if (card1IsTrump && card2IsTrump) {
    return card1.rank > card2.rank ? card1 : card2;
  }

  // If neither is trump
  // If one follows lead suit, it wins
  const card1IsLead = card1.suit === leadSuit;
  const card2IsLead = card2.suit === leadSuit;

  if (card1IsLead && !card2IsLead) return card1;
  if (card2IsLead && !card1IsLead) return card2;

  // If both follow lead suit (or neither does), compare ranks
  return card1.rank > card2.rank ? card1 : card2;
}

/**
 * Check if a card can be played based on current trick and hand
 */
export function canPlayCard(
  card: Card,
  hand: Card[],
  leadSuit: Suit | null
): boolean {
  // If no card has been led yet, any card can be played
  if (!leadSuit) return true;

  // Check if player has the lead suit
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);

  // If player has lead suit, must follow it
  if (hasLeadSuit) {
    return card.suit === leadSuit;
  }

  // If player doesn't have lead suit, can play any card
  return true;
}

/**
 * Get card display name
 */
export function getCardName(card: Card): string {
  const rankNames: Record<Rank, string> = {
    [Rank.TWO]: '2',
    [Rank.THREE]: '3',
    [Rank.FOUR]: '4',
    [Rank.FIVE]: '5',
    [Rank.SIX]: '6',
    [Rank.SEVEN]: '7',
    [Rank.EIGHT]: '8',
    [Rank.NINE]: '9',
    [Rank.TEN]: '10',
    [Rank.JACK]: 'J',
    [Rank.QUEEN]: 'Q',
    [Rank.KING]: 'K',
    [Rank.ACE]: 'A'
  };

  const suitSymbols: Record<Suit, string> = {
    [Suit.SPADES]: '♠',
    [Suit.HEARTS]: '♥',
    [Suit.DIAMONDS]: '♦',
    [Suit.CLUBS]: '♣',
    [Suit.NONE]: ''
  };

  return `${rankNames[card.rank]}${suitSymbols[card.suit]}`;
}

/**
 * Calculate card strength for bot AI
 * Returns a value 0-100 representing card strength
 */
export function getCardStrength(card: Card, trumpSuit: Suit | null): number {
  let strength = (card.rank - 7) * 10; // Base strength from rank (7=0, A=70)

  if (trumpSuit && card.suit === trumpSuit) {
    strength += 30; // Bonus for trump cards
  }

  return strength;
}
