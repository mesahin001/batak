/**
 * Kart destesi sınıfı.
 * 52 kartlık desteyi yönetir: oluşturma, karıştırma ve dağıtma.
 */

import { Card } from '../types/game.js';
import { createDeck, shuffleDeck, dealCards } from './Card.js';
export class Deck {
  private cards: Card[];

  constructor() {
    this.cards = [];
  }

  /**
   * Initialize and shuffle a new deck
   */
  initialize(): void {
    this.cards = shuffleDeck(createDeck());
  }

  /**
   * Deal cards to specified number of players
   */
  deal(playerCount: number = 4): Card[][] {
    return dealCards(this.cards, playerCount);
  }

  /**
   * Get remaining cards in deck
   */
  getCards(): Card[] {
    return [...this.cards];
  }

  /**
   * Get card count
   */
  getCardCount(): number {
    return this.cards.length;
  }

  /**
   * Draw a card from deck
   */
  draw(): Card | null {
    return this.cards.pop() || null;
  }

  /**
   * Check if deck is empty
   */
  isEmpty(): boolean {
    return this.cards.length === 0;
  }
}
