/**
 * Database Manager - Batak Tournament
 *
 * Handles all database operations for persistent storage.
 * Supports SQLite for development/testing, PostgreSQL for production.
 *
 * Data stored:
 * - Player statistics (wins, losses, tricks, NFTs earned)
 * - Game history (rounds, scores, winners)
 * - NFT rewards minted
 * - Leaderboard snapshots
 */

import Database from 'better-sqlite3';
import { PlayerState, GameRoom, RoundRecord } from '../types/game.js';
import path from 'path';

interface PlayerStats {
  publicKey: string;
  username?: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalTricksWon: number;
  totalBidsMade: number;
  bidsSuccessful: number;
  totalScore: number;
  bestScore: number;
  worstScore: number;
  nftsEarned: number;
  rankTier: number;
  currentSeasonPoints: number;
  lastPlayedAt?: Date;
}

interface GameRecord {
  id: string;
  gameMode: string;
  totalRounds: number;
  botDifficulty?: string;
  player1Pk: string;
  player2Pk: string;
  player3Pk: string;
  player4Pk: string;
  winnerPk?: string;
  finalScores: number[];
  roundHistory: RoundRecord[];
  status: 'in_progress' | 'completed' | 'abandoned';
  completedAt?: Date;
}

interface NftReward {
  playerPk: string;
  tournamentId: number;
  gameId: string;
  tier: number; // 1=Bronze, 2=Silver, 3=Gold
  metadataUri: string;
  signature?: string;
  onChainMinted: boolean;
}

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath: string = './data/batak.db') {
    // Ensure data directory exists
    const fs = require('fs');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    this.db.exec(`
      -- Players table
      CREATE TABLE IF NOT EXISTS players (
        public_key TEXT PRIMARY KEY,
        username TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        games_lost INTEGER DEFAULT 0,
        total_tricks_won INTEGER DEFAULT 0,
        total_bids_made INTEGER DEFAULT 0,
        bids_successful INTEGER DEFAULT 0,
        total_score INTEGER DEFAULT 0,
        best_score INTEGER DEFAULT 9999,
        worst_score INTEGER DEFAULT 0,
        nfts_earned INTEGER DEFAULT 0,
        last_nft_earned_at TIMESTAMP,
        rank_tier INTEGER DEFAULT 3,
        current_season_points INTEGER DEFAULT 0,
        last_played_at TIMESTAMP
      );

      -- Games table
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        game_mode TEXT NOT NULL,
        total_rounds INTEGER DEFAULT 5,
        bot_difficulty TEXT,
        player_1_pk TEXT,
        player_2_pk TEXT,
        player_3_pk TEXT,
        player_4_pk TEXT,
        winner_pk TEXT,
        final_scores TEXT,
        round_history TEXT,
        tournament_id INTEGER,
        tournament_tier INTEGER,
        status TEXT DEFAULT 'in_progress',
        abandoned_reason TEXT
      );

      -- NFT rewards table
      CREATE TABLE IF NOT EXISTS nft_rewards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        player_pk TEXT,
        tournament_id INTEGER,
        game_id TEXT,
        tier INTEGER NOT NULL,
        metadata_uri TEXT,
        signature TEXT,
        on_chain_minted BOOLEAN DEFAULT 0,
        mint_tx_id TEXT,
        image_url TEXT
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_players_rank ON players(rank_tier, current_season_points DESC);
      CREATE INDEX IF NOT EXISTS idx_players_games_won ON players(games_won DESC);
      CREATE INDEX IF NOT EXISTS idx_games_completed ON games(completed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_nft_rewards_player ON nft_rewards(player_pk);
    `);

    console.log('[Database] Schema initialized');
  }

  // =====================================================
  // PLAYER OPERATIONS
  // =====================================================

  /**
   * Get or create player (first time they play)
   */
  getOrCreatePlayer(publicKey: string, username?: string): PlayerStats {
    const existing = this.getPlayer(publicKey);
    if (existing) return existing;

    this.db.prepare(`
      INSERT INTO players (public_key, username)
      VALUES (?, ?)
    `).run(publicKey, username || `Player_${publicKey.slice(0, 6)}`);

    return this.getPlayer(publicKey)!;
  }

  /**
   * Get player by public key
   */
  getPlayer(publicKey: string): PlayerStats | null {
    const row = this.db.prepare(`
      SELECT * FROM players WHERE public_key = ?
    `).get(publicKey) as any;

    if (!row) return null;

    return {
      publicKey: row.public_key,
      username: row.username,
      gamesPlayed: row.games_played,
      gamesWon: row.games_won,
      gamesLost: row.games_lost,
      totalTricksWon: row.total_tricks_won,
      totalBidsMade: row.total_bids_made,
      bidsSuccessful: row.bids_successful,
      totalScore: row.total_score,
      bestScore: row.best_score,
      worstScore: row.worst_score,
      nftsEarned: row.nfts_earned,
      rankTier: row.rank_tier,
      currentSeasonPoints: row.current_season_points,
      lastPlayedAt: row.last_played_at ? new Date(row.last_played_at) : undefined,
    };
  }

  /**
   * Update player stats after game completion
   */
  updatePlayerStats(
    publicKey: string,
    tricksWon: number,
    bidAmount: number,
    finalScore: number,
    isWinner: boolean
  ): void {
    const stmt = this.db.prepare(`
      UPDATE players SET
        games_played = games_played + 1,
        games_won = games_won + ?,
        games_lost = games_lost + ?,
        total_tricks_won = total_tricks_won + ?,
        total_bids_made = total_bids_made + ?,
        bids_successful = bids_successful + ?,
        total_score = total_score + ?,
        best_score = MIN(best_score, ?),
        worst_score = MAX(worst_score, ?),
        current_season_points = current_season_points + ?,
        last_played_at = CURRENT_TIMESTAMP
      WHERE public_key = ?
    `);

    stmt.run(
      isWinner ? 1 : 0,
      isWinner ? 0 : 1,
      tricksWon,
      bidAmount > 0 ? 1 : 0,
      bidAmount > 0 && tricksWon >= bidAmount ? 1 : 0,
      finalScore,
      finalScore,
      finalScore,
      isWinner ? 100 : 10 + tricksWon,
      publicKey
    );

    // Update tier based on points
    this.updatePlayerTier(publicKey);
  }

  /**
   * Update player tier based on season points
   */
  private updatePlayerTier(publicKey: string): void {
    this.db.prepare(`
      UPDATE players SET
        rank_tier = CASE
          WHEN current_season_points >= 1000 THEN 1  -- Gold
          WHEN current_season_points >= 500 THEN 2   -- Silver
          ELSE 3                                     -- Bronze
        END
      WHERE public_key = ?
    `).run(publicKey);
  }

  // =====================================================
  // GAME OPERATIONS
  // =====================================================

  /**
   * Create new game record
   */
  createGame(game: GameRoom): void {
    this.db.prepare(`
      INSERT INTO games (
        id, game_mode, total_rounds, bot_difficulty,
        player_1_pk, player_2_pk, player_3_pk, player_4_pk,
        round_history, final_scores, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      game.id,
      game.gameMode,
      game.totalRounds,
      game.players.find(p => p.type === 'bot')?.id || null,
      game.players[0]?.publicKey || null,
      game.players[1]?.publicKey || null,
      game.players[2]?.publicKey || null,
      game.players[3]?.publicKey || null,
      JSON.stringify(game.roundHistory || []),
      JSON.stringify(game.scores || []),
      'in_progress'
    );

    console.log('[Database] Game created:', game.id);
  }

  /**
   * Complete game record
   */
  completeGame(
    gameId: string,
    winnerPk: string,
    finalScores: number[],
    roundHistory: RoundRecord[]
  ): void {
    this.db.prepare(`
      UPDATE games SET
        completed_at = CURRENT_TIMESTAMP,
        winner_pk = ?,
        final_scores = ?,
        round_history = ?,
        status = 'completed'
      WHERE id = ?
    `).run(winnerPk, JSON.stringify(finalScores), JSON.stringify(roundHistory), gameId);

    console.log('[Database] Game completed:', gameId, 'Winner:', winnerPk.slice(0, 8));
  }

  /**
   * Get game history
   */
  getGameHistory(limit: number = 50): GameRecord[] {
    const rows = this.db.prepare(`
      SELECT * FROM games
      WHERE status = 'completed'
      ORDER BY completed_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(row => ({
      id: row.id,
      gameMode: row.game_mode,
      totalRounds: row.total_rounds,
      botDifficulty: row.bot_difficulty,
      player1Pk: row.player_1_pk,
      player2Pk: row.player_2_pk,
      player3Pk: row.player_3_pk,
      player4Pk: row.player_4_pk,
      winnerPk: row.winner_pk,
      finalScores: JSON.parse(row.final_scores || '[]'),
      roundHistory: JSON.parse(row.round_history || '[]'),
      status: row.status,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    }));
  }

  /**
   * Get games for a specific player
   */
  getPlayerGames(publicKey: string, limit: number = 20): GameRecord[] {
    const rows = this.db.prepare(`
      SELECT * FROM games
      WHERE status = 'completed'
        AND (player_1_pk = ? OR player_2_pk = ? OR player_3_pk = ? OR player_4_pk = ?)
      ORDER BY completed_at DESC
      LIMIT ?
    `).all(publicKey, publicKey, publicKey, publicKey, limit) as any[];

    return rows.map(row => ({
      id: row.id,
      gameMode: row.game_mode,
      totalRounds: row.total_rounds,
      botDifficulty: row.bot_difficulty,
      player1Pk: row.player_1_pk,
      player2Pk: row.player_2_pk,
      player3Pk: row.player_3_pk,
      player4Pk: row.player_4_pk,
      winnerPk: row.winner_pk,
      finalScores: JSON.parse(row.final_scores || '[]'),
      roundHistory: JSON.parse(row.round_history || '[]'),
      status: row.status,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    }));
  }

  // =====================================================
  // NFT REWARDS
  // =====================================================

  /**
   * Record NFT reward (when minted on-chain)
   */
  recordNftReward(reward: NftReward): void {
    this.db.prepare(`
      INSERT INTO nft_rewards (
        player_pk, tournament_id, game_id, tier, metadata_uri,
        signature, on_chain_minted
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      reward.playerPk,
      reward.tournamentId,
      reward.gameId,
      reward.tier,
      reward.metadataUri,
      reward.signature || null,
      reward.onChainMinted ? 1 : 0
    );

    // Update player NFT count
    this.db.prepare(`
      UPDATE players SET
        nfts_earned = nfts_earned + 1,
        last_nft_earned_at = CURRENT_TIMESTAMP
      WHERE public_key = ?
    `).run(reward.playerPk);

    console.log('[Database] NFT reward recorded:', reward.tier, 'for', reward.playerPk.slice(0, 8));
  }

  /**
   * Get NFT rewards for player
   */
  getPlayerNfts(publicKey: string): NftReward[] {
    const rows = this.db.prepare(`
      SELECT * FROM nft_rewards
      WHERE player_pk = ?
      ORDER BY minted_at DESC
    `).all(publicKey) as any[];

    return rows.map(row => ({
      playerPk: row.player_pk,
      tournamentId: row.tournament_id,
      gameId: row.game_id,
      tier: row.tier,
      metadataUri: row.metadata_uri,
      signature: row.signature,
      onChainMinted: row.on_chain_minted === 1,
    }));
  }

  // =====================================================
  // LEADERBOARD
  // =====================================================

  /**
   * Get top players by wins
   */
  getLeaderboard(limit: number = 100): PlayerStats[] {
    const rows = this.db.prepare(`
      SELECT * FROM players
      WHERE games_played >= 3
      ORDER BY current_season_points DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(row => ({
      publicKey: row.public_key,
      username: row.username,
      gamesPlayed: row.games_played,
      gamesWon: row.games_won,
      gamesLost: row.games_lost,
      totalTricksWon: row.total_tricks_won,
      totalBidsMade: row.total_bids_made,
      bidsSuccessful: row.bids_successful,
      totalScore: row.total_score,
      bestScore: row.best_score,
      worstScore: row.worst_score,
      nftsEarned: row.nfts_earned,
      rankTier: row.rank_tier,
      currentSeasonPoints: row.current_season_points,
    }));
  }

  // =====================================================
  // STATS
  // =====================================================

  /**
   * Get overall stats
   */
  getOverallStats(): {
    totalGames: number;
    totalPlayers: number;
    totalNftsMinted: number;
  } {
    const gamesRow = this.db.prepare(`SELECT COUNT(*) as count FROM games WHERE status = 'completed'`).get() as any;
    const playersRow = this.db.prepare(`SELECT COUNT(*) as count FROM players`).get() as any;
    const nftsRow = this.db.prepare(`SELECT COUNT(*) as count FROM nft_rewards`).get() as any;

    return {
      totalGames: gamesRow.count,
      totalPlayers: playersRow.count,
      totalNftsMinted: nftsRow.count,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    console.log('[Database] Connection closed');
  }
}
