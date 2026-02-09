/**
 * SQLite to PostgreSQL Migration Script
 *
 * This script migrates data from SQLite to PostgreSQL.
 * Use this when you need to scale beyond SQLite's capacity.
 *
 * Usage:
 *   1. Set up PostgreSQL database
 *   2. Configure DATABASE_URL in .env
 *   3. Run: npm run migrate-to-postgres
 */

import Database from 'better-sqlite3';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

interface MigrationConfig {
  sqlitePath: string;
  postgresUrl: string;
  batchSize?: number;
}

export class SQLiteToPostgresMigrator {
  private sqlite: Database.Database;
  private postgres: Pool;
  private batchSize: number;

  constructor(config: MigrationConfig) {
    this.sqlite = new Database(config.sqlitePath);
    this.postgres = new Pool({ connectionString: config.postgresUrl });
    this.batchSize = config.batchSize || 1000;
  }

  /**
   * Initialize PostgreSQL schema
   */
  private async initPostgresSchema(): Promise<void> {
    const schema = `
      -- Players table
      CREATE TABLE IF NOT EXISTS players (
        public_key VARCHAR(44) PRIMARY KEY,
        username VARCHAR(100),
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
        id VARCHAR(36) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        game_mode VARCHAR(50) NOT NULL,
        total_rounds INTEGER DEFAULT 5,
        bot_difficulty VARCHAR(20),
        player_1_pk VARCHAR(44),
        player_2_pk VARCHAR(44),
        player_3_pk VARCHAR(44),
        player_4_pk VARCHAR(44),
        winner_pk VARCHAR(44),
        final_scores TEXT,
        round_history TEXT,
        tournament_id INTEGER,
        tournament_tier INTEGER,
        status VARCHAR(20) DEFAULT 'in_progress',
        abandoned_reason TEXT
      );

      -- NFT rewards table
      CREATE TABLE IF NOT EXISTS nft_rewards (
        id SERIAL PRIMARY KEY,
        minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        player_pk VARCHAR(44),
        tournament_id INTEGER,
        game_id VARCHAR(36),
        tier INTEGER NOT NULL,
        metadata_uri TEXT,
        signature TEXT,
        on_chain_minted BOOLEAN DEFAULT FALSE,
        mint_tx_id TEXT,
        image_url TEXT
      );

      -- Auth table
      CREATE TABLE IF NOT EXISTS auth (
        player_id VARCHAR(44) PRIMARY KEY,
        auth_type VARCHAR(20) NOT NULL DEFAULT 'wallet',
        email VARCHAR(255) UNIQUE,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES players(public_key)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_players_rank ON players(rank_tier, current_season_points DESC);
      CREATE INDEX IF NOT EXISTS idx_players_games_won ON players(games_won DESC);
      CREATE INDEX IF NOT EXISTS idx_games_completed ON games(completed_at DESC);
      CREATE INDEX IF NOT EXISTS idx_nft_rewards_player ON nft_rewards(player_pk);
      CREATE INDEX IF NOT EXISTS idx_auth_email ON auth(email);
    `;

    await this.postgres.query(schema);
    console.log('[Migration] PostgreSQL schema initialized');
  }

