# 📚 BATAK TOURNAMENT - API DOKÜMANTASYONU

## WebSocket API (Socket.IO)

### Client → Server Events

```typescript
// Oyuncu matchmaking'e katılır
socket.emit('JOIN_QUEUE', {
  publicKey: string,        // Solana wallet address
  botDifficulty: 'easy' | 'normal' | 'hard',
  botCount: 0-3,             // Bot sayısı (0-4 human, 1-3 human+bot)
  gameMode: 'koz_maca' | 'ihaleli_batak'
});

// Oyuncu matchmaking'ten ayrılır
socket.emit('LEAVE_QUEUE');

// Kart oynanır
socket.emit('PLAY_CARD', {
  cardId: string              // Oynanan kart ID'si
});

// Bidding yapılır
socket.emit('BID_TRUMP', {
  suit: 'spades',            // Her zaman spades (koz_maca)
  amount: number             // Bid miktarı (1-13) veya 0 (pass)
});

// Sonraki round isteği (multi-round oyunlarda)
socket.emit('REQUEST_NEXT_ROUND');
```

### Server → Client Events

```typescript
// Eşleşme bulundu
socket.on('MATCH_FOUND', {
  roomId: string,
  gameState: GameState       // Tam oyun state (kullanıcı için özelleştirilmiş)
});

// Oyun state güncellendi
socket.on('GAME_STATE_UPDATE', GameState);

// Kart oynandı bildirimi
socket.on('CARD_PLAYED', {
  playerId: string,
  cardId: string
});

// Round tamamlandı
socket.on('ROUND_COMPLETE', {
  roundNumber: number,
  scores: number[],           // Her oyuncunun round skoru
  winner: string              // Round kazananı
});

// Sonraki round başlıyor
socket.on('NEXT_ROUND_STARTING', {
  roundNumber: number
});

// Oyun bitti
socket.on('GAME_COMPLETE', {
  winner: string,
  players: PlayerState[],
  roundHistory: RoundRecord[]
});

// Hata
socket.on('ERROR', {
  message: string
});

// Queue status güncellemesi
socket.on('QUEUE_STATUS', {
  waiting: number,            // Bekleyen oyuncu sayısı
  totalNeeded: number         // Gereken toplam (genelde 4)
});
```

---

## REST API (Express - Önerilen)

### Player Stats

```http
GET /api/player/:publicKey
```

**Response:**
```json
{
  "publicKey": "...",
  "username": "...",
  "gamesPlayed": 25,
  "gamesWon": 12,
  "gamesLost": 13,
  "totalTricksWon": 156,
  "bestScore": -15,
  "worstScore": 120,
  "nftsEarned": 3,
  "rankTier": 2,
  "currentSeasonPoints": 750
}
```

### Leaderboard

```http
GET /api/leaderboard?limit=100
```

**Response:**
```json
[
  {
    "publicKey": "...",
    "username": "...",
    "gamesPlayed": 50,
    "gamesWon": 30,
    "winRate": 60.0,
    "totalTricksWon": 350,
    "nftsEarned": 5,
    "rankTier": 1,
    "currentSeasonPoints": 2500
  },
  ...
]
```

### Player Game History

```http
GET /api/player/:publicKey/games?limit=20
```

**Response:**
```json
[
  {
    "id": "game-abc123",
    "gameMode": "koz_maca",
    "completedAt": "2025-02-05T10:30:00Z",
    "winnerPk": "...",
    "finalScores": [50, 120, -30, 80],
    "roundHistory": [...]
  },
  ...
]
```

### Player NFTs

```http
GET /api/player/:publicKey/nfts
```

**Response:**
```json
[
  {
    "tier": 3,
    "metadataUri": "https://...",
    "mintedAt": "2025-02-05T10:30:00Z",
    "onChainMinted": true
  },
  ...
]
```

### Overall Stats

```http
GET /api/stats
```

**Response:**
```json
{
  "totalGames": 1523,
  "totalPlayers": 450,
  "totalNftsMinted": 89
}
```

---

## Solana Program API

### Instructions

#### create_tournament

Turnuva oluşturur (sadece authority)

**Accounts:**
- `tournament`: PDA (tournament, authority, tournament_id)
- `authority`: Signer, payer
- `merkleTree`: Unchecked (Bubblegum tree)
- `system_program`: System

**Args:**
- `tournament_id`: u64
- `reward_tier`: u64 (1=Bronze, 2=Silver, 3=Gold)
- `max_players`: u64 (must be 4)

#### register_player

Oyuncuyu turnuvaya kaydeder

**Accounts:**
- `tournament`: PDA (tournament, authority, tournament_id)
- `registration`: PDA (registration, tournament, player)
- `player`: Signer, payer
- `system_program`: System

**Args:**
- `tournament_id`: u64

#### start_tournament

Turnuvayı başlatır (4 oyuncu hazır olunca)

**Accounts:**
- `tournament`: Account, mut
- `authority`: Signer

#### submit_match_result

Kazananı ilan eder (sadece authority/server)

**Accounts:**
- `tournament`: Account, mut
- `server`: Signer

**Args:**
- `tournament_id`: u64
- `winner`: Pubkey
- `server_signature`: [u8; 64]

#### mint_compressed_nft_reward

Kazanana cNFT mintler (authority)

**Accounts:**
- `tournament`: Account
- `merkleTree`: Unchecked
- `authority`: Signer

**Args:**
- `tournament_id`: u64
- `winner`: Pubkey
- `metadata_uri`: String

