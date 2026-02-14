# External Integrations

**Analysis Date:** 2025-02-14

## APIs & External Services

**Solana Blockchain:**
- Service: Solana Network (Devnet/Testnet/Mainnet-Beta)
- What it's used for: Game tournament NFT rewards, player wallet verification, smart contract interactions
  - SDK/Client: `@solana/web3.js` 1.87.0, `@coral-xyz/anchor` 0.29.0
  - RPC endpoint: Environment variable `SOLANA_RPC_URL` (default: `https://api.devnet.solana.com`)
  - Network: Environment variable `SOLANA_NETWORK` (devnet/testnet/mainnet-beta/localnet)
  - Payer wallet: `SOLANA_PRIVATE_KEY` (base58-encoded keypair array)
  - Usage: `server/src/solana/SolanaClient.ts` - wraps RPC connection and Anchor program
  - Program interaction: `server/src/solana/TournamentManager.ts`, `server/src/solana/CNFTMinter.ts`

**Metaplex Bubblegum (cNFT Minting):**
- Service: Metaplex protocol on Solana for compressed NFTs
- What it's used for: Minting cNFT rewards to tournament winners
  - Package: `@metaplex-foundation/mpl-bubblegum` (imported dynamically in `server/src/server.ts`)
  - Merkle tree address: Environment variable `MERKLE_TREE` (optional - minting disabled if empty)
  - Implementation: `server/src/solana/CNFTMinter.ts` - handles cNFT creation with metadata
  - Metadata URI: Currently mocked (Arweave placeholder: `https://arweave.net/placeholder-{timestamp}`)
  - Metadata structure: Title, description, image, attributes (player rank, tournament info)

**Arweave (Metadata Storage):**
- Service: Arweave network (used for NFT metadata URIs)
- What it's used for: Storing cNFT metadata (placeholder URLs only in current implementation)
  - URI format: `https://arweave.net/placeholder-{timestamp}`
  - Production note: Requires actual image upload integration

**Mobile Wallet Adapter:**
- Service: Solana Mobile wallet protocol
- What it's used for: Mobile wallet connection and signing on React Native
  - SDK: `@solana-mobile/mobile-wallet-adapter-protocol-web3js` 2.2.5
  - Usage: `mobile/src/contexts/WalletContext.tsx` - enables Phantom wallet, Solflare on mobile
  - Integration: Mobile clients can connect via wallet adapter and authenticate

## Data Storage

**Databases:**
- Type/Provider: SQLite (primary), PostgreSQL (optional production upgrade)
  - Connection: File-based at `./data/batak.db` (SQLite) or environment variable `POSTGRES_URL`
  - Client: `better-sqlite3` 9.6.0 (synchronous driver for SQLite)
  - Tables: `players`, `games`, `nft_rewards`, `auth_users`, `player_stats`
  - WAL mode enabled: `PRAGMA journal_mode = WAL` for concurrent access
  - Migration support: `server/src/database/migrate-to-postgres.ts` script for production upgrade

**File Storage:**
- Type: Local filesystem only
  - Database file: `/data/batak.db` relative to server root
  - Build output: `client/dist/` (web), `mobile/android/app/build/outputs/apk/debug/` (mobile)
  - No S3, Cloudinary, or external file hosting configured

