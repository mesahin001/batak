/**
 * Hamle doğrulama.
 * Kart oynama ve ihale kurallarını kontrol eder (renk takibi, sıra kontrolü vb).
 */

import { Card, Suit, ValidationResult, PlayerState } from '../types/game.js';
import { canPlayCard } from './Card.js';
import { getPlayableCards } from './Player.js';
export function validateCardPlay(
  player: PlayerState,
  card: Card,
  leadSuit: Suit | null,
  isPlayerTurn: boolean
): ValidationResult {
  // Check if it's the player's turn
  if (!isPlayerTurn) {
    return {
      valid: false,
      reason: 'Not your turn'
    };
  }

  // Check if player has the card
  const cardInHand = player.hand.find(c => c.id === card.id);
  if (!cardInHand) {
    return {
      valid: false,
      reason: 'Card not in hand'
    };
  }

  // Check if card can be played according to Batak rules
  if (!canPlayCard(card, player.hand, leadSuit)) {
    return {
      valid: false,
      reason: 'Must follow suit if possible'
    };
  }

  return { valid: true };
}

/**
 * Validate a bid
 */
export function validateBid(
  _player: PlayerState,
  _suit: Suit,
  amount: number,
  currentHighestBid: number,
  gameMode: 'koz_maca' | 'ihaleli_batak' = 'ihaleli_batak'
): ValidationResult {
  // Check bid amount is valid (0-13, where 0 = pass)
  if (amount < 0 || amount > 13) {
    return {
      valid: false,
      reason: 'Bid must be between 0 and 13 (0 = pass)'
    };
  }

  // Pass (0) is always valid
  if (amount === 0) {
    return { valid: true };
  }

  // Koz Maça: Any amount 1-13 is valid (independent bidding)
  if (gameMode === 'koz_maca') {
    return { valid: true };
  }

  // İhaleli Batak: Must bid higher than current highest
  if (amount <= currentHighestBid && currentHighestBid > 0) {
    return {
      valid: false,
      reason: `Bid must be higher than ${currentHighestBid}`
    };
  }

  return { valid: true };
}

/**
 * Validate pass (no bid)
 */
export function validatePass(
  _player: PlayerState,
  hasPassed: boolean
): ValidationResult {
  if (hasPassed) {
    return {
      valid: false,
      reason: 'Already passed'
    };
  }

  return { valid: true };
}

/**
 * Get all valid cards a player can play
 */
export function getValidCards(
  player: PlayerState,
  leadSuit: Suit | null
): Card[] {
  return getPlayableCards(player, leadSuit);
}

/**
 * Check if player must play trump
 */
export function mustPlayTrump(
  player: PlayerState,
  leadSuit: Suit,
  trumpSuit: Suit | null
): boolean {
  // No trump suit selected
  if (!trumpSuit) return false;

  // Player is leading - can play anything
  if (!leadSuit) return false;

  // Player has lead suit - must follow, not trump
  if (playerHasSuit(player, leadSuit)) return false;

  // Player doesn't have lead suit - can play anything including trump
  return false;
}

function playerHasSuit(player: PlayerState, suit: string): boolean {
  return player.hand.some(card => card.suit === suit);
}
