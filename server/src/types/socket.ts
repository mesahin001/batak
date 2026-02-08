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
  REJOIN_GAME = 'rejoin_game',
  SET_USERNAME = 'set_username',
  GET_USERNAME = 'get_username',
  CREATE_PRIVATE_ROOM = 'create_private_room',
  JOIN_PRIVATE_ROOM = 'join_private_room',
  LEAVE_PRIVATE_ROOM = 'leave_private_room',
  START_PRIVATE_ROOM = 'start_private_room',
  AUTH_REGISTER = 'auth_register',
  AUTH_LOGIN = 'auth_login',
  AUTH_VALIDATE = 'auth_validate',
  AUTH_WALLET = 'auth_wallet',
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
  GAME_REJOINED = 'game_rejoined',
  PLAYER_REPLACED = 'player_replaced',
  PRIVATE_ROOM_CREATED = 'private_room_created',
  PRIVATE_ROOM_UPDATE = 'private_room_update',
  PRIVATE_ROOM_CLOSED = 'private_room_closed',
  ERROR = 'error'
}

export interface JoinQueuePayload {
  publicKey: string;
  username?: string;
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
