/**
 * Skor hesaplama.
 * Batak formülüne göre tur sonu puanlarını hesaplar ve kazananı belirler.
 */

import { PlayerState, Bid, Suit, BidType } from '../types/game.js';
export function calculateScores(
  players: PlayerState[],
  _trumpSuit: Suit | null,
  bids: Bid[],
  gameMode: 'koz_maca' | 'ihaleli_batak' = 'ihaleli_batak'
): PlayerState[] {
  return players.map(player => {
    // Find the bid for this player from the bids array
    const playerBid = bids.find(b => b.playerId === player.id) || null;
    const roundScore = calculatePlayerScoreWithBid(player, playerBid, gameMode);
    const newTotalScore = player.totalScore + roundScore;
    const newRoundScores = [...player.roundScores, roundScore];

    return {
      ...player,
      score: roundScore,
      totalScore: newTotalScore,
      roundScores: newRoundScores
    };
  });
}

/**
 * Calculate score for a single player based on Batak rules
 *
 * İHALELİ BATAK (Auction Batak) - TRUE Turkish Rules:
 * - İhaleyi alan: Aldığı el × 10 (taahhüt üstü de dahil!)
 * - İhaleyi alan taahhüdü tutamazsa: -taahhüt × 10
 * - Hiç el alamayan (0 tricks): -taahhüt × 10 (kendi ihalesi ile!)
 * - Pas geçenler: tricks_won × 10
 *
 * KOZ MAÇA (Trump Jack):
 * - Taahhüt tutuldu: 10 × bid + (extra_tricks)
 * - Taahhüt tutulamadı: -10 × bid
 * - Pas geçenler: tricks_won × 10
 * - El almaz: +50 if 0 tricks, -50 if any tricks taken
 */
export function calculatePlayerScoreWithBid(
  player: PlayerState,
  bid: Bid | null,
  gameMode: 'koz_maca' | 'ihaleli_batak'
): number {
  console.log('[calculatePlayerScoreWithBid]', {
    playerName: player.name,
    gameMode,
    bid,
    tricksWon: player.tricksWon
  });

  // Check for el almaz (special bid for no tricks) - Koz Maça only
  if (gameMode === 'koz_maca' && bid?.type === BidType.EL_ALMAZ) {
    const score = player.tricksWon === 0 ? 50 : -50;
    console.log('[calculatePlayerScoreWithBid] El almaz score:', score);
    return score;
  }

  // Pas geçenler (ihale yapmayan): tricks × 10
  if (!bid || bid.amount === 0) {
    const score = player.tricksWon * 10;
    console.log('[calculatePlayerScoreWithBid] Non-bidder score:', score);
    return score;
  }

  const { amount } = bid;

  // İHALELİ BATAK: Aldığın elin 10 katı!
  if (gameMode === 'ihaleli_batak') {
    // İhaleyi alan taahhüdü tutarsa → +aldığı_elin_10_katı
    // (Taahhüdün üstünde el alırsan hepsi puan getirir!)
    if (player.tricksWon >= amount) {
      const score = player.tricksWon * 10;
      console.log('[calculatePlayerScoreWithBid] İhaleli Batak - Made bid:', {
        bidAmount: amount,
        tricksWon: player.tricksWon,
        score,
        calculation: `${player.tricksWon} (aldığı el) × 10 = ${score}`
      });
      return score;
    } else {
      // Taahhüt tutulamazsa (0 el dahil) → -taahhüt × 10
      const score = -(amount * 10);
      console.log('[calculatePlayerScoreWithBid] İhaleli Batak - Failed bid:', {
        bidAmount: amount,
        tricksWon: player.tricksWon,
        score,
        calculation: `-${amount} (taahhüt) × 10 = ${score}`
      });
      return score;
    }
  }

  // KOZ MAÇA: Normal bid with extra tricks bonus
  if (player.tricksWon >= amount) {
    const extraTricks = player.tricksWon - amount;
    const score = (amount * 10) + extraTricks;
    console.log('[calculatePlayerScoreWithBid] Koz Maça - Made bid:', {
      bidAmount: amount,
      tricksWon: player.tricksWon,
      extraTricks,
      score,
      calculation: `${amount} × 10 + ${extraTricks} = ${score}`
    });
    return score;
  } else {
    const score = -(amount * 10);
    console.log('[calculatePlayerScoreWithBid] Koz Maça - Failed bid:', {
      bidAmount: amount,
      tricksWon: player.tricksWon,
      score,
      calculation: `-${amount} × 10 = ${score}`
    });
    return score;
  }
}

// Legacy function for backward compatibility
// Note: Doesn't apply zero-trick penalty correctly (needs winning bid amount)
export function calculatePlayerScore(player: PlayerState, gameMode: 'koz_maca' | 'ihaleli_batak'): number {
  return calculatePlayerScoreWithBid(player, player.bid, gameMode);
}

