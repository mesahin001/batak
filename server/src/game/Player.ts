/**
 * Oyuncu state yardımcı fonksiyonları.
 * Oyuncu oluşturma, kart dağıtma, el yönetimi ve trik kazanma işlemleri.
 */

import { PlayerState, Card, Bid, PlayerType } from '../types/game.js';
export function createPlayer(
  id: string,
  name: string,
  type: PlayerType,
  publicKey?: string
): PlayerState {
  return {
    id,
    name,
    type,
    hand: [],
    tricksWon: 0,
    score: 0,           // Current round score
    totalScore: 0,      // Cumulative score across all rounds
    roundScores: [],    // History of scores from each round
    bid: null,
    declaredKing: false,
    isReady: false,
    publicKey
  };
}

/**
 * Deal cards to a player
 */
export function dealCardsToPlayer(player: PlayerState, cards: Card[]): PlayerState {
  return {
    ...player,
    hand: [...cards],
    isReady: true
  };
}

/**
 * Set player's bid
 */
export function setPlayerBid(player: PlayerState, bid: Bid): PlayerState {
  return {
    ...player,
    bid
  };
}

/**
 * Add a trick win to player
 */
export function addTrickWin(player: PlayerState): PlayerState {
  return {
    ...player,
    tricksWon: player.tricksWon + 1
  };
}

/**
 * Set player score (for a single round)
 */
export function setPlayerScore(player: PlayerState, score: number): PlayerState {
  return {
    ...player,
    score
  };
}

/**
 * Set player's total score and round scores after a round
 */
export function setPlayerTotalScore(
  player: PlayerState,
  roundScore: number
): PlayerState {
  return {
    ...player,
    score: roundScore,
    totalScore: player.totalScore + roundScore,
    roundScores: [...player.roundScores, roundScore]
  };
}

/**
 * Reset player for new round (keeps cumulative scores)
 */
export function resetPlayerForRound(player: PlayerState): PlayerState {
  return {
    ...player,
    hand: [],
    tricksWon: 0,
    score: 0,
    bid: null,
    declaredKing: false,
    isReady: false
  };
}

/**
 * Check if player has a specific suit
 */
export function playerHasSuit(player: PlayerState, suit: string): boolean {
  return player.hand.some(card => card.suit === suit);
}

/**
 * Get player's playable cards based on lead suit
 */
export function getPlayableCards(player: PlayerState, leadSuit: string | null): Card[] {
  if (!leadSuit) {
    // Any card can be played when leading
    return [...player.hand];
  }

  // Check if player has lead suit
  const hasLeadSuit = playerHasSuit(player, leadSuit);

  if (hasLeadSuit) {
    // Must follow lead suit
    return player.hand.filter(card => card.suit === leadSuit);
  }

  // Can play any card if void in lead suit
  return [...player.hand];
}

/**
 * Remove a card from player's hand
 */
export function removeCardFromHand(player: PlayerState, cardId: string): PlayerState {
  return {
    ...player,
    hand: player.hand.filter(card => card.id !== cardId)
  };
}
