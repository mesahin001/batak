# 🗄️ DATABASE INTEGRATION GUIDE

## KURULUM

```bash
cd server
npm install better-sqlite3
```

---

## KULLANIM

### 1. Server.ts'de Başlatma

```typescript
// server/src/server.ts
import { DatabaseManager } from './database/DatabaseManager.js';

// Veritabanını başlat
const db = new DatabaseManager('./data/batak.db');

// SocketServer'a geçir
const io = new SocketServer(server, {
  database: db  // Database manager'ı geç
});
```

### 2. Oyun Başladığında Kayıt Oluştur

```typescript
// SocketServer.ts - handleJoinQueue içinde
const gameRoom = gameStateMachine.getState();

// Veritabanına kaydet
db.createGame(gameRoom);
```

### 3. Oyun Bittiğinde İstatistikleri Güncelle

```typescript
// SocketServer.ts - checkRoundComplete içinde (son round)
if (isLastRound) {
  const winner = getWinner(gameRoom);

  // Her oyuncu için stats güncelle
  for (const player of gameRoom.players) {
    db.updatePlayerStats(
      player.publicKey!,
      player.tricksWon,
      player.bid?.amount || 0,
      player.totalScore,
      winner === player.id
    );
  }

  // Oyunu tamamlandı olarak işaretle
  db.completeGame(
    gameRoom.id,
    winner.publicKey!,
    gameRoom.scores,
    gameRoom.roundHistory
  );
}
```

### 4. cNFT Mintlendiğinde Kaydet

```typescript
// TournamentManager.ts - mintCompressedNftReward sonrası
db.recordNftReward({
  playerPk: winner,
  tournamentId: tournamentId,
  gameId: gameId,
  tier: rewardTier, // 1=Bronze, 2=Silver, 3=Gold
  metadataUri: metadataUri,
  onChainMinted: true
});
```

---

## API ENDPOINT'LER (Opsiyonel)

Client'dan istatistik çekmek için:

```typescript
// server.ts - Express routes
app.get('/api/leaderboard', (req, res) => {
  const leaderboard = db.getLeaderboard(100);
  res.json(leaderboard);
});

app.get('/api/player/:publicKey', (req, res) => {
  const player = db.getPlayer(req.params.publicKey);
  res.json(player);
});

app.get('/api/player/:publicKey/games', (req, res) => {
  const games = db.getPlayerGames(req.params.publicKey, 20);
  res.json(games);
});

app.get('/api/player/:publicKey/nfts', (req, res) => {
  const nfts = db.getPlayerNfts(req.params.publicKey);
  res.json(nfts);
});

app.get('/api/stats', (req, res) => {
  const stats = db.getOverallStats();
  res.json(stats);
});
```

---

## VERİ AKIŞI

```
┌─────────────────────────────────────────────────────┐
│                    OYUN BAŞLADI                     │
├─────────────────────────────────────────────────────┤
│  1. createGame() → games tablosuna kayıt            │
│     - game_id, game_mode, players                  │
│     - status: 'in_progress'                         │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                 HER ROUND SONUNDA                   │
├─────────────────────────────────────────────────────┤
│  2. (İsteğe bağlı) Round stats güncelle            │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                 OYUN BİTTİ                         │
├─────────────────────────────────────────────────────┤
│  3. completeGame() → games tablosu güncelle          │
│     - winner, final_scores, round_history           │
│     - status: 'completed', completed_at             │
│                                                      │
│  4. updatePlayerStats() → Her oyuncu için           │
│     - games_played++, games_won/lost               │
│     - total_tricks_won                              │
│     - best_score, worst_score                       │
│     - current_season_points += (win ? 100 : 10)     │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│             cNFT MİNTLENDİ (Turnuva ise)            │
├─────────────────────────────────────────────────────┤
│  5. recordNftReward() → nft_rewards tablosu         │
│     - player, tier, metadata_uri, tx_id            │
│     - players.nfts_earned++                        │
└─────────────────────────────────────────────────────┘
```

---

## DATABASE YAPISI

```
data/
└── batak.db                    # SQLite database
    ├── players                  # Oyuncu istatistikleri
    ├── games                    # Oyun kayıtları
    ├── nft_rewards              # Mintlenen NFT'ler
    └── (indexes)                # Performans için
```

---

## PRODUCTION'DA POSTGRESQL

SQLite yerine PostgreSQL kullanmak için:

```typescript
// PostgreSQL implementation (future)
import { Pool } from 'pg';

export class PostgresDatabaseManager {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
    // Same interface as DatabaseManager
  }
}
```

---

## SORGU ÖRNEKLERİ

### En iyi 10 oyuncu
```sql
SELECT * FROM players
ORDER BY current_season_points DESC
LIMIT 10;
```

### Bir oyuncunun son oyunları
```sql
SELECT * FROM games
WHERE player_1_pk = ? OR player_2_pk = ? ...
ORDER BY completed_at DESC
LIMIT 20;
```

### Kazanılan NFT'ler
```sql
SELECT tier, COUNT(*) as count
FROM nft_rewards
GROUP BY tier;
```

---

## MIGRATION (Mevcut sistem için)

Mevcut oyunları migrate etmek için:

```typescript
// Migrate existing in-memory games
async function migrateExistingGames() {
  const rooms = matchmaker.getAllRooms();

  for (const [id, room] of rooms) {
    if (room.gameMachine.getState().state === 'finished') {
      db.createGame(room.gameMachine.getState());
      db.completeGame(...);
    }
  }
}
```
