/**
 * Bot AI oyuncu.
 * Easy/Normal/Hard stratejileriyle ihale ve kart oynama kararları verir.
 */

import { Card, Suit, PlayerState } from '../types/game.js';
import { EasyStrategy } from './strategies/EasyStrategy.js';
import { NormalStrategy } from './strategies/NormalStrategy.js';
import { HardStrategy } from './strategies/HardStrategy.js';
export class BatakBot {
  private playerId: string;
  private playerName: string;
  private playerIndex: number;
  private strategy: EasyStrategy | NormalStrategy | HardStrategy;

  constructor(playerId: string, playerName: string, playerIndex: number, difficulty: 'easy' | 'normal' | 'hard' = 'normal') {
    this.playerId = playerId;
    this.playerName = playerName;
    this.playerIndex = playerIndex;

    // Set strategy based on difficulty
    switch (difficulty) {
      case 'easy':
        this.strategy = new EasyStrategy();
        break;
      case 'normal':
        this.strategy = new NormalStrategy(playerIndex);
        break;
      case 'hard':
        this.strategy = new HardStrategy(playerIndex);
        break;
      default:
        this.strategy = new NormalStrategy(playerIndex);
    }
  }

  /**
   * Get bot player ID
   */
  getId(): string {
    return this.playerId;
  }

  /**
   * Get bot player name
   */
  getName(): string {
    return this.playerName;
  }

  /**
   * Make a bid decision
   */
  makeBid(
    player: PlayerState,
    currentHighestBid: number,
    allowedSuits: Suit[],
    gameMode: 'koz_maca' | 'ihaleli_batak' = 'ihaleli_batak'
  ): { suit: Suit; amount: number } | null {
    return this.strategy.decideBid(player, currentHighestBid, allowedSuits, gameMode);
  }

  /**
   * Decide which card to play
   */
  playCard(
    player: PlayerState,
    leadSuit: Suit | null,
    trumpSuit: Suit | null,
    currentTrick: Card[]
  ): Card {
    return this.strategy.decideCard(player, leadSuit, trumpSuit, currentTrick);
  }

  /**
   * Get strategy name
   */
  getStrategyName(): string {
    return this.strategy.getName();
  }

  /**
   * Reset bot state for new game
   */
  reset(): void {
    if (this.strategy instanceof HardStrategy) {
      this.strategy.resetTracking();
    }
  }

  /**
   * Track a card that was played (for hard strategy)
   */
  trackCard(card: Card, trumpSuit: Suit | null): void {
    if (this.strategy instanceof HardStrategy) {
      this.strategy.trackCard(card, trumpSuit);
    }
  }

  /**
   * Create a bot player state
   */
  static createBotPlayer(id: string, name: string, difficulty: 'easy' | 'normal' | 'hard' = 'normal'): PlayerState {
    return {
      id,
      name,
      type: 'bot',
      hand: [],
      tricksWon: 0,
      score: 0,
      bid: null,
      isReady: true // Bots are always ready
    };
  }
}

/**
 * Generate random bot name
 */
export function generateBotName(): string {
  const adjectives = ['Swift', 'Clever', 'Lucky', 'Smart', 'Quick', 'Bold', 'Wise', 'Sharp'];
  const nouns = ['Ace', 'King', 'Queen', 'Jack', 'Star', 'Champion', 'Master', 'Legend'];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 999);

  return `${adj}${noun}${num}`;
}

/**
 * Bot manager for handling multiple bots
 */
export class BotManager {
  private bots: Map<string, BatakBot> = new Map();

  /**
   * Create a new bot
   */
  createBot(playerIndex: number, difficulty: 'easy' | 'normal' | 'hard' = 'normal'): BatakBot {
    const id = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const name = generateBotName();

    const bot = new BatakBot(id, name, playerIndex, difficulty);
    this.bots.set(id, bot);

    return bot;
  }

  /**
   * Get bot by ID
   */
  getBot(id: string): BatakBot | undefined {
    return this.bots.get(id);
  }

  /**
   * Remove bot
   */
  removeBot(id: string): void {
    this.bots.delete(id);
  }

  /**
   * Reset all bots
   */
  resetAll(): void {
    for (const bot of this.bots.values()) {
      bot.reset();
    }
  }

  /**
   * Get active bot count
   */
  getBotCount(): number {
    return this.bots.size;
  }
}
