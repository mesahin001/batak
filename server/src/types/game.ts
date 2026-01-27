/**
 * Oyun tipleri.
 * Suit, Rank, Card, Player, Bid, GameState ve diğer oyun veri yapıları.
 */

export enum Suit {
  SPADES = 'spades',
  HEARTS = 'hearts',
  DIAMONDS = 'diamonds',
  CLUBS = 'clubs',
  NONE = 'none'
}

/**
 * Card rank representation
 * Batak uses full deck: 2 through Ace (13 ranks)
 */
export enum Rank {
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
  ACE = 14
}

/**
 * Card interface
 */
export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // Unique identifier for each card
}

/**
 * Player type
 */
export enum PlayerType {
  HUMAN = 'human',
  BOT = 'bot'
}

/**
 * Game state phases
 */
export enum GameState {
  LOBBY = 'lobby',
  BIDDING = 'bidding',
  PLAYING = 'playing',
  SCORING = 'scoring',
  FINISHED = 'finished'
}

/**
 * Bid type for special bids
 */
export enum BidType {
  NORMAL = 'normal',
  EL_ALMAZ = 'el_almaz',  // No tricks bid
  KING = 'king'           // All 13 tricks bid
}

/**
 * Bid interface
 */
export interface Bid {
  playerId: string;
  suit: Suit;
  amount: number; // Number of tricks bid (1-13), or 0 for pass, or -1 for el almaz
  type?: BidType; // Type of bid (normal, el_almaz, king)
}

/**
 * Trick interface - cards played in one round
 */
export interface Trick {
  cards: Array<{
    playerId: string;
    card: Card;
  }>;
  winnerId: string | null;
  leadSuit: Suit;
}

/**
 * Round record - stores history of a completed round
 */
export interface RoundRecord {
  roundNumber: number;
  bids: Bid[];
  tricks: Trick[];
  scores: number[];  // Round scores only
  winnerId: string;  // Who won the most tricks (or highest bidder)
}

/**
 * Player state during game
 */
export interface PlayerState {
  id: string;
  name: string;
  type: PlayerType;
  hand: Card[];
  tricksWon: number;
  score: number;          // Current round score only
  totalScore: number;     // Cumulative score across all rounds
  roundScores: number[];  // Score from each round played
  bid: Bid | null;
  declaredKing: boolean;  // Did player declare King (all 13 tricks)?
  isReady: boolean;
  publicKey?: string; // Solana public key for rewards
}

/**
 * Complete game state
 */
export interface GameRoom {
  id: string;
  state: GameState;
  players: PlayerState[];
  currentTrick: Trick;
  tricks: Trick[];
  trumpSuit: Suit | null;
  currentPlayerIndex: number;
  dealerIndex: number;
  bids: Bid[];
  scores: number[];

  // Multi-round support
  currentRound: number;           // Current round number (1-based)
  totalRounds: number;            // Total rounds in game (5, 7, 9, or 11)
  roundHistory: RoundRecord[];    // History of all rounds played
  winner: string | null;          // Overall game winner (when finished)

  // Game mode
  gameMode: 'koz_maca' | 'ihaleli_batak';  // Game mode

  tournamentId?: string;
  createdAt: Date;
  lastUpdated: Date;
}

/**
 * Move validation result
 */
export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Game result
 */
export interface GameResult {
  roomId: string;
  winner: PlayerState;
  scores: Array<{ playerId: string; score: number }>;
  duration: number; // in milliseconds
}
