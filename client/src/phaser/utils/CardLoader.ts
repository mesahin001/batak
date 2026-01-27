/**
 * Kart yükleme yardımcıları.
 * Kart görselleri için texture key'leri ve deste oluşturma.
 */

import { Card as CardType } from '../../types/game';
export class CardLoader {
  /**
   * Create card deck
   */
  static createDeck(): CardType[] {
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
    const ranks = [7, 8, 9, 10, 11, 12, 13, 14] as const;

    const deck: CardType[] = [];
    let id = 0;

    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          suit,
          rank,
          id: `${suit}-${rank}-${id++}`
        });
      }
    }

    return deck;
  }

  /**
   * Shuffle deck
   */
  static shuffle(deck: CardType[]): CardType[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Deal cards to players
   */
  static deal(deck: CardType[], playerCount: number = 4): CardType[][] {
    const hands: CardType[][] = Array.from({ length: playerCount }, () => []);

    deck.forEach((card, index) => {
      hands[index % playerCount].push(card);
    });

    return hands;
  }

  /**
   * Sort hand by suit and rank
   */
  static sortHand(hand: CardType[]): CardType[] {
    const suitOrder = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };

    return [...hand].sort((a, b) => {
      const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
      if (suitDiff !== 0) return suitDiff;
      return b.rank - a.rank; // Descending by rank
    });
  }

  /**
   * Get card display name
   */
  static getCardName(card: CardType): string {
    const rankNames: Record<number, string> = {
      7: '7', 8: '8', 9: '9', 10: '10',
      11: 'J', 12: 'Q', 13: 'K', 14: 'A'
    };

    const suitSymbols = {
      spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣'
    };

    return `${rankNames[card.rank]}${suitSymbols[card.suit]}`;
  }

  /**
   * Check if cards are equal
   */
  static cardsEqual(a: CardType, b: CardType): boolean {
    return a.suit === b.suit && a.rank === b.rank;
  }

  /**
   * Clone card
   */
  static cloneCard(card: CardType): CardType {
    return { ...card };
  }

  /**
   * Clone hand
   */
  static cloneHand(hand: CardType[]): CardType[] {
    return hand.map(card => this.cloneCard(card));
  }
}
