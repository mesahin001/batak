/**
 * Turnuva tipleri.
 * Turnuva durumu, konfigürasyonu ve oyuncu kayıt yapıları.
 */

export enum TournamentStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * Tournament configuration
 */
export interface TournamentConfig {
  id: string;
  entryFee: number; // In lamports (0 for MVP)
  rewardTier: 'bronze' | 'silver' | 'gold';
  maxPlayers: number;
  botCount: number;
  startTime: Date;
}

/**
 * Tournament registration
 */
export interface TournamentRegistration {
  tournamentId: string;
  playerId: string;
  publicKey: string;
  signature: string;
  registeredAt: Date;
}

/**
 * cNFT metadata structure
 */
export interface CNFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  collection: {
    name: string;
    family: string;
  };
}

/**
 * Tournament result for blockchain
 */
export interface TournamentResult {
  tournamentId: string;
  winnerPublicKey: string;
  finalScores: Array<{
    publicKey: string;
    score: number;
  }>;
  timestamp: number;
  serverSignature: string;
}
