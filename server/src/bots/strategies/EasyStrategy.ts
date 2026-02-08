/**
 * Kolay bot stratejisi.
 * Rastgele geçerli hamle yapar, genelde pas geçer veya düşük ihale verir.
 */

import { Card, Suit, PlayerState } from '../../types/game.js';
import { analyzeHand } from '../HandAnalyzer.js';
export class EasyStrategy {
  /**
   * Decide bid for easy bot
   */
  decideBid(
    player: PlayerState,
    currentHighestBid: number,
    _allowedSuits: Suit[],
    gameMode: 'koz_maca' | 'ihaleli_batak' = 'ihaleli_batak'
  ): { suit: Suit; amount: number } | null {
    const analysis = analyzeHand(player.hand);

    // 50% chance to pass randomly
    if (Math.random() > 0.5) {
      return null;
    }

    // Koz Maça: Independent bidding (can bid 1-13)
    if (gameMode === 'koz_maca') {
      if (analysis.possibleTricks < 1) {
        return null;
      }
      return {
        suit: Suit.SPADES,
        amount: Math.max(1, Math.floor(analysis.possibleTricks))
      };
    }

    // İhaleli Batak: Competitive bidding
    const minBid = currentHighestBid + 1;
    if (analysis.possibleTricks < minBid) {
      return null;
    }

    return {
      suit: Suit.SPADES,
      amount: minBid
    };
  }

  /**
   * Decide which card to play (random valid card)
   */
  decideCard(
    player: PlayerState,
    leadSuit: Suit | null,
    _trumpSuit: Suit | null,
    _currentTrick: Card[]
  ): Card {
    // Get valid cards
    const validCards = this.getValidCards(player, leadSuit);

    // Return random valid card
    return validCards[Math.floor(Math.random() * validCards.length)];
  }

  /**
   * Get valid cards for play
   */
  private getValidCards(player: PlayerState, leadSuit: Suit | null): Card[] {
    if (!leadSuit) {
      return [...player.hand];
    }

    // Check if player has lead suit
    const hasLeadSuit = player.hand.some(c => c.suit === leadSuit);

    if (hasLeadSuit) {
      return player.hand.filter(c => c.suit === leadSuit);
    }

    return [...player.hand];
  }

  /**
   * Get strategy name
   */
  getName(): string {
    return 'Easy';
  }
}
