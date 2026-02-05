# 📚 BATAK TOURNAMENT - DOKÜMANTASYON İNDEKSİ

## 🎯 Hızlı Erişim

| Doküman | Konu | Hedef Kitle |
|----------|------|-------------|
| **README.md** | Proje genel bakış | Yeni geliştiriciler |
| **CHANGELOG-2025-02-05.md** | Son değişiklikler | Tüm ekip |
| **CLAUDE.md** | Geliştirici rehberi | AI asistanlar |
| **docs/API-REFERENCE.md** | API dokümantasyonu | Frontend/backend devs |
| **docs/DEPLOYMENT-GUIDE.md** | Deploy rehberi | DevOps |
| **docs/PRODUCTION-ROADMAP.md** | Mimari planı | Mimari |
| **server/src/database/README.md** | Database kullanımı | Backend devs |

---

## 📁 KLASÖR YAPISI

```
batak/
├── README.md                          # Proje başlangıç
├── CHANGELOG-2025-02-05.md             # 🆕 Oturum özeti
├── CLAUDE.md                           # 🆕 AI rehber (600 satır)
│
├── client/                             # React + Vite PWA
│   ├── src/
│   │   ├── components/                # UI components
│   │   ├── socket/                   # WebSocket client
│   │   ├── solana/                   # Wallet adapter
│   │   └── types/                    # TypeScript types
│   ├── public/
│   │   ├── manifest.json             # 🆕 PWA manifest güncel
│   │   └── images/                   # 🆕 PWA iconlar (13 adet)
│   └── package.json
│
├── server/                             # Node.js + Socket.IO
│   ├── src/
│   │   ├── game/                     # Oyun mantığı
│   │   │   ├── GameStateMachine.ts  # State machine
│   │   │   ├── Card.ts               # Kart işlemleri
│   │   │   ├── Deck.ts               # Deste işlemleri
│   │   │   ├── TurnValidator.ts      # Hamle doğrulama
│   │   │   ├── Scoring.ts            # Skor hesaplama
│   │   │   └── Player.ts             # Oyuncu state
│   │   ├── bots/                     # Bot AI
│   │   │   ├── strategies/           # Easy/Normal/Hard
│   │   │   └── HandAnalyzer.ts       # El analizi
│   │   ├── socket/                   # Socket.IO sunucu
│   │   │   └── SocketServer.ts       # Event handlers
│   │   ├── matchmaker/               # Eşleştirme
│   │   │   └── Matchmaker.ts         # Oyun odaları
│   │   ├── solana/                   # Solana entegrasyon
│   │   │   ├── TournamentManager.ts  # Turnuva işlemleri
│   │   │   ├── CNFTMinter.ts         # cNFT mintleme
│   │   │   └── MerkleTreeManager.ts   # Merkle tree
│   │   └── database/                 # 🆕 Veritabanı
│   │       ├── DatabaseManager.ts    # SQLite manager
│   │       ├── schema.sql            # DB şeması
│   │       └── README.md             # Kullanım kılavuzu
│   └── package.json                  # 🆕 better-sqlite3
│
├── solana-program/                    # Anchor program
│   ├── Anchor.toml                   # 🆕 Devnet program ID
│   ├── programs/
│   │   └── batak-tournament/
│   │       └── src/
│   │           ├── lib.rs             # 🆕 Deploy edildi
│   │           ├── state.rs
│   │           ├── error.rs
│   │           └── instructions/
│   └── playground/                   # 🆕 Playground test dosyaları
│       ├── lib.rs                    # Kopyalanacak kod
│       └── test-*.ts                # Test suiteleri
│
├── metadata/                          # NFT metadata
│   ├── images/                       # 🆕 NFT görselleri
│   │   ├── gold-tier.png            # 1st place
│   │   ├── silver-tier.png          # 2nd place
│   │   ├── bronze-tier.png          # 3rd place
│   │   ├── legendary-tier.png       # Special
│   │   └── *.svg                    # SVG kaynakları
│   ├── gold-tier-metadata.json       # 🆕
│   ├── silver-tier-metadata.json     # 🆕
│   ├── bronze-tier-metadata.json     # 🆕
│   └── legendary-tier-metadata.json  # 🆕
│
├── scripts/                           # Utility scripts
│   ├── convert-svg-to-png.js         # 🆕 SVG → PNG
│   ├── generate-icons.js             # 🆕 Icon oluşturma
│   ├── bubblewrap-build.sh           # APK build
│   ├── solana-deploy.sh              # 🆕 Solana deploy
│   └── local-dev.sh                 # Local dev
│
├── docs/                              # Dokümantasyon
│   ├── API-REFERENCE.md               # 🆕 API dokümanı
│   ├── DEPLOYMENT-GUIDE.md           # 🆕 Deploy rehberi
│   └── PRODUCTION-ROADMAP.md          # 🆕 Mimari planı
│
├── docker-compose.yml                 # 🆕 Full stack
├── server/Dockerfile                   # 🆕 Container image
├── .env.production.example             # 🆕 Production env template
└── package.json                       # Root scripts
```