/**
 * Check if a player has won the game
 *
 * İhaleli Batak: NO EARLY ENDING - play all rounds, lowest score wins at end
 * Koz Maça: No early ending - play all rounds, highest score wins at end
 *
 * For both game modes, use getLowestScorer() or getHighestScorer() when rounds complete
 */
export function checkGameWinner(_players: PlayerState[], _gameMode: 'koz_maca' | 'ihaleli_batak' = 'ihaleli_batak'): string | null {
  // NO EARLY GAME END for either mode
  // Game ends when max rounds are reached, not based on score threshold
  return null;
}

/**
 * Get the highest scoring player (for Koz Maça)
 * In Koz Maça, the HIGHEST score wins (least negative)
 */
export function getHighestScorer(players: PlayerState[]): PlayerState | null {
  if (players.length === 0) return null;

  return players.reduce((highest, current) => {
    return current.totalScore > highest.totalScore ? current : highest;
  });
}

/**
 * Check if a player declared King and won by taking all 13 tricks
 * This is an instant win condition
 */
export function checkKingWinner(player: PlayerState): boolean {
  return player.declaredKing && player.tricksWon === 13;
}

/**
 * Get the lowest scoring player (used when max rounds reached)
 * In Batak, the LOWEST score wins
 */
export function getLowestScorer(players: PlayerState[]): PlayerState | null {
  if (players.length === 0) return null;

  return players.reduce((lowest, current) => {
    return current.totalScore < lowest.totalScore ? current : lowest;
  });
}

/**
 * Calculate the winner of a trick
 */
export function calculateTrickWinner(
  cards: Array<{ playerId: string; card: any }>,
  leadSuit: Suit,
  trumpSuit: Suit | null
): string {
  let winningCard = cards[0];

  for (let i = 1; i < cards.length; i++) {
    const current = cards[i];

    if (cardBeats(current.card, winningCard.card, leadSuit, trumpSuit)) {
      winningCard = current;
    }
  }

  return winningCard.playerId;
}

/**
 * Check if card1 beats card2
 */
function cardBeats(
  card1: any,
  card2: any,
  leadSuit: Suit,
  trumpSuit: Suit | null
): boolean {
  // If card1 is trump and card2 isn't, card1 wins
  const card1IsTrump = trumpSuit && card1.suit === trumpSuit;
  const card2IsTrump = trumpSuit && card2.suit === trumpSuit;

  if (card1IsTrump && !card2IsTrump) return true;
  if (card2IsTrump && !card1IsTrump) return false;

  // If both are trump, higher rank wins
  if (card1IsTrump && card2IsTrump) {
    return card1.rank > card2.rank;
  }

  // If neither is trump
  const card1IsLead = card1.suit === leadSuit;
  const card2IsLead = card2.suit === leadSuit;

  // Card following lead suit beats off-suit
  if (card1IsLead && !card2IsLead) return true;
  if (card2IsLead && !card1IsLead) return false;

  // Both follow lead suit (or both don't), higher rank wins
  return card1.rank > card2.rank;
}

/**
 * Validate if a bid is achievable based on hand
 * (Used by bots for bidding strategy)
 */
export function estimateAchievableTricks(
  hand: any[],
  suit: Suit | null
): number {
  let tricks = 0;

  // Count aces (guaranteed tricks)
  const aces = hand.filter(c => c.rank === 14).length;
  tricks += aces;

  // Count kings (likely tricks, unless ace is against you)
  const kings = hand.filter(c => c.rank === 13).length;
  tricks += Math.floor(kings * 0.8);

  // If bidding on trump, count additional trump cards
  if (suit) {
    const trumps = hand.filter(c => c.suit === suit).length;
    if (trumps >= 4) {
      tricks += 1; // Bonus for strong trump suit
    }
  }

  return Math.min(13, Math.floor(tricks));
}

/**
 * Calculate final rankings (LOWEST score wins in Batak)
 */
export interface Ranking {
  playerId: string;
  playerName: string;
  rank: number;
  score: number;
}

export function calculateRankings(players: PlayerState[]): Ranking[] {
  // Sort by lowest score (Batak rules)
  const sorted = [...players].sort((a, b) => a.totalScore - b.totalScore);

  return sorted.map((player, index) => ({
    playerId: player.id,
    playerName: player.name,
    rank: index + 1,
    score: player.totalScore
  }));
}

/**
 * Get highest bid amount (excluding pass bids of 0)
 */
export function getHighestBidAmount(bids: Bid[]): number {
  const realBids = bids.filter(b => b.amount > 0);
  if (realBids.length === 0) return 0;
  return Math.max(...realBids.map(b => b.amount));
}