---

## Veritabanı API (DatabaseManager)

### Player Operations

```typescript
// Oyuncu getir veya oluştur
db.getOrCreatePlayer(publicKey, username?)

// Oyuncu bilgisi
db.getPlayer(publicKey)

// İstatistik güncelle (oyun bittiğinde)
db.updatePlayerStats(
  publicKey,
  tricksWon,
  bidAmount,
  finalScore,
  isWinner
)
```

### Game Operations

```typescript
// Yeni oyun kaydı oluştur
db.createGame(gameRoom)

// Oyunu tamamlandı olarak işaretle
db.completeGame(
  gameId,
  winnerPk,
  finalScores,
  roundHistory
)

// Oyun geçmişi
db.getGameHistory(limit)
db.getPlayerGames(publicKey, limit)
```

### NFT Operations

```typescript
// cNFT kaydı oluştur
db.recordNftReward({
  playerPk: string,
  tournamentId: number,
  gameId: string,
  tier: number,           // 1=Bronze, 2=Silver, 3=Gold
  metadataUri: string,
  onChainMinted: boolean
})

// Oyuncunun NFT'leri
db.getPlayerNfts(publicKey)
```

### Leaderboard

```typescript
// İlk 100 oyuncu
db.getLeaderboard(100)
```

---

## Game State Types

### GameState

```typescript
interface GameRoom {
  id: string;
  state: 'lobby' | 'bidding' | 'playing' | 'scoring' | 'finished';
  players: PlayerState[];
  currentTrick: Trick;
  tricks: Trick[];
  trumpSuit: Suit | null;
  currentPlayerIndex: number;
  dealerIndex: number;
  bids: Bid[];
  scores: number[];
  currentRound: number;
  totalRounds: number;
  roundHistory: RoundRecord[];
  winner: string | null;
  gameMode: 'koz_maca' | 'ihaleli_batak';
  createdAt: Date;
  lastUpdated: Date;
}
```

### PlayerState

```typescript
interface PlayerState {
  id: string;
  name: string;
  type: 'human' | 'bot';
  hand: Card[];
  tricksWon: number;
  score: number;              // Current round
  totalScore: number;         // Cumulative
  roundScores: number[];
  bid: Bid | null;
  publicKey?: string;
}
```

### Card

```typescript
interface Card {
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  rank: 2-14;  // 2=Two, ..., 11=Jack, 12=Queen, 13=King, 14=Ace
  id: string;
}
```

### Bid

```typescript
interface Bid {
  playerId: string;
  suit: Suit;
  amount: number;  // 0=pass, 1-13=bid
  type?: 'normal' | 'el_almaz' | 'king';
}
```

---

## Environment Variables

### Server (.env)

```bash
PORT=3001
NODE_ENV=development

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=
SOLANA_NETWORK=devnet
PROGRAM_ID=5ZdgoyBDknoZ8tDYMDXf8zCUQ7FxuaDbK4QffAgSfA9h
MERKLE_TREE=

# Game
MAX_PLAYERS=4
DEFAULT_BOT_DIFFICULTY=normal
GAME_TIMEOUT=300000
```

### Client (.env)

```bash
VITE_SERVER_URL=ws://localhost:3001
VITE_SOLANA_NETWORK=devnet
VITE_PROGRAM_ID=5ZdgoyBDknoZ8tDYMDXf8zCUQ7FxuaDbK4QffAgSfA9h
VITE_DEFAULT_BOT_DIFFICULTY=normal
VITE_DEFAULT_BOT_COUNT=3
```

---

## Hata Kodları

### Socket Hataları

| Hata | Sebep | Çözüm |
|------|-------|-------|
| `game_error` | Geçersiz hamle | Client'da `selectedCard` temizle |
| `TournamentFull` | 4 oyuncu dolu | Yeni oyun başlat |
| `InvalidTournamentState` | Yanlış durumda işlem | State kontrol et |

### Solana Program Hataları

| Code | Mesaj | Çözüm |
|------|-------|-------|
| 6000 | TournamentFull | Oyun dolu |
| 6001 | TournamentAlreadyStarted | Başladıktan sonra kayıt olamaz |
| 6002 | TournamentAlreadyEnded | Bitmiş turnuvaya işlem yapılamaz |
| 6003 | PlayerAlreadyRegistered | Zaten kayıtlı |
| 6004 | InvalidServerSignature | Sadece authority submit edebilir |
| 6005 | TournamentNotFound | Turnuva bulunamadı |
| 6006 | Unauthorized | Yetkisiz işlem |
| 6007 | InvalidTournamentState | Yanlış state |
| 6008 | MerkleTreeFull | Merkle tree dolu |
| 6009 | InvalidRewardTier | Tier 1-3 olmalı |

---

## Rate Limiting (Önerilen)

```typescript
// Express middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000,  // 1 dakika
  max: 100,               // 100 istek
  message: 'Too many requests'
});

app.use('/api/', limiter);
```

---

## Webhook'ler (Gelecek)

```typescript
// Solana on-chain events için
POST /api/webhook/solana
{
  "eventType": "tournament_complete",
  "tournamentId": 1234,
  "winner": "...",
  "signature": "..."
}

// cNFT mint tamamlandığında
POST /api/webhook/nft-minted
{
  "mintTx": "...",
  "player": "...",
  "tier": 3
}
```

---

*Bu API dokümantasyonu tüm mevcut endpoint'leri ve veri yapılarını kapsar.*