  /**
   * Migrate players table
   */
  private async migratePlayers(): Promise<number> {
    const rows = this.sqlite.prepare(`SELECT * FROM players`).all() as any[];
    let migrated = 0;

    for (let i = 0; i < rows.length; i += this.batchSize) {
      const batch = rows.slice(i, i + this.batchSize);
      const client = await this.postgres.connect();

      try {
        await client.query('BEGIN');

        for (const row of batch) {
          await client.query(
            `INSERT INTO players (
              public_key, username, created_at, games_played, games_won, games_lost,
              total_tricks_won, total_bids_made, bids_successful, total_score,
              best_score, worst_score, nfts_earned, last_nft_earned_at,
              rank_tier, current_season_points, last_played_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (public_key) DO NOTHING`,
            [
              row.public_key,
              row.username,
              row.created_at,
              row.games_played,
              row.games_won,
              row.games_lost,
              row.total_tricks_won,
              row.total_bids_made,
              row.bids_successful,
              row.total_score,
              row.best_score,
              row.worst_score,
              row.nfts_earned,
              row.last_nft_earned_at,
              row.rank_tier,
              row.current_season_points,
              row.last_played_at,
            ]
          );
          migrated++;
        }

        await client.query('COMMIT');
        console.log(`[Migration] Players batch ${i / this.batchSize + 1}: ${migrated}/${rows.length}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    return migrated;
  }

  /**
   * Migrate games table
   */
  private async migrateGames(): Promise<number> {
    const rows = this.sqlite.prepare(`SELECT * FROM games`).all() as any[];
    let migrated = 0;

    for (let i = 0; i < rows.length; i += this.batchSize) {
      const batch = rows.slice(i, i + this.batchSize);
      const client = await this.postgres.connect();

      try {
        await client.query('BEGIN');

        for (const row of batch) {
          await client.query(
            `INSERT INTO games (
              id, created_at, completed_at, game_mode, total_rounds, bot_difficulty,
              player_1_pk, player_2_pk, player_3_pk, player_4_pk, winner_pk,
              final_scores, round_history, tournament_id, tournament_tier,
              status, abandoned_reason
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (id) DO NOTHING`,
            [
              row.id,
              row.created_at,
              row.completed_at,
              row.game_mode,
              row.total_rounds,
              row.bot_difficulty,
              row.player_1_pk,
              row.player_2_pk,
              row.player_3_pk,
              row.player_4_pk,
              row.winner_pk,
              row.final_scores,
              row.round_history,
              row.tournament_id,
              row.tournament_tier,
              row.status,
              row.abandoned_reason,
            ]
          );
          migrated++;
        }

        await client.query('COMMIT');
        console.log(`[Migration] Games batch ${i / this.batchSize + 1}: ${migrated}/${rows.length}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    return migrated;
  }

  /**
   * Migrate nft_rewards table
   */
  private async migrateNftRewards(): Promise<number> {
    const rows = this.sqlite.prepare(`SELECT * FROM nft_rewards`).all() as any[];
    let migrated = 0;

    for (let i = 0; i < rows.length; i += this.batchSize) {
      const batch = rows.slice(i, i + this.batchSize);
      const client = await this.postgres.connect();

      try {
        await client.query('BEGIN');

        for (const row of batch) {
          await client.query(
            `INSERT INTO nft_rewards (
              id, minted_at, player_pk, tournament_id, game_id, tier,
              metadata_uri, signature, on_chain_minted, mint_tx_id, image_url
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              row.id,
              row.minted_at,
              row.player_pk,
              row.tournament_id,
              row.game_id,
              row.tier,
              row.metadata_uri,
              row.signature,
              row.on_chain_minted,
              row.mint_tx_id,
              row.image_url,
            ]
          );
          migrated++;
        }

        await client.query('COMMIT');
        console.log(`[Migration] NFT rewards batch ${i / this.batchSize + 1}: ${migrated}/${rows.length}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    return migrated;
  }

  /**
   * Migrate auth table
   */
  private async migrateAuth(): Promise<number> {
    const rows = this.sqlite.prepare(`SELECT * FROM auth`).all() as any[];
    let migrated = 0;

    for (let i = 0; i < rows.length; i += this.batchSize) {
      const batch = rows.slice(i, i + this.batchSize);
      const client = await this.postgres.connect();

      try {
        await client.query('BEGIN');

        for (const row of batch) {
          await client.query(
            `INSERT INTO auth (
              player_id, auth_type, email, password_hash, created_at, last_login_at
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (player_id) DO NOTHING`,
            [
              row.player_id,
              row.auth_type,
              row.email,
              row.password_hash,
              row.created_at,
              row.last_login_at,
            ]
          );
          migrated++;
        }

        await client.query('COMMIT');
        console.log(`[Migration] Auth batch ${i / this.batchSize + 1}: ${migrated}/${rows.length}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    return migrated;
  }

  /**
   * Verify migration by comparing row counts
   */
  private async verifyMigration(): Promise<boolean> {
    const sqliteStats = {
      players: this.sqlite.prepare(`SELECT COUNT(*) as count FROM players`).get() as { count: number },
      games: this.sqlite.prepare(`SELECT COUNT(*) as count FROM games`).get() as { count: number },
      nft_rewards: this.sqlite.prepare(`SELECT COUNT(*) as count FROM nft_rewards`).get() as { count: number },
      auth: this.sqlite.prepare(`SELECT COUNT(*) as count FROM auth`).get() as { count: number },
    };

    const pgStats = {
      players: (await this.postgres.query(`SELECT COUNT(*) FROM players`)).rows[0].count,
      games: (await this.postgres.query(`SELECT COUNT(*) FROM games`)).rows[0].count,
      nft_rewards: (await this.postgres.query(`SELECT COUNT(*) FROM nft_rewards`)).rows[0].count,
      auth: (await this.postgres.query(`SELECT COUNT(*) FROM auth`)).rows[0].count,
    };

    console.log('\n[Migration] Verification:');
    console.log('  Players:', sqliteStats.players.count, '→', pgStats.players);
    console.log('  Games:', sqliteStats.games.count, '→', pgStats.games);
    console.log('  NFT Rewards:', sqliteStats.nft_rewards.count, '→', pgStats.nft_rewards);
    console.log('  Auth:', sqliteStats.auth.count, '→', pgStats.auth);

    return (
      sqliteStats.players.count === pgStats.players &&
      sqliteStats.games.count === pgStats.games &&
      sqliteStats.nft_rewards.count === pgStats.nft_rewards &&
      sqliteStats.auth.count === pgStats.auth
    );
  }

  /**
   * Run the full migration
   */
  async migrate(): Promise<void> {
    console.log('[Migration] Starting SQLite to PostgreSQL migration...');

    try {
      // Initialize PostgreSQL schema
      await this.initPostgresSchema();

      // Migrate each table
      console.log('\n[Migration] Migrating players...');
      await this.migratePlayers();

      console.log('\n[Migration] Migrating games...');
      await this.migrateGames();

      console.log('\n[Migration] Migrating NFT rewards...');
      await this.migrateNftRewards();

      console.log('\n[Migration] Migrating auth...');
      await this.migrateAuth();

      // Verify migration
      console.log('\n[Migration] Verifying migration...');
      const verified = await this.verifyMigration();

      if (verified) {
        console.log('\n✅ Migration completed successfully!');
      } else {
        console.log('\n⚠️  Migration completed with verification warnings. Please check the data.');
      }
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Clean up connections
   */
  async close(): Promise<void> {
    this.sqlite.close();
    await this.postgres.end();
    console.log('[Migration] Connections closed');
  }
}

/**
 * Main migration function
 */
export async function runMigration(): Promise<void> {
  const config: MigrationConfig = {
    sqlitePath: process.env.SQLITE_PATH || './data/batak.db',
    postgresUrl: process.env.DATABASE_URL || '',
    batchSize: 1000,
  };

  if (!config.postgresUrl) {
    throw new Error('DATABASE_URL environment variable is required. Set it in your .env file.');
  }

  const migrator = new SQLiteToPostgresMigrator(config);

  try {
    await migrator.migrate();
  } finally {
    await migrator.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => {
      console.log('[Migration] Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] Error:', error);
      process.exit(1);
    });
}
