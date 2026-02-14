# Technology Stack

**Analysis Date:** 2025-02-14

## Languages

**Primary:**
- TypeScript 5.1.6 - All server, client, and mobile code
- JavaScript (runtime) - Node.js ES modules

**Secondary:**
- Rust - Solana smart contract (Anchor programs)
- Rust - Solana Playground deployment target

## Runtime

**Environment:**
- Node.js (version not pinned in repo, typical: 18+)
- Bun/tsx for development execution

**Package Manager:**
- npm (primary)
- Lockfiles present: package-lock.json in server/, client/, mobile/

## Frameworks

**Core:**
- Express 4.18.2 - HTTP server + REST endpoints
- React 18.2.0 - Web client (`client/src/`)
- React Native 0.81.5 + Expo 54.0.33 - Mobile app (`mobile/src/`)
- Socket.IO 4.7.2 (server), 4.7.2/4.8.3 (clients) - Real-time WebSocket communication

**State Management:**
- React Context API - Auth state, Socket state (`client/src/auth/AuthContext.tsx`, `client/src/socket/SocketContext.tsx`)
- In-memory Matchmaker - Game room management (`server/src/matchmaker/Matchmaker.ts`)
- In-memory GameStateMachine - Game logic state (`server/src/game/GameStateMachine.ts`)

**Testing:**
- Jest 29.7.0 - Server test runner
- ts-jest 29.1.1 - TypeScript test transformation
- No E2E framework configured

**Build/Dev:**
- Vite 4.4.9 - Web client build and dev server
- TypeScript 5.1.6 - Compilation and type checking
- tsx 4.7.0 - TypeScript execution for Node.js
- Vite PWA 0.16.4 - Progressive Web App manifest generation

## Key Dependencies

**Critical:**
- `@solana/web3.js` 1.87.0 - Solana blockchain interaction (RPC calls, transactions)
- `@coral-xyz/anchor` 0.29.0 - Solana program framework and client generation
- Socket.IO 4.7.2 - WebSocket server for real-time game synchronization
- `better-sqlite3` 9.6.0 - SQLite database driver (synchronous)
- Express 4.18.2 - HTTP framework for health checks and API routes

**Authentication & Security:**
- `bcryptjs` 3.0.3 - Password hashing (10 rounds)
- `jsonwebtoken` 9.0.3 - JWT generation/verification (7-day expiry)

**Solana Blockchain:**
- `@solana-mobile/mobile-wallet-adapter-protocol-web3js` 2.2.5 - Mobile wallet connection
- `@solana/wallet-adapter-react` 0.15.39 - React wallet context
- `@solana/wallet-adapter-wallets` 0.19.37 - Supported wallets (Phantom, etc.)
- `@solana/wallet-adapter-base` 0.9.27 - Base wallet adapter interface

**Storage & State:**
- `@react-native-async-storage/async-storage` 2.2.0 - Mobile local storage
- `react-native-reanimated` 4.1.1 - Mobile animation library

**Navigation:**
- `@react-navigation/native-stack` 7.12.0 - Mobile stack navigator
- `@react-navigation/bottom-tabs` 7.12.0 - Mobile bottom tab navigation
- `@react-navigation/native` 7.1.28 - Navigation core

**Mobile Utilities:**
- `react-native-safe-area-context` 5.6.0 - Safe area layout handling
- `react-native-screens` 4.16.0 - Native screen performance
- `expo-status-bar` 3.0.9 - Status bar control
- `expo-splash-screen` 31.0.13 - Splash screen management
- `expo-screen-orientation` 9.0.8 - Screen orientation control

**Internationalization:**
- `i18next` 25.8.4 - Translation framework
- `react-i18next` 16.5.4 - React i18next bindings
- `react-native-localize` 3.6.1 - Device locale detection

**Development:**
- `canvas` 3.2.1 - Canvas rendering (unused in active code)

## Configuration

**Environment:**
- `VITE_SERVER_URL` - WebSocket endpoint for client (default: `ws://localhost:3001`)
- `VITE_SOLANA_NETWORK` - Network for wallet adapter (devnet/mainnet-beta)
- `VITE_PROGRAM_ID` - Deployed Solana program ID
- `VITE_DEFAULT_BOT_COUNT` - Default bot count for matchmaking (0 = PvP mode)
- `SOLANA_RPC_URL` - RPC endpoint for server blockchain calls (default: `https://api.devnet.solana.com`)
- `SOLANA_PRIVATE_KEY` - Server wallet private key (base58-encoded array)
- `SOLANA_NETWORK` - Network mode (devnet/testnet/mainnet-beta/localnet)
- `PROGRAM_ID` - Program ID for contract interactions
- `MERKLE_TREE` - Bubblegum merkle tree address for cNFT minting
- `PORT` - Server port (default: 3001)
- `JWT_SECRET` - Secret for JWT signing/verification
- `NODE_ENV` - Environment (development/production/test)
- `REDIS_ENABLED` - Enable Redis for distributed sessions (default: false)
- `REDIS_URL` - Redis connection URL (default: `redis://redis:6379`)

**Build Configuration:**
- `server/tsconfig.json` - Target ES2022, ESNext modules, strict mode, path alias `@/*`
- `client/tsconfig.json` - Same as server config
- `client/vite.config.ts` - Vite React plugin, PWA manifest, port 5173
- `mobile/tsconfig.json` - Strict TypeScript for mobile
- `server/jest.config.js` - Test preset `ts-jest`, node environment, test patterns `**/__tests__/**/*.test.ts`

**Client PWA:**
- Manifest name: "Batak Tournament"
- Orientation: landscape for web, responsive for mobile
- Icons: 72x72 to 512x512 (maskable variants included)
- Install scope: standalone PWA
- Theme color: #1a1a2e

**Mobile:**
- Android package: `com.bataktournament.mobile`
- iOS bundle: `com.bataktournament.mobile`
- Expo project ID: `batak-tournament`
- EAS enabled for cloud builds
- Dark mode UI by default
- Permissions: INTERNET, ACCESS_NETWORK_STATE

## Platform Requirements

**Development:**
- Node.js 18+ (implicit, typical for modern npm packages)
- npm or yarn
- Android SDK (for mobile testing via `expo run:android`)
- iOS SDK/Xcode (for `expo run:ios`)
- EAS CLI (optional, for cloud builds)

**Production:**
- Node.js 18+ runtime
- Docker + Docker Compose (optional, for containerized deployment)
- Solana Devnet/Testnet/Mainnet access via RPC
- PostgreSQL (optional, for production database upgrade - migration script available)
- Redis (optional, for distributed state - profiles-based in docker-compose)

---

*Stack analysis: 2025-02-14*
