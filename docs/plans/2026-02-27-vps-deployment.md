# VPS Deployment Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy the Batak Tournament server to a public VPS so the mobile app can connect wirelessly (no USB cable required), ready before the March 9 hackathon deadline.

**Architecture:** Docker Compose deployment on a DigitalOcean droplet (or Railway as fast alternative). Server already has a production-ready Dockerfile and docker-compose.yml. CORS is open (`*`). nginx already configured for Socket.IO proxying with CloudFlare SSL termination.

**Tech Stack:** Docker, docker-compose, nginx, DigitalOcean ($6/mo droplet), CloudFlare (free SSL), SQLite persistent volume

**Deadline:** March 9, 2026 (Solana Mobile Monolith Hackathon)

---

## Phase 0 — Local Testing Right Now (before VPS is ready)

> Do this NOW while the VPS is being set up. No code changes needed.

```bash
# Terminal 1: Start game server
cd server && npm run dev

# Terminal 2: (Optional) Start web client
cd client && npm run dev

# Terminal 3: Forward ports to phone (run after every USB reconnect)
adb reverse tcp:8081 tcp:8081   # Metro Bundler
adb reverse tcp:3001 tcp:3001   # Game Server

# Terminal 4: Start Expo / Metro
cd mobile && npx expo start
# Then press 'a' for Android
```

The phone must be connected via USB for `adb reverse` to work. VPS solves this.

---

## Phase 1 — Quick Wireless Testing with ngrok (30 min, TODAY)

> Skip this if you set up VPS directly. Use ngrok only for immediate wireless testing.

**Files:** none (no code changes)

### Task 1: Install and run ngrok

**Step 1: Install ngrok**
```bash
brew install ngrok
ngrok config add-authtoken <your_token>  # Free at ngrok.com
```

**Step 2: Start server locally**
```bash
cd server && npm run dev
```

**Step 3: Expose server via ngrok**
```bash
ngrok http 3001
# Copy the https URL: e.g. https://abc123.ngrok.io
```

**Step 4: Update mobile .env**

Edit `mobile/.env`:
```
EXPO_PUBLIC_SERVER_URL=https://abc123.ngrok.io
```

**Step 5: Restart Expo with cleared cache**
```bash
cd mobile && npx expo start --clear
```

**Step 6: Test on phone WITHOUT USB**
- Open the Expo Go app
- Connect phone to same WiFi as Mac
- Scan QR code from terminal
- App should connect to server via ngrok URL

**Verification:** Open app → login → join queue → game starts ✅

> ⚠️ ngrok URL changes every restart. Only use for quick tests. VPS is permanent.

---

## Phase 2 — VPS Deployment on DigitalOcean (2-3 hours, THIS WEEK)

### Task 2: Create DigitalOcean Droplet

**Step 1: Create account and droplet**
- Go to https://cloud.digitalocean.com
- Create Droplet: **Ubuntu 24.04**, **$6/mo Basic** (1 vCPU, 1 GB RAM — enough for ~50 concurrent users)
- Region: Frankfurt or Amsterdam (closest to Turkey)
- Add SSH key

**Step 2: Note the droplet IP**
```
# Example: 167.99.xxx.xxx
```

**Step 3: SSH into droplet**
```bash
ssh root@<your-droplet-ip>
```

**Step 4: Install Docker**
```bash
# On the VPS:
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install docker-compose
apt-get install -y docker-compose-plugin
docker compose version  # should print version
```

---

### Task 3: Deploy the server to VPS

**Step 1: Clone the repo on VPS**
```bash
# On the VPS:
git clone https://github.com/<your-username>/batak.git
cd batak
```

**Step 2: Create server .env from example**
```bash
cd server
cp .env.example .env
nano .env
```

Minimum required values:
```
PORT=3001
NODE_ENV=production
JWT_SECRET=<generate: openssl rand -base64 32>
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
DEFAULT_BOT_DIFFICULTY=normal
```

**Step 3: Start with docker-compose (server + nginx)**
```bash
# Back in /batak root:
docker compose up -d batak-server nginx
docker compose ps  # both should show "running"
```

**Step 4: Verify server is running**
```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","uptime":...}

# From your Mac:
curl http://<droplet-ip>/health
# Expected: same response (nginx proxies)
```

