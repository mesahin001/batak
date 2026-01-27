/**
 * Socket event tipleri.
 * Client-server arası tüm WebSocket event tanımları ve payload'ları.
 */

import { Suit } from './game.js';
export enum GameMode {
  KOZ_MACA = 'koz_maca',        // No bidding, everyone tries to win tricks
  IHALELI_BATAK = 'ihaleli_batak',  // Bidding determines declarer
}

/**
 * Socket event types from client to server
 */
export enum ClientEvent {
  JOIN_QUEUE = 'join_queue',
  LEAVE_QUEUE = 'leave_queue',
  JOIN_TOURNAMENT = 'join_tournament',
  PLAY_CARD = 'play_card',
  BID_TRUMP = 'bid_trump',
  PLAYER_READY = 'player_ready',
  CLAIM_REWARD = 'claim_reward',
  REQUEST_NEXT_ROUND = 'request_next_round',
  DISCONNECT = 'disconnect'
}

/**
 * Socket event types from server to client
 */
export enum ServerEvent {
  QUEUE_UPDATE = 'queue_update',
  MATCH_FOUND = 'match_found',
  TOURNAMENT_STARTED = 'tournament_started',
  GAME_STATE_UPDATE = 'game_state_update',
  CARD_PLAYED = 'card_played',
  TRICK_COMPLETE = 'trick_complete',
  ROUND_COMPLETE = 'round_complete',
  NEXT_ROUND_STARTING = 'next_round_starting',
  GAME_COMPLETE = 'game_complete',
  REWARD_MINTED = 'reward_minted',
  TOURNAMENT_ERROR = 'tournament_error',
  ERROR = 'error'
}

export interface JoinQueuePayload {
  publicKey: string;
  gameMode?: GameMode;  // NEW: Game mode selection
  botDifficulty?: 'easy' | 'normal' | 'hard';
  botCount?: number;
}

export interface PlayCardPayload {
  cardId: string;
  signature?: string;
}

export interface BidTrumpPayload {
  suit: Suit;
  amount: number;
  signature?: string;
}

export interface MatchFoundPayload {
  roomId: string;
  players: Array<{
    id: string;
    name: string;
    type: 'human' | 'bot';
  }>;
}
