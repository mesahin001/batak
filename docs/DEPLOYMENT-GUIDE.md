# 🚀 BATAK TOURNAMENT - DEPLOYMENT GUIDE

## HIZLI BAŞLANGIÇ

### Geliştirme Ortamı Kurulumu

```bash
# 1. Repoyu klonla
git clone https://github.com/[username]/batak.git
cd batak

# 2. Server dependencies
cd server && npm install

# 3. Client dependencies
cd ../client && npm install

# 4. Başlat (2 terminal)
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd client && npm run dev
```

**Server:** http://localhost:3001
**Client:** http://localhost:5173

---

## 📦 PRODUCTION DEPLOYMENT

### Seçenek 1: Docker Compose (Önerilen)

```bash
# 1. Production environment variables
cp .env.production.example .env
# Edit .env with your values:
# - DATABASE_URL
# - REDIS_URL
# - SOLANA_PRIVATE_KEY
# - JWT_SECRET

# 2. Build ve start
docker-compose up -d

# 3. Logs
docker-compose logs -f batak-server

# 4. Stop
docker-compose down
```

### Seçenek 2: DigitalOcean (VPS)

```bash
# 1. Ubuntu 20.04+ VPS oluştur
# 2. SSH ile bağlan
ssh root@your-vps-ip

# 3. Node.js kur
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 4. Repoyu klonla
git clone https://github.com/[username]/batak.git
cd batak

# 5. PM2 kur (process manager)
npm install -g pm2

# 6. Build
cd server && npm install && npm run build

# 7. Start
pm2 start dist/server.js --name batak-server
pm2 save
pm2 startup
```

### Seçenek 3: Render/Railway (PaaS)

**Server (Render):**
1. GitHub'a push et
2. Render dashboard → New → Web Service
3. Connect GitHub repo
4. Build command: `npm run build`
5. Start command: `npm run start`
6. Environment variables ayarla

**Client (Vercel):**
```bash
cd client
npm install -g vercel
vercel --prod
```

---

## 🗄️ DATABASE KURULUMU

### SQLite (MVP)

```bash
cd server
npm install better-sqlite3

# Database manager otomatik oluşturur:
# ./data/batak.db
```

### PostgreSQL (Production)

```bash
# Docker ile (docker-compose.yml)
docker-compose up -d postgres

# Veya yönetilen service (Supabase, RDS)
DATABASE_URL=postgresql://...
```

```typescript
// Postgres migration
npm install pg
// Schema aynı, sadece connection değişir
```

---

## 🔗 SOLANA DEPLOYMENT

### Yöntem 1: Solana Playground (En Kolay)

1. https://beta.solpg.io aç
2. "Anchor Rust" proje oluştur
3. `solana-program/playground/lib.rs` kodunu yapıştır
4. Build → Deploy
5. Program ID'i kopyala
6. `.env` dosyalarını güncelle

### Yöntem 2: Local Anchor CLI

```bash
# Anchor kur
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Build
cd solana-program
anchor build

# Deploy (devnet'e SOL gerekli)
anchor deploy

# Program ID al
anchor keys list
```

### Mainnet Deploy (Gelecek)

```bash
# 1. Program ID generate et
solana-keygen new -o mainnet-keypair.json

# 2. Anchor.toml'u güncelle
[programs.mainnet]
batak_tournament = [YOUR_PROGRAM_ID]

# 3. Deploy
anchor deploy --provider.cluster mainnet
```

---

## 📱 APK BUILD (Android)

### Bubblewrap ile

```bash
# 1. Bubblewrap CLI kur
npm install -g @bubblewrap/cli

# 2. Client build'li çalışıyor olmalı
cd client && npm run dev

# 3. Manifest URL'si kullan
bubblewrap init --manifest https://your-domain.com/manifest.json

# 4. Build
bubblewrap build

# 5. APK indirme noktası:
# Bubblewrap dashboard
```

### Test

```bash
# APK'ı telefona yükle
adb install batak-tournament.apk

# Test et
# - Wallet connect (Solana Seeker)
# - Oyun başlat
# - Bot oyunu
```

---

## 🔐 GÜVENLİK AYARLARI

### Environment Variables

**ASLA GİT'E ATMA:**
- `SOLANA_PRIVATE_KEY` - Server wallet private key
- `JWT_SECRET` - Session signing
- `DATABASE_PASSWORD` - PostgreSQL şifresi

### .gitignore

```
.env
.env.local
.env.production
*.db
*.sqlite
deploy-keypair.json
node_modules/
dist/
```

### Secrets Management (Production)

```bash
# Docker secrets
echo "your_password" | docker secret create db_password -

# AWS Secrets Manager
aws secretsmanager create-secret --name batak-db-pass --

# Render环境变量
# Dashboard → Environment → Manual
```

---

## 📊 MONITORING

### Health Check Endpoint

```typescript
// server/src/server.ts
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    activeRooms: matchmaker.getRoomCount(),
    activePlayers: matchmaker.getPlayerCount()
  });
});
```

### Loglama (Winston)

```bash
npm install winston
```

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Sentry (Error Tracking)

```bash
npm install @sentry/node
```

```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

---

## 🔄 CI/CD PIPELINE

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Deploy Server
        run: |
          ssh user@server "cd /app && git pull && pm2 restart batak-server"

      - name: Deploy Client
        run: |
          npm install -g vercel
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 🧪 TESTİNG

### Manual Test Checklist

```
□ Wallet connect (Phantom, Solflare)
□ Bot oyunu (1 human + 3 bots)
□ 4-player PvP
□ Bidding phase
□ Card play validation
□ Scoring calculation
□ Round complete
□ Game complete
□ cNFT minting (devnet)
□ APK install
□ Deep-linking
```

### Load Testing

```bash
npm install -g autocannon

# WebSocket load test
autocannon -c 100 -w 10 ws://localhost:3001

# API load test
autocannon -c 100 -d 30 http://localhost:3001/api/leaderboard
```

---

## 🐛 TROUBLESHOOTING

### Server Çökerse

```bash
# Check port
lsof -ti:3001 | xargs kill -9

# Restart
pm2 restart batak-server

# Logs
pm2 logs batak-server --lines 100
```

### Database Bağlantı Hatası

```bash
# SQLite
ls -la data/batak.db

# PostgreSQL
docker ps | grep postgres
docker-compose logs postgres
```

### Solana RPC Timeout

```bash
# Alternative RPC
SOLANA_RPC_URL=https://solana-api.projectserum.com
```

---

## 📈 SCALING

### When to Scale Up

| Metric | Action |
|--------|--------|
| CPU > 80% | Add server instance |
| Memory > 80% | Upgrade RAM |
| DB connections > 80% | Add connection pooler |
| Response time > 500ms | Add Redis cache |

### Auto-scaling (AWS ECS)

```json
{
  "Memory": "512",
  "Cpu": "256",
  "MinTasks": 2,
  "MaxTasks": 10,
  "TargetCpu": 70
}
```

---

*Deployment guide son güncelleme: 5 Şubat 2025*
