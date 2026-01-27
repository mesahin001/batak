/**
 * Zor bot stratejisi.
 * Oynanan kartları sayar, kozları hatırlar, stratejik ihale ve oynama yapar.
 */

import { Card, Suit, PlayerState } from '../../types/game.js';
import { analyzeHand, findBestTrumpSuit } from '../HandAnalyzer.js';
export class HardStrategy {
  private cardsPlayed: Map<string, Card[]> = new Map();
  private trumpsPlayed: Card[] = [];
  private acesPlayed: Card[] = [];

  /**
   * Reset tracking for new game
   */
  resetTracking(): void {
    this.cardsPlayed.clear();
    this.trumpsPlayed = [];
    this.acesPlayed = [];
  }

  /**
   * Track card played
   */
  trackCard(card: Card, trumpSuit: Suit | null): void {
    if (!this.cardsPlayed.has(card.suit)) {
      this.cardsPlayed.set(card.suit, []);
    }
    this.cardsPlayed.get(card.suit)!.push(card);

    if (trumpSuit && card.suit === trumpSuit) {
      this.trumpsPlayed.push(card);
    }

    if (card.rank === 14) {
      this.acesPlayed.push(card);
    }
  }

  /**
   * Decide bid for hard bot
   */
  decideBid(
    player: PlayerState,
    currentHighestBid: number,
    allowedSuits: Suit[],
    gameMode: 'koz_maca' | 'ihaleli_batak' = 'ihaleli_batak'
  ): { suit: Suit; amount: number } | null {
    const analysis = analyzeHand(player.hand);

    // Smart bidding based on detailed analysis
    let estimatedTricks = analysis.guaranteedTricks;

    // Add potential tricks from kings (only if ace not played in that suit)
    const kings = player.hand.filter(c => c.rank === 13);
    for (const king of kings) {
      const aceInSuit = this.acesPlayed.some(c => c.suit === king.suit);
      if (!aceInSuit) {
        estimatedTricks += 0.8;
      }
    }

    // Bonus for long suits
    for (const suit of [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS]) {
      const count = player.hand.filter(c => c.suit === suit).length;
      if (count >= 5) {
        estimatedTricks += 1;
      }
    }

    // Bonus for void suits (can trump)
    estimatedTricks += analysis.voidSuits.length * 0.5;

    const bidAmount = Math.floor(estimatedTricks);

    // Koz Maça: Independent bidding (can bid 1-13)
    if (gameMode === 'koz_maca') {
      if (bidAmount < 1) {
        return null; // Pass if very weak hand
      }
      return {
        suit: Suit.SPADES,
        amount: Math.max(1, Math.min(bidAmount, 13))
      };
    }

    // İhaleli Batak: Competitive bidding
    const minBid = currentHighestBid + 1;
    if (bidAmount < minBid) {
      return null;
    }

    return {
      suit: Suit.SPADES,
      amount: Math.max(minBid, Math.min(bidAmount, 13))
    };
  }

  /**
   * Evaluate a suit as potential trump
   */
  private evaluateSuitForTrump(cards: Card[], suit: Suit): number {
    let score = 0;

    // Length bonus
    score += cards.length * 2;

    // High card bonus
    for (const card of cards) {
      score += card.rank;
    }

    // Check if opponents have played high cards in this suit
    const playedInSuit = this.cardsPlayed.get(suit) || [];
    const opponentHighCards = playedInSuit.filter(c => c.rank >= 12);
    score -= opponentHighCards.length * 5;

    return score;
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
    const sorted = [...validCards].sort((a, b) => b.rank - a.rank);

    // Strategy 1: Lead from short suits to force out trumps
    const suitCounts: Record<string, number> = {};
    for (const card of validCards) {
      suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    }

    for (const card of sorted) {
      if (card.suit !== trumpSuit && suitCounts[card.suit] <= 2) {
        // Lead from short suit
        return card;
      }
    }

    // Strategy 2: Lead high cards from strong suits
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
    // Get current winner of trick
    const currentWinner = this.getCurrentWinner(currentTrick, leadSuit, trumpSuit);

    // Determine if partner is winning
    const partnerIsWinning = this.isPartnerWinning(currentTrick, currentWinner);

    // If partner is winning, play low
    if (partnerIsWinning && validCards.length > 1) {
      const sorted = [...validCards].sort((a, b) => a.rank - b.rank);
      return sorted[0];
    }

    // Try to win with lowest winning card
    const winningCards = this.getWinningCards(validCards, leadSuit, trumpSuit, currentTrick);

    if (winningCards.length > 0) {
      // If going to win, win cheaply
      return winningCards[0];
    }

    // Can't win - dump strategically
    return this.dumpCard(player, validCards, trumpSuit);
  }

  /**
   * Get current winner of trick
   */
  private getCurrentWinner(trick: Card[], leadSuit: Suit, trumpSuit: Suit | null): Card | null {
    if (trick.length === 0) return null;

    let winner = trick[0];
    for (let i = 1; i < trick.length; i++) {
      if (this.beats(trick[i], winner, leadSuit, trumpSuit)) {
        winner = trick[i];
      }
    }
    return winner;
  }

  /**
   * Check if partner is currently winning the trick
   */
  private isPartnerWinning(trick: Card[], winner: Card | null): boolean {
    // Simplified - in real implementation, track player positions
    return trick.length >= 2 && winner === trick[trick.length - 2];
  }

  /**
   * Get cards that would win
   */
  private getWinningCards(
    validCards: Card[],
    leadSuit: Suit,
    trumpSuit: Suit | null,
    currentTrick: Card[]
  ): Card[] {
    const winningCards: Card[] = [];
    const currentWinner = this.getCurrentWinner(currentTrick, leadSuit, trumpSuit);

    for (const card of validCards) {
      if (!currentWinner || this.beats(card, currentWinner, leadSuit, trumpSuit)) {
        winningCards.push(card);
      }
    }

    return winningCards.sort((a, b) => a.rank - b.rank);
  }

  /**
   * Strategically dump a card when can't win
   */
  private dumpCard(player: PlayerState, validCards: Card[], trumpSuit: Suit | null): Card {
    // Dump from suits we're cutting
    // Prioritize: low cards, then cards from suits where we're short

    const nonTrumps = validCards.filter(c => c.suit !== trumpSuit);
    if (nonTrumps.length > 0) {
      const sorted = [...nonTrumps].sort((a, b) => a.rank - b.rank);
      return sorted[0];
    }

    // Dump low trump
    const sorted = [...validCards].sort((a, b) => a.rank - b.rank);
    return sorted[0];
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
   * Get strategy name
   */
  getName(): string {
    return 'Hard';
  }
}