**Step 5: Open firewall ports**
```bash
# On VPS:
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS (for Cloudflare)
ufw allow 3001  # Direct WebSocket (fallback)
ufw enable
```

---

### Task 4: Set up domain + HTTPS (optional but recommended)

> Skip if using IP directly. CloudFlare free plan is recommended for SSL.

**Step 1: Point a domain or subdomain to the droplet IP**
- Any domain registrar or Cloudflare DNS
- Create A record: `batak.yourdomain.com` → `<droplet-ip>`

**Step 2: Enable CloudFlare SSL (flexible)**
- CloudFlare dashboard → SSL/TLS → Flexible
- nginx.conf already has correct headers for this (X-Forwarded-Proto)

**Verification:**
```bash
curl https://batak.yourdomain.com/health
# Expected: {"status":"ok",...}
```

---

### Task 5: Update mobile app with VPS URL

**Files:**
- Modify: `mobile/.env`

**Step 1: Update mobile .env**
```bash
# Using IP (no SSL):
EXPO_PUBLIC_SERVER_URL=http://<droplet-ip>:3001

# Or using domain with SSL:
EXPO_PUBLIC_SERVER_URL=https://batak.yourdomain.com
```

> **Important:** Socket.IO with MWA uses `wss://` automatically when URL starts with `https://`. The server accepts both.

**Step 2: Test with Expo dev build (no rebuild needed)**
```bash
cd mobile && npx expo start --clear
```

Connect phone to WiFi (no USB needed now). Scan QR code.

**Verification:**
- Open app → login works ✅
- Matchmaking → game starts ✅
- No USB cable required ✅

---

### Task 6: Build release APK with VPS URL

> Only do this after VPS is stable and tested.

**Step 1: Generate keystore if not done**
```bash
cd mobile/android/app
keytool -genkey -v \
  -keystore batak-release.keystore \
  -alias batak-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Step 2: Add credentials to gradle.properties**

Edit `mobile/android/gradle.properties`:
```properties
BATAK_UPLOAD_STORE_FILE=batak-release.keystore
BATAK_UPLOAD_STORE_PASSWORD=<your_password>
BATAK_UPLOAD_KEY_ALIAS=batak-key-alias
BATAK_UPLOAD_KEY_PASSWORD=<your_password>
```

**Step 3: Build release APK**
```bash
cd mobile/android
./gradlew assembleRelease
```

**Step 4: Verify APK**
```bash
adb install -r app/build/outputs/apk/release/app-release.apk
adb shell dumpsys package com.bataktournament.mobile | grep versionName
# Expected: versionName=1.0.0
```

**Step 5: Test release APK on WiFi (no USB after install)**
```bash
# After install, disconnect USB
# Open app → should connect to VPS server ✅
```

---

## Phase 3 — Hackathon Final Checklist (Manual, March 5-9)

| Item | Command / URL |
|------|--------------|
| Record demo video | `adb shell screenrecord /sdcard/demo.mp4` |
| Upload APK to GitHub Releases | `gh release create v1.0.0 app-release.apk` |
| dApp Store submission | https://dappstore.solanamobile.com |
| Hackathon registration | https://solana.com/monolith |
| Marketing copy | `mobile/MARKETING.md` |

---

## Timeline

| When | What |
|------|------|
| Today (Feb 27) | ngrok for wireless testing, server runs locally |
| Feb 28–Mar 1 | VPS deployed, server online 24/7 |
| Mar 2–3 | Release APK built with VPS URL, tested |
| Mar 4–5 | Demo video recorded, assets prepared |
| Mar 5–7 | dApp Store submission |
| Mar 7–9 | Hackathon registration, final buffer |

---

## Troubleshooting

**WebSocket won't connect on VPS:**
```bash
# Check server is running
docker compose logs batak-server --tail 50

# Check nginx is proxying correctly
curl -I http://<ip>/health

# Check port 3001 is accessible directly
curl http://<ip>:3001/health
```

**SQLite data persists across restarts:**
- Volume `server-data` in docker-compose mounts to `/app/data`
- Player accounts, game history, NFT records survive container restarts

**Server OOM on 1GB VPS:**
```bash
# Add swap (free 1GB buffer)
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```