**Caching:**
- Type: Optional Redis (disabled by default)
  - Package: Not included in package.json, optional via docker-compose profile
  - Configuration: Environment variables `REDIS_ENABLED`, `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
  - Usage: Socket.IO Redis adapter for distributed state in multi-server deployments
  - Implementation: `server/src/socket/RedisAdapter.ts` (conditional setup)
  - Docker service: `batak-redis` image `redis:7-alpine` in docker-compose.yml (profiles: redis)
  - Note: In-memory state used in single-server mode (no Redis required)

## Authentication & Identity

**Auth Provider:**
- Type: Dual authentication - Wallet (Solana) + Email+Password
  - Implementation: Custom JWT-based auth in `server/src/auth/AuthService.ts`
  - Client: `client/src/auth/AuthContext.tsx` (web), `mobile/src/contexts/AuthContext.tsx` (mobile)

**Wallet Auth (Solana):**
- Player ID: Wallet public key (address string)
- Flow: Client connects wallet via `@solana/wallet-adapter-react` → wallet address sent to server → server issues JWT
- Token storage: localStorage with key `batak_auth_token`
- JWT expiry: 7 days
- Validation: Token verified against `JWT_SECRET` environment variable

**Email+Password Auth:**
- Player ID: Generated as `"E_"+UUIDv4` (email users prefixed with "E_")
- Password hashing: bcryptjs with 10 rounds (`BCRYPT_ROUNDS = 10`)
- Database: `auth_users` table in SQLite with `email`, `password_hash`
- Registration: `AuthService.register(email, password)` with email format validation
- Login: `AuthService.login(email, password)` with bcrypt comparison
- Token same as wallet auth: JWT issued upon successful login
- Validation: Email format regex, password minimum 6 characters

**Socket.IO Events (Auth):**
- `AUTH_REGISTER` - Register new email user
- `AUTH_LOGIN` - Login with email+password
- `AUTH_VALIDATE` - Verify stored JWT token
- `AUTH_WALLET` - Wallet authentication (auto-called on wallet connect)

## Monitoring & Observability

**Error Tracking:**
- Type: Not detected
- Logging: console.log/error in-process (no Sentry, DataDog, etc.)

**Logs:**
- Approach: Console output with `[Tag]` prefixes
  - Examples: `[Server]`, `[Auth]`, `[Socket]`, `[Matchmaker]`, `[Game]`, `[Bot]`, `[cNFT]`
  - No file logging or external aggregation
  - Console output suitable for Docker container logs

**Health Endpoint:**
- Endpoint: `GET /health`
- Response includes:
  - Server status, uptime, environment, Solana network
  - Database stats: player count, game count, NFT mints
  - Redis health (if configured)
  - Timestamp

## CI/CD & Deployment

**Hosting:**
- Type: Docker containerization optional, bare Node.js also supported
  - Docker image: `batak-server` built from `server/Dockerfile`
  - Port mapping: 3001 internal, 80 external (via nginx reverse proxy)
  - Container services: batak-server, batak-nginx, optional batak-postgres, batak-redis

**Web Client Hosting:**
- Type: Static files via nginx
  - Build output: `client/dist/` deployed to nginx container at `/usr/share/nginx/html`
  - PWA enabled: Manifest and service worker for offline capability
  - Reverse proxy: nginx at port 80 routes `/socket.io` to server, `/` to static files

**Mobile Hosting:**
- Type: Expo cloud builds (EAS) or local builds
  - EAS project ID: `batak-tournament`
  - Build targets: Android APK (`mobile/android/app/build/outputs/apk/debug/app-debug.apk`)
  - Installation: Via `adb install` or Expo app

**CI Pipeline:**
- Type: Not detected
  - No GitHub Actions, GitLab CI, or Jenkins configured
  - Manual build/deploy workflow (no automation)

**Local Development:**
- Server: `npm run dev` (tsx watch, port 3001)
- Client: `npm run dev` (vite dev server, port 5173)
- Mobile: `npm start` (expo, then 'a' for Android or 'i' for iOS)

## Environment Configuration

**Required env vars (Production):**
- `JWT_SECRET` - REQUIRED - Generate with `openssl rand -base64 32`
- `SOLANA_NETWORK` - Network mode (devnet/testnet/mainnet-beta)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - production

**Optional env vars (cNFT Minting):**
- `SOLANA_PRIVATE_KEY` - Server wallet keypair (base58 array), can be empty for mocked minting
- `MERKLE_TREE` - Bubblegum merkle tree address, can be empty to disable minting
- `PROGRAM_ID` - Smart contract program ID (devnet example: `5ZdgoyBDknoZ8tDYMDXf8zCUQ7FxuaDbK4QffAgSfA9h`)

**Optional env vars (Production DB):**
- `POSTGRES_USER` - PostgreSQL username (default: batak)
- `POSTGRES_PASSWORD` - PostgreSQL password
- `POSTGRES_DB` - PostgreSQL database name (default: batak)

**Optional env vars (Redis):**
- `REDIS_ENABLED` - Set to 'true' to enable (default: false)
- `REDIS_URL` - Connection URL (default: `redis://redis:6379`)
- `REDIS_HOST` - Hostname
- `REDIS_PORT` - Port
- `REDIS_PASSWORD` - Auth password
- `REDIS_DB` - Database number

**Client env vars:**
- `VITE_SERVER_URL` - WebSocket endpoint (default: `ws://localhost:3001`)
- `VITE_SOLANA_NETWORK` - Network for wallet adapter (devnet)
- `VITE_PROGRAM_ID` - Program ID to display to users
- `VITE_DEFAULT_BOT_COUNT` - Default bots for matchmaking (0 = PvP mode, 3 = instant bots)

**Secrets location:**
- Web: `.env.example` checked in, `.env.production` excluded via .gitignore
- Server: `server/.env.example` checked in, `.env` excluded
- Mobile: `mobile/.env.example` checked in (note: `.env.production` added to repo for Expo EAS)

## Webhooks & Callbacks

**Incoming Webhooks:**
- Type: None detected
- No Stripe webhooks, Discord bots, or external service callbacks

**Outgoing Webhooks:**
- Type: None detected
- No scheduled cNFT notifications, email confirmations, or external API calls

**Socket.IO Events (Game Flow - Outgoing):**
- Server → Client events:
  - `MATCH_FOUND` - Tournament match ready
  - `GAME_STATE_UPDATE` - Game state broadcast (per-player, hides opponent hands)
  - `CARD_PLAYED` - Card played by another player
  - `TRICK_COMPLETE` - Trick winner announced
  - `ROUND_COMPLETE` - Round scores
  - `NEXT_ROUND_STARTING` - Multi-round transition
  - `GAME_COMPLETE` - Tournament finished, final scores
  - `ERROR` - General error
  - `GAME_ERROR` - Game-specific error

**Socket.IO Events (Game Flow - Incoming):**
- Client → Server events:
  - `JOIN_QUEUE` - Enter matchmaking (payload: botCount, difficulty, gameMode)
  - `LEAVE_QUEUE` - Exit matchmaking
  - `PLAY_CARD` - Play a card (payload: cardId)
  - `BID_TRUMP` - Submit bid (payload: suit, amount)
  - `REQUEST_NEXT_ROUND` - Ready for next round
  - `AUTH_REGISTER` - Register email user
  - `AUTH_LOGIN` - Login
  - `AUTH_VALIDATE` - Verify token
  - `AUTH_WALLET` - Wallet auth
  - `create_private_room` - Host a private game
  - `join_private_room` - Join friend's room
  - `leave_game` - Disconnect from game
  - `rejoin_game` - Reconnect after network drop

---

*Integration audit: 2025-02-14*
