/**
 * Client oyun tipleri.
 * Server'dan gelen state'i temsil eden Suit, Rank, Card, Player ve GameState yapıları.
 * Copied from web client for React Native compatibility
 */

export enum Suit {
  SPADES = 'spades',
  HEARTS = 'hearts',
  DIAMONDS = 'diamonds',
  CLUBS = 'clubs',
  NONE = 'none'
}

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

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string;
}

export enum PlayerType {
  HUMAN = 'human',
  BOT = 'bot'
}

export enum GameState {
  LOBBY = 'lobby',
  BIDDING = 'bidding',
  PLAYING = 'playing',
  SCORING = 'scoring',
  FINISHED = 'finished'
}

export enum BidType {
  NORMAL = 'normal',
  EL_ALMAZ = 'el_almaz',
  KING = 'king'
}

export interface Bid {
  playerId: string;
  suit: Suit;
  amount: number;
  type?: BidType;
}

export interface Trick {
  cards: Array<{
    playerId: string;
    card: Card;
  }>;
  winnerId: string | null;
  leadSuit: Suit;
}

export interface RoundRecord {
  roundNumber: number;
  bids: Bid[];
  tricks: Trick[];
  scores: number[];
  winnerId: string;
}

export interface PlayerState {
  id: string;
  name: string;
  type: PlayerType;
  hand: Card[];
  tricksWon: number;
  score: number;           // Current round score
  totalScore: number;      // Cumulative score across all rounds
  roundScores: number[];   // Score from each round
  bid: Bid | null;
  handSize: number;
}

export interface GameClientState {
  state: GameState;
  currentPlayerIndex: number;
  trumpSuit: Suit | null;
  currentTrick: {
    cards: Array<{
      playerId: string;
      card: Card;
    }>;
    winnerId?: string | null;
    leadSuit: Suit;
  };
  tricks: number;
  bids: Bid[];
  players: PlayerState[];
  currentRound?: number;
  totalRounds?: number;
  roundHistory?: RoundRecord[];
  winner?: string | null;
  gameMode?: 'koz_maca' | 'ihaleli_batak';
}

/**
 * Round complete data from server
 */
export interface RoundCompleteData {
  roundNumber: number;
  totalRounds: number;
  roundWinner: string | null;
  players: Array<{
    id: string;
    name: string;
    type: PlayerType;
    score: number;
    totalScore: number;
    roundScores: number[];
    tricksWon: number;
  }>;
}

/**
 * Game complete data from server
 */
export interface GameCompleteData {
  winner: string;
  winnerName: string;
  players: Array<{
    id: string;
    name: string;
    type: PlayerType;
    score: number;
    totalScore: number;
    roundScores: number[];
    tricksWon: number;
  }>;
  roundHistory: RoundRecord[];
  totalRounds: number;
  roundsPlayed: number;
}

/**
 * Next round starting data from server
 */
export interface NextRoundStartingData {
  roundNumber: number;
  totalRounds: number;
}

/**
 * Game modes for Batak
 */
export enum GameMode {
  KOZ_MACA = 'koz_maca',        // No bidding, everyone tries to win tricks
  IHALELI_BATAK = 'ihaleli_batak'  // Bidding determines declarer
}

/**
 * Leaderboard entry from server
 */
export interface LeaderboardEntry {
  publicKey: string;
  username: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalScore: number;
  nftsEarned: number;
  rankTier: number;
  currentSeasonPoints: number;
  totalTricksWon: number;
  totalBidsMade: number;
  bidsSuccessful: number;
  bestScore: number;
  worstScore: number;
}

/**
 * Player profile with game history and NFTs
 */
export interface PlayerProfile extends LeaderboardEntry {
  recentGames: GameHistoryEntry[];
  nftRewards: NftRewardEntry[];
}

/**
 * Game history entry from server
 */
export interface GameHistoryEntry {
  id: string;
  gameMode: string;
  totalRounds: number;
  winnerPk: string;
  finalScores: number[];
  completedAt?: string;
}

/**
 * NFT reward entry from server
 */
export interface NftRewardEntry {
  playerPk: string;
  tier: number;
  metadataUri: string;
  signature?: string;
  onChainMinted: boolean;
}

/**
 * Navigation types
 */
export interface RootStackParamList {
  Auth: undefined;
  Main: undefined;
  Game: { screen: keyof GameStackParamList; params: any };
}

export interface AuthStackParamList {
  Login: undefined;
  Register: undefined;
  WalletAuth: undefined;
  [key: string]: undefined | object;
}

export interface MainStackParamList {
  Lobby: undefined;
  Leaderboard: undefined;
  Profile: { publicKey?: string } | undefined;
  Settings: undefined;
  [key: string]: undefined | object;
}

export interface GameStackParamList {
  GameRoom: { roomId: string };
  GameResult: { roomId: string };
  TournamentResult: { tournamentId: string };
  [key: string]: undefined | object;
}

/**
 * React Native specific types
 */
export interface NavigationProps<T> {
  route: { params: T };
  navigation: any;
}
