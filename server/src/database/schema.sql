-- BATAK TOURNAMENT - Database Schema
-- PostgreSQL or SQLite compatible

-- =====================================================
-- PLAYERS - Oyuncu kayıtları ve istatistikleri
-- =====================================================
CREATE TABLE players (
  -- Primary identifiers
  public_key TEXT PRIMARY KEY,        -- Solana wallet address
  username TEXT,                       -- Optional display name
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Statistics (updated after each game)
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,

  -- Batak specific stats
  total_tricks_won INTEGER DEFAULT 0,     -- Toplam kazanılan trick
  total_bids_made INTEGER DEFAULT 0,      -- Toplam bid sayısı
  bids_successful INTEGER DEFAULT 0,      -- Başarılı bid (bid ≥ tricks)

  -- Scoring
  total_score INTEGER DEFAULT 0,          -- Kümülatif skor (düşük iyidir)
  best_score INTEGER DEFAULT 9999,       -- En iyi skor (en düşük)
  worst_score INTEGER DEFAULT 0,         -- En kötü skor (en yüksek)

  -- NFT Rewards
  nfts_earned INTEGER DEFAULT 0,         -- Kazanılan cNFT sayısı
  last_nft_earned_at TIMESTAMP,

  -- Rankings
  rank_tier INTEGER DEFAULT 3,           -- 1=Bronze, 2=Silver, 3=Gold (başlangıç)
  current_season_points INTEGER DEFAULT 0,

  -- Timestamps
  last_played_at TIMESTAMP
);

-- Index for leaderboard queries
CREATE INDEX idx_players_rank ON players(rank_tier, current_season_points DESC);
CREATE INDEX idx_players_games_won ON players(games_won DESC);


-- =====================================================
-- GAMES - Oyun kayıtları
-- =====================================================
CREATE TABLE games (
  id TEXT PRIMARY KEY,                   -- UUID / room ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  -- Game settings
  game_mode TEXT NOT NULL,               -- 'koz_maca' | 'ihaleli_batak'
  total_rounds INTEGER DEFAULT 5,        -- 5, 7, 9, 11
  bot_difficulty TEXT,                   -- 'easy' | 'normal' | 'hard' (null = all human)

  -- Player references
  player_1_pk TEXT,
  player_2_pk TEXT,
  player_3_pk TEXT,
  player_4_pk TEXT,

  -- Winner
  winner_pk TEXT REFERENCES players(public_key),
  final_scores TEXT,                     -- JSON array: [score1, score2, score3, score4]

  -- Tournament (if applicable)
  tournament_id INTEGER,                 -- References on-chain tournament
  tournament_tier INTEGER,               -- 1=Bronze, 2=Silver, 3=Gold

  -- Round history (compressed)
  round_history TEXT,                    -- JSON: RoundRecord[]

  -- Status
  status TEXT DEFAULT 'in_progress',     -- 'in_progress' | 'completed' | 'abandoned'
  abandoned_reason TEXT                  -- Why game ended early
);

CREATE INDEX idx_games_completed ON games(completed_at DESC);
CREATE INDEX idx_games_winner ON games(winner_pk);
CREATE INDEX idx_games_player ON games(player_1_pk); -- Also query by each player


-- =====================================================
-- GAME_PLAYERS - Oyuncu-oyun ilişkisi (detaylı stats)
-- =====================================================
CREATE TABLE game_players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id TEXT REFERENCES games(id),
  player_pk TEXT REFERENCES players(public_key),

  -- Player position in game
  position INTEGER NOT NULL,             -- 0, 1, 2, 3 (index in players array)

  -- Performance
  bid_amount INTEGER,                    -- Bid amount (0 for pass)
  tricks_won INTEGER DEFAULT 0,
  round_scores TEXT,                     -- JSON: [round1, round2, ...]
  final_score INTEGER,

  -- Outcome
  is_winner BOOLEAN DEFAULT FALSE,
  rank_position INTEGER,                 -- 1st, 2nd, 3rd, 4th

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(game_id, player_pk)
);

CREATE INDEX idx_game_players_player ON game_players(player_pk);
CREATE INDEX idx_game_players_game ON game_players(game_id);


-- =====================================================
-- NFT_REWARDS - Mintlenen cNFT kayıtları
-- =====================================================
CREATE TABLE nft_rewards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  minted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Player
  player_pk TEXT REFERENCES players(public_key),

  -- Tournament info
  tournament_id INTEGER,
  game_id TEXT REFERENCES games(id),

  -- NFT details
  tier INTEGER NOT NULL,                 -- 1=Bronze, 2=Silver, 3=Gold
  metadata_uri TEXT,                     -- IPFS/Arweave URI

  -- On-chain confirmation
  signature TEXT,                        -- Solana transaction signature
  on_chain_minted BOOLEAN DEFAULT FALSE,
  mint_tx_id TEXT,                       -- Transaction ID

  -- Image
  image_url TEXT                         -- URL to NFT image
);

CREATE INDEX idx_nft_rewards_player ON nft_rewards(player_pk);
CREATE INDEX idx_nft_rewards_tier ON nft_rewards(tier);


-- =====================================================
-- LEADERBOARD - Liderlik tablosu (cache)
-- =====================================================
-- Her saat güncellenen snapshot
CREATE TABLE leaderboard_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Top players
  rank_1_pk TEXT,
  rank_1_score INTEGER,
  rank_2_pk TEXT,
  rank_2_score INTEGER,
  rank_3_pk TEXT,
  rank_3_score INTEGER,

  -- Most active
  most_games_player_pk TEXT,
  most_games_count INTEGER,

  -- Best win rate
  best_winrate_player_pk TEXT,
  best_winrate_percentage REAL
);


-- =====================================================
-- DAILY_STATS - Günlük istatistikler
-- =====================================================
CREATE TABLE daily_stats (
  date DATE PRIMARY KEY,
  games_played INTEGER DEFAULT 0,
  unique_players INTEGER DEFAULT 0,
  average_game_duration_minutes INTEGER,
  nfts_minted INTEGER DEFAULT 0
);


-- =====================================================
-- VIEWS - Sık kullanılan sorgular
-- =====================================================

-- Player leaderboard view
CREATE VIEW player_leaderboard AS
SELECT
  public_key,
  username,
  games_played,
  games_won,
  CASE
    WHEN games_played > 0 THEN ROUND((games_won::FLOAT / games_played::FLOAT) * 100, 2)
    ELSE 0
  END as win_rate,
  total_tricks_won,
  nfts_earned,
  rank_tier,
  current_season_points
FROM players
WHERE games_played >= 3  -- Minimum games to appear
ORDER BY current_season_points DESC;

-- Recent games view
CREATE VIEW recent_games AS
SELECT
  g.id,
  g.game_mode,
  g.completed_at,
  g.winner_pk,
  p1.username as player_1_name,
  p2.username as player_2_name,
  p3.username as player_3_name,
  p4.username as player_4_name,
  g.final_scores
FROM games g
LEFT JOIN players p1 ON g.player_1_pk = p1.public_key
LEFT JOIN players p2 ON g.player_2_pk = p2.public_key
LEFT JOIN players p3 ON g.player_3_pk = p3.public_key
LEFT JOIN players p4 ON g.player_4_pk = p4.public_key
WHERE g.status = 'completed'
ORDER BY g.completed_at DESC
LIMIT 100;
