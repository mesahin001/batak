/**
 * Uygulama konfigürasyonu.
 * Environment variable'lardan server, Solana ve oyun ayarlarını yükler.
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Solana
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY || '',
  solanaNetwork: process.env.SOLANA_NETWORK || 'devnet',

  // Program
  programId: process.env.PROGRAM_ID || '',
  merkleTree: process.env.MERKLE_TREE || '',

  // Game
  maxPlayers: parseInt(process.env.MAX_PLAYERS || '4', 10),
  defaultBotDifficulty: process.env.DEFAULT_BOT_DIFFICULTY || 'normal',
  gameTimeout: parseInt(process.env.GAME_TIMEOUT || '300000', 10),

  // Timeouts (in ms)
  turnTimeout: 30000,
  bidTimeout: 15000,
  lobbyTimeout: 60000,

  // Scoring
  pointsPerTrick: 10,
  failedBidPenalty: -100,
  bonusScore: 100,

  validate() {
    if (!this.solanaPrivateKey) {
      console.warn('Warning: SOLANA_PRIVATE_KEY not set. Solana features will be disabled.');
    }
    if (!this.programId) {
      console.warn('Warning: PROGRAM_ID not set. Tournament features will be disabled.');
    }
    return true;
  }
} as const;

export type Config = typeof config;
