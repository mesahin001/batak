/**
 * Normal bot stratejisi.
 * El analizine göre ihale yapar, temel Batak stratejisini izler.
 */

import { Card, Suit, PlayerState } from '../../types/game.js';
import { analyzeHand, findBestTrumpSuit, determineBidAmount } from '../HandAnalyzer.js';
export class NormalStrategy {
  private playerIndex: number;

  constructor(playerIndex: number) {
    this.playerIndex = playerIndex;
  }

  /**
   * Decide bid for normal bot
   */
  decideBid(
    player: PlayerState,
    currentHighestBid: number,
    allowedSuits: Suit[],
    gameMode: 'koz_maca' | 'ihaleli_batak' = 'ihaleli_batak'
  ): { suit: Suit; amount: number } | null {
    const analysis = analyzeHand(player.hand);

    // Koz Maça: Independent bidding (can bid 1-13)
    if (gameMode === 'koz_maca') {
      const conservativeBid = Math.floor(analysis.possibleTricks);
      if (conservativeBid < 1) {
        return null; // Pass if very weak
      }
      return {
        suit: Suit.SPADES,
        amount: Math.max(1, Math.min(conservativeBid, 13))
      };
    }

    // İhaleli Batak: Competitive bidding
    const minBid = currentHighestBid + 1;
    const conservativeBid = Math.floor(analysis.possibleTricks);

    // Pass if hand is weak
    if (conservativeBid < minBid) {
      return null;
    }

    return {
      suit: Suit.SPADES,
      amount: Math.max(minBid, Math.min(conservativeBid, 13))
    };
  }

  /**
   * Decide which card to play
   */
  decideCard(
    player: PlayerState,
    leadSuit: Suit | null,
    trumpSuit: Suit | null,
    currentTrick: Card[]
  ): Card {
    const validCards = this.getValidCards(player, leadSuit);

    // Leading
    if (!leadSuit || currentTrick.length === 0) {
      return this.chooseLeadCard(player, validCards, trumpSuit);
    }

    // Following
    return this.chooseFollowCard(player, validCards, leadSuit, trumpSuit, currentTrick);
  }

  /**
   * Choose card to lead with
   */
  private chooseLeadCard(player: PlayerState, validCards: Card[], trumpSuit: Suit | null): Card {
    // Lead with high cards from strong suits
    // Sort by rank descending
    const sorted = [...validCards].sort((a, b) => b.rank - a.rank);

    // Prefer non-trump suits for leading
    const nonTrumps = sorted.filter(c => c.suit !== trumpSuit);
    if (nonTrumps.length > 0) {
      return nonTrumps[0];
    }

    return sorted[0];
  }

  /**
   * Choose card when following
   */
  private chooseFollowCard(
    player: PlayerState,
    validCards: Card[],
    leadSuit: Suit,
    trumpSuit: Suit | null,
    currentTrick: Card[]
  ): Card {
    // Check if current trick has been trumped
    const hasTrump = currentTrick.some(c => trumpSuit && c.suit === trumpSuit);
    const partnerIndex = (this.getPlayerIndex(player) + 2) % 4;

    // Try to win if possible with lowest winning card
    const winningCards = this.getWinningCards(validCards, leadSuit, trumpSuit, currentTrick);

    if (winningCards.length > 0) {
      // Play lowest winning card
      return winningCards[0];
    }

    // Can't win - dump lowest card
    const sorted = [...validCards].sort((a, b) => a.rank - b.rank);
    return sorted[0];
  }

  /**
   * Get cards that would win current trick
   */
  private getWinningCards(
    validCards: Card[],
    leadSuit: Suit,
    trumpSuit: Suit | null,
    currentTrick: Card[]
  ): Card[] {
    const winningCards: Card[] = [];

    // Find current highest card in trick
    let currentWinner: Card | null = null;
    for (const card of currentTrick) {
      if (!currentWinner || this.beats(card, currentWinner, leadSuit, trumpSuit)) {
        currentWinner = card;
      }
    }

    // Find cards that would beat current winner
    for (const card of validCards) {
      if (!currentWinner || this.beats(card, currentWinner, leadSuit, trumpSuit)) {
        winningCards.push(card);
      }
    }

    return winningCards.sort((a, b) => a.rank - b.rank);
  }

  /**
   * Check if card1 beats card2
   */
  private beats(card1: Card, card2: Card, leadSuit: Suit, trumpSuit: Suit | null): boolean {
    const card1IsTrump = trumpSuit && card1.suit === trumpSuit;
    const card2IsTrump = trumpSuit && card2.suit === trumpSuit;

    if (card1IsTrump && !card2IsTrump) return true;
    if (card2IsTrump && !card1IsTrump) return false;

    const card1IsLead = card1.suit === leadSuit;
    const card2IsLead = card2.suit === leadSuit;

    if (card1IsLead && !card2IsLead) return true;
    if (card2IsLead && !card1IsLead) return false;

    return card1.rank > card2.rank;
  }

  /**
   * Get valid cards
   */
  private getValidCards(player: PlayerState, leadSuit: Suit | null): Card[] {
    if (!leadSuit) {
      return [...player.hand];
    }

    const hasLeadSuit = player.hand.some(c => c.suit === leadSuit);

    if (hasLeadSuit) {
      return player.hand.filter(c => c.suit === leadSuit);
    }

    return [...player.hand];
  }

  /**
   * Get player index
   */
  private getPlayerIndex(player: PlayerState): number {
    return this.playerIndex;
  }

  /**
   * Get strategy name
   */
  getName(): string {
    return 'Normal';
  }
}