**🆕 = Bu oturumda eklenen/güncellenen**

---

## 📖 OKUMA SIRASI

### Yeni Başlayanlar İçin

1. **README.md** - Proje nedir, nasıl çalışır
2. **CLAUDE.md** - "Development Commands" bölümü
3. **server/src/database/README.md** - Database kurulumu

### Geliştiriciler İçin

1. **CLAUDE.md** - Tam okuma (architecture, issues, solutions)
2. **docs/API-REFERENCE.md** - API endpoint'leri
3. **docs/PRODUCTION-ROADMAP.md** - Scaling stratejisi

### DevOps İçin

1. **docs/DEPLOYMENT-GUIDE.md** - Deploy adımları
2. **docs/PRODUCTION-ROADMAP.md** - 3 seviye mimari
3. **docker-compose.yml** - Full stack tanımı

### Solana Geliştiricileri İçin

1. **CLAUDE.md** - "Solana Integration" bölümü
2. **solana-program/playground/lib.rs** - Program kodu
3. **solana-program/playground/test-final.ts** - Test örnekleri

---

## 🎯 ÖNEMLİ KONSEPTLER

### Server-Authoritative Architecture

**Kritik:** Tüm oyun mantığı server-side doğrulanır.

```
Client → Socket.IO → TurnValidator → GameStateMachine → Broadcast → Client
```

**Asla unutma:** Client input'a güvenme, her zaman server'da doğrula.

### Player Identification

**4-player PvP:**
- **Server:** `publicKey` (Solana wallet)
- **Client:** `publicKey.toString()` ile `player.id` eşleştir
- ❌ YANLIŞ: `p.type === 'human'` kullanma

### Game State Persistence

**Mevcut durum:**
- ✅ İstatistikler → SQLite (persistent)
- ✅ Game history → SQLite (persistent)
- ❌ Aktif oyun state → RAM (kaybolur riski)

**Production upgrade:**
- Redis state persistence
- Server restart sonrası recovery

### Solana cNFT Akışı

```
Oyun biter → submit_match_result (on-chain) → mint_compressed_nft_reward (on-chain)
                                                                      ↓
                                                        db.recordNftReward (offline)
```

---

## 🚀 HIZLI KOMUTLAR

### Geliştirme Başlatma
```bash
# Server
cd server && npm run dev

# Client
cd client && npm run dev
```

### Test
```bash
cd server && npm test
cd solana-program && anchor test
```

### Build
```bash
cd server && npm run build
cd client && npm run build
cd solana-program && anchor build
```

### Deploy
```bash
# Docker
docker-compose up -d

# APK
./scripts/bubblewrap-build.sh

# Solana (Playground)
# https://beta.solpg.io
```

---

## 📊 PROJE DURUMU

### Tamamlanma Oranları

| Bileşen | Durum |
|---------|-------|
| Oyun Mantığı | ✅ 100% |
| Bot AI | ✅ 100% |
| Server API | ✅ 100% |
| Client UI | ✅ 85% |
| Solana Program | 🟡 80% (deploy edildi, cNFT entegrasyonu bekliyor) |
| Database | 🟡 50% (tasarım hazır, entegrasyon gerekli) |
| NFT Görseller | ✅ 100% |
| PWA Iconlar | ✅ 100% |
| APK Build | ❌ 0% (script hazır) |

**Toplam:** ~85%

### Sonraki Adımlar

1. **Database entegrasyonu** - `npm install better-sqlite3` ve `SocketServer`'a bağla
2. **cNFT minting flow** - Oyun bitiminde otomatik mint
3. **APK build** - `./scripts/bubblewrap-build.sh` çalıştır
4. **Production deploy** - Docker Compose ile canlıya al

---

## 🔗 ÖNEMLİ LİNKLER

**Solana:**
- Program: `https://explorer.solana.com/address/5ZdgoyBDknoZ8tDYMDXf8zCUQ7FxuaDbK4QffAgSfA9h?cluster=devnet`
- Playground: `https://beta.solpg.io`
- Devnet Faucet: `https://faucet.solana.com`

**Dokümantasyon:**
- Anchor: `https://www.anchor-lang.com/docs`
- Bubblegum (cNFT): `https://developers.metaplex.com/bubblegum`
- Solana Cookbook: `https://solanacookbook.com`

---

## 📝 NOTLAR

- **5 Şubat 2025** - Büyük güncelleme oturumu
- **Solana program ID:** `5ZdgoyBDknoZ8tDYMDXf8zCUQ7FxuaDbK4QffAgSfA9h` (devnet)
- **Ana hedef:** Solana Seeker (Android) via PWA→APK
- **Game:** Türk Batak (4 oyuncu, 13 trick, Spades trump)

---

*Bu indeks tüm dokümantasyonu organize eder ve hızlı erişim sağlar.*
