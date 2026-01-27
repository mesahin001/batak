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
    const errors: string[] = [];
    const warnings: string[] = [];

    // Production: Strict validation - missing critical values cause errors
    if (this.nodeEnv === 'production') {
      if (!this.solanaPrivateKey) {
        errors.push('SOLANA_PRIVATE_KEY is required in production');
      }
      if (!this.programId || this.programId.includes('111111')) {
        errors.push('Valid PROGRAM_ID is required in production (current value appears to be placeholder)');
      }
      if (!this.merkleTree) {
        errors.push('MERKLE_TREE is required in production');
      }

      if (errors.length > 0) {
        console.error('❌ Config validation failed:');
        errors.forEach(err => console.error(`  - ${err}`));
        throw new Error(`Config validation failed:\n${errors.join('\n')}`);
      }
    }
    // Development: Warn only
    else {
      if (!this.solanaPrivateKey) {
        warnings.push('SOLANA_PRIVATE_KEY not set - using mock Solana features');
      }
      if (!this.programId || this.programId.includes('111111')) {
        warnings.push('PROGRAM_ID not set or is placeholder - tournament features may not work');
      }
      if (!this.merkleTree) {
        warnings.push('MERKLE_TREE not set - cNFT minting will be mocked');
      }

      if (warnings.length > 0) {
        console.warn('⚠️  Config warnings (development mode):');
        warnings.forEach(warn => console.warn(`  - ${warn}`));
      }
    }

    return true;
  }
} as const;

export type Config = typeof config;
