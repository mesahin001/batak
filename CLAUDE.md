# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Batak Tournament Game** — A multiplayer Turkish trick-taking card game with cNFT rewards on Solana. Server-authoritative architecture: all game logic runs server-side, with real-time WebSocket communication to React clients.

**Tech Stack:**
- Server: Node.js + Express + Socket.IO + TypeScript (port 3001)
- Web Client: React 18 + Vite + Socket.IO Client + TypeScript (port 5173)
- Mobile: React Native + Expo + Socket.IO Client
- Auth: JWT + bcryptjs — **wallet-only** (email auth temporarily disabled; `LoginScreen`/`RegisterScreen` exist but not in `AuthNavigator`)
- Database: SQLite via better-sqlite3 (player stats, game history, auth)
- Blockchain: Solana **Mainnet** (cNFT minting) + Devnet (game/auth) + Anchor + Metaplex Bubblegum

**Production:**
- Server: `https://batakci.xyz` (Hetzner VPS, Docker + Nginx + Cloudflare)
- Deploy: `git push origin main` → GitHub Actions → SSH → `docker compose build && up -d`
- VPS user: `batak` (non-root, in docker group); SSH key: `~/.ssh/id_ed25519`
- GitHub Secrets required: `HETZNER_HOST`, `HETZNER_USER`, `SSH_PRIVATE_KEY`

## Development Commands

```bash
# Server
cd server && npm run dev

# Web client
cd client && npm run dev

# Mobile (Expo)
cd mobile && npm start   # then 'a' for Android, 'i' for iOS

# Physical Android device against LOCAL server
adb reverse tcp:8081 tcp:8081   # Metro Bundler
adb reverse tcp:3001 tcp:3001   # Game Server

# Physical Android device against PRODUCTION server (no local server needed)
adb reverse tcp:8081 tcp:8081
EXPO_PUBLIC_SOCKET_URL=https://batakci.xyz npx expo run:android
# OR: edit mobile/.env EXPO_PUBLIC_SOCKET_URL=https://batakci.xyz then npx expo run:android

# Build a STANDALONE APK (no Metro/USB required — JS bundle embedded)
# Step 1: embed JS bundle into Android assets
cd mobile && npx expo export:embed \
  --platform android \
  --entry-file index.ts \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res
# Step 2a: build DEBUG APK
cd android && ./gradlew assembleDebug
# NOTE: mobile/android/app/build.gradle has debuggableVariants = [] so Gradle
# embeds the bundle instead of expecting Metro. Without this, debug APK shows
# "runtime not ready" when launched without USB.

# Step 2b: build SIGNED RELEASE APK (requires keystore configured in gradle.properties)
cd android && ./gradlew assembleRelease
# Release APK: mobile/android/app/build/outputs/apk/release/app-release.apk
# Keystore: mobile/android/app/batak-release.keystore (never commit — in .gitignore)
# Signing credentials: mobile/android/gradle.properties (BATAK_UPLOAD_* keys)
# Verify signing: cd android && ./gradlew signingReport

# Type-check
cd server && npx tsc --noEmit
cd client && npx tsc --noEmit

# Tests (expect 94 pass / 0 fail)
cd server && npm test

# Build
cd server && npm run build
cd client && npm run build
cd mobile/android && ./gradlew assembleDebug

# Install Android APK (use absolute path)
adb install -r /path/to/batak/mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Kill server port
lsof -ti:3001 | xargs kill -9

# Docker production stack
docker-compose up -d

# VPS: update .env vars and recreate container (MUST use up -d, not restart)
# docker compose restart does NOT re-read .env — env vars are baked at container creation
ssh -i ~/.ssh/id_ed25519 batak@91.99.218.37 "cd ~/app && docker compose up -d batak-server"

# Create Merkle tree for cNFT minting
cd server && npx tsx scripts/create-merkle-tree-umi.ts  # requires SOLANA_PRIVATE_KEY in .env

# Database initialization
cd server && npm run db:init    # Initialize SQLite database
cd server && npm run create-wallet  # Create minter wallet for cNFTs
cd server && npm run setup-tree    # Create Merkle tree for cNFT minting
```

## Architecture

### Server-Authoritative Flow

```
Client action (play_card, bid_trump)
  → Server validates (TurnValidator.ts)
  → Server updates state (GameStateMachine.ts)
  → Server broadcasts per-player state (hides other hands)
  → Client renders
```

Never trust client input. Always validate server-side. After any state change, always call `broadcastGameState(roomId, room)`.

### Game State Machine (`server/src/game/GameStateMachine.ts`)

```
LOBBY → BIDDING → PLAYING → SCORING → FINISHED
  ↑                              ↓
  └── redeal (all pass) ──────────┘
```

Key methods: `startGame()`, `submitBid()`, `passBid()`, `playCard()`, `completeTrick()`, `clearTrick()`, `completeRound()`, `startNextRound()`, `getStateForClient(playerId)`

**Multi-Round Structure:** 5/7/9/11 rounds per game, 13 tricks per round, 52-card deck.

### Player Identification (Critical)

Human players identified by **playerId** (wallet publicKey or `"E_"+UUID`), NOT socketId. socketId changes on every reconnect; publicKey is stable.

```typescript
// CORRECT
const myPlayerIndex = playerId
  ? gameState.players?.findIndex((p) => p.id === playerId)
  : gameState.players?.findIndex((p) => p.type === 'human'); // bot-only fallback

// WRONG — always returns index 0 in 4-player PvP
const myPlayerIndex = gameState.players?.findIndex((p) => p.type === 'human');
```

When removing a player from a room, remove from **both** the socket Map and game state:
```typescript
room.players.delete(publicKey);           // socket map
room.gameMachine.removePlayer(publicKey); // game state
```
Always use `removePlayerFromRoomByPublicKey()` — never `removePlayerFromRoom()`. See `server/src/matchmaker/Matchmaker.ts:540-568`.

### Bot Timer Safety Pattern

All bot `setTimeout` callbacks **must** check room existence first — the room may close during the delay:

```typescript
setTimeout(() => {
  const currentRoom = this.rooms.get(roomId);
  if (!currentRoom) return;   // ← required guard
  // ... bot action
}, 3000);
```

Required in: `Matchmaker.ts:296` (bot turns), `SocketServer.ts:859` (bot bidding), any future delayed bot actions.

### Socket.IO Events

**Client → Server:**
- Matchmaking: `join_queue`, `leave_queue`
- Gameplay: `play_card {cardId}`, `bid_trump {suit, amount}`, `request_next_round`
- Auth: `auth_register`, `auth_login`, `auth_validate`, `auth_wallet`
- Private rooms: `create_private_room`, `join_private_room`, `start_private_room`, `leave_private_room`
- Solana: `claim_reward {tournamentId, publicKey, claimSignature?}`, `create_skr_room {publicKey, skrStake, claimSignature, ...}`
- Data: `get_player_stats {publicKey}` → `{player, nfts}`, `get_player_games`, `get_leaderboard`

**Server → Client:**
- Matchmaking: `match_found`, `queue_status`
- Gameplay: `game_state_update`, `card_played`, `trick_complete`, `round_complete`, `next_round_starting`, `game_complete`
- Private rooms: `private_room_update`, `private_room_closed`
- Solana: `reward_minted {tournamentId, mintAddress, signature, tier}`
- Errors: `error`, `game_error`

**Private Room Flow:** Host calls `create_private_room` → gets 6-char alphanumeric code → shares with friends → they call `join_private_room {code}` → host calls `start_private_room` → server fills empty slots with bots → `match_found` sent to all.

**SKR Tournament Flow:** Host calls `create_skr_room {skrStake, claimSignature}` → `claimSignature` is a MWA-signed devnet memo tx proving wallet approval → server creates private room with `skrStake` property → share code → proceed like normal private room.

### Auth System

JWT stored in localStorage (`batak_auth_token`), 7-day expiry. Player ID: wallet users = publicKey string, email users = `"E_"+UUIDv4`.

Always use `useAuth()` hook from `client/src/auth/AuthContext.tsx` — never `useWallet()` directly.

### Solana Mobile Wallet Integration (Multi-Wallet)

MWA (`transact()` from `@solana-mobile/mobile-wallet-adapter-protocol-web3js`) is **wallet-agnostic** — works with Phantom, Backpack, Seeker, and any MWA-compatible wallet. UI strings in `WalletAuthScreen.tsx` are generic (no hardcoded "Seeker"). Do not add wallet-specific branding to the auth flow.

**`mobile/src/services/wallet/SeekerWalletService.ts`** — all MWA operations (file name retained for historical reasons, logic is generic):
- `authorize()` / `reauthorize()` / `deauthorize()` — wallet session management
- `claimNftReward(tournamentId)` — builds a Memo tx on devnet, signs via MWA, submits on-chain. Returns the devnet tx signature. This is the pattern for any future MWA transaction: build tx → `transact()` → `wallet.signTransactions()` → `sendRawTransaction()`.
- `signTransaction(tx)` / `signMessage(msg)` — generic signing helpers

**`mobile/src/services/SkrService.ts`** — SKR token balance:
- Queries SPL token balance on **mainnet** (SKR doesn't exist on devnet)
- SKR mint: `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`
- The game server runs on **devnet**; SKR balance is read-only from mainnet. Keep these networks separate.

**cNFT minting** (`server/src/solana/CNFTMinter.ts`):
- Only activates when `MERKLE_TREE` env var is set; logs "cNFT Minting: Enabled" at startup
- Uses **mainnet-beta** RPC (`SOLANA_RPC_URL=https://api.mainnet-beta.solana.com`)
- Production Merkle tree: `EQPVVrkCnPh4FvzFxUwctCeDCi85bWRNBDjB7GvxUBo6` (maxDepth=14, mainnet)
- `uploadMetadata()`: uses nft.storage HTTP API if `NFT_STORAGE_KEY` is set; otherwise encodes as data URI
- `mintTournamentReward()` returns `{signature, assetId, metadataUri}` — all three stored in `nft_rewards` table
- **Player ID encoding:** MWA wallet IDs may arrive as base64 (contains `+/=`), not base58. `mintRewardNFT()` normalizes automatically via `Buffer.from(addr, 'base64') → new PublicKey(bytes).toBase58()`. Always pass raw player ID; normalization is internal.

**SolanaClient (`server/src/solana/SolanaClient.ts`):**
- The `program` property is optional (`Program<any> | undefined`) — Anchor Program IDL is not currently loaded
- CNFTMinter only needs `getPayer()`, not the Program
- TournamentManager methods that use `program` will throw descriptive errors if called

### Bot AI (`server/src/bots/`)

Strategy pattern: `EasyStrategy` (random), `NormalStrategy` (hand analysis), `HardStrategy` (card counting). `HandAnalyzer.ts` evaluates hand strength. Bot turns have 1.5s delay; trick display has 3s delay.

### Client UI Layout

**Web (`client/src/components/GameRoom.tsx`):**
- Mini header (32px) + CSS Grid 3×3 game table
- Bidding sheet: in-flow bottom panel (not fixed), max-height 34vh
- Scoreboard: slide-in overlay from right (hamburger toggle)
- Navbar hidden during gameplay (`appState === 'playing'` in App.tsx)

**Mobile Navigator Structure (critical for cross-screen navigation):**
```
RootNavigator (Stack)
├── Auth (AuthNavigator — shown when not authenticated)
├── Main (MainNavigator — bottom tabs: Lobby, Leaderboard, Profile, Settings)
└── Game (GameNavigator — stack: GameRoom, GameResult, TournamentResult)
```
To navigate from `Game` screens back to the lobby: use `navigation.navigate('Main')`, NOT `navigation.navigate('Lobby')`. `Lobby` is a tab _inside_ `Main` and cannot be navigated to directly from the `Game` stack.

**Mobile (`mobile/src/screens/game/GameRoomScreen.tsx`):**
- Absolute positioning for all game elements (~390px portrait target)
- Bidding overlay must be a **sibling** to `gameTable` (not inside it) for z-index control
- Use `bottom: 140` on overlay (not `0`) so cards remain visible during bidding
- Use `View + flexWrap` for bid number grids — `ScrollView` has rendering issues here
- Always set both `zIndex` and `elevation` for Android compatibility

Trick card positions use `getTrickSlotForPlayer()` (relative direction: top/left/right/bottom).

### Modal Pattern (Bottom Sheet)

For scrollable bottom sheet modals (e.g., `HelpModal.tsx`, `SkrStakeModal.tsx`):
```tsx
<Modal visible={visible} transparent animationType="slide">
  <View style={styles.overlay}>
    <Pressable style={styles.backdrop} onPress={onClose} />
    <View style={styles.sheet}>
      <ScrollView>{/* content */}</ScrollView>
    </View>
  </View>
</Modal>
```
Key points:
- Separate `Pressable` backdrop for closing on outside tap
- `View` overlay container (not TouchableOpacity/Pressable wrapper) to avoid blocking scroll
- For interactive headers (expand/collapse), use `View` with `onTouchStart`/`onTouchEnd` to detect taps without blocking scroll

### Design System

**Web:** `/client/src/styles/tokens.css` — CSS custom properties (`var(--gold-primary)`, `var(--shadow-md)`, `var(--gradient-felt)`)

**Mobile:** `/mobile/src/styles/tokens.ts` — TypeScript constants (`COLORS.feltDark`, `SHADOWS.md`, `RADIUS`)

**Palette:** Rich green felt casino aesthetic — `#d4af37` gold (buttons/borders), `#1a472a`/`#0d2818` greens (backgrounds), `#8b0000` dark red (destructive actions). Never hardcode colors; always use tokens.

### Animation System

**Web:** Framer Motion (`motion.div`, `AnimatePresence`) in `GameRoom.tsx`. Spring physics: stiffness 200–400, damping 15–30. Always wrap exit animations with `AnimatePresence`. Total bundle: ~354 KB.

**Mobile:** Built-in `Animated` API only (`Animated.loop`, `Animated.sequence`). Turn glow and winner popup already implemented in `GameRoomScreen.tsx`. All animation properties must be GPU-accelerated (`transform`, `opacity`).

### Android-Specific Gotchas

**ActionSheetIOS Import Issue:**
- `ActionSheetIOS` from 'react-native' causes "undefined is not a function" crash on Android
- **Solution:** Use conditional imports (`Platform.OS === 'ios'`) or platform-specific modals
- **Location:** `SettingsScreen.tsx` — uses `showLanguagePicker` modal for both platforms instead

**zIndex and elevation:**
- Android requires `elevation` along with `zIndex` for proper layering
- Always set both values for layered components
- **Example:** In `GameRoomScreen.tsx`, bidding overlay uses `{ zIndex: 50, elevation: 50 }`

**Navigation gotchas:**
- `Lobby` is a tab inside `MainNavigator`, not a root navigator
- To navigate from Game screens to lobby: use `navigation.navigate('Main')`, NOT `navigation.navigate('Lobby')`

### NFT Status Handling

NFT display logic in `SettingsScreen.tsx` and `ProfileScreen.tsx`:

- **`onChainMinted: true` + `mintAddress`** → Show Solscan link (green "Minted" badge)
- **`onChainMinted: false`** → Show "Minting failed" (red badge)
- **`onChainMinted: undefined` + no `mintAddress`** → Show "Minting on-chain..." (yellow badge)

This pattern handles the three states of cNFT minting: pending, successful, and failed.

### Data Type Handling

**String() wrapper pattern for IDs:**
- Database may return numbers for ID fields (e.g., `tournamentId`)
- `tournamentId.slice()` fails if `tournamentId` is not a string
- **Solution:** Use `String(nft.tournamentId).slice()` for safety
- **Pattern:** Always wrap potentially non-string values in `String()` before calling string methods

## Key Files

**Server:**
- `server/src/game/GameStateMachine.ts` — state machine
- `server/src/game/TurnValidator.ts` — move validation
- `server/src/game/Scoring.ts` — score calculation
- `server/src/socket/SocketServer.ts` — all Socket.IO event handlers
- `server/src/matchmaker/Matchmaker.ts` — room creation, bot management, private rooms
- `server/src/database/DatabaseManager.ts` — SQLite schema + queries
- `server/src/auth/AuthService.ts` — JWT + bcrypt

**Web Client** (runs on port 5173, PWA-capable):
- `client/src/components/GameRoom.tsx` + `GameRoom.css` — main game UI
- `client/src/components/Lobby.tsx` — matchmaking + private room UI
- `client/src/styles/tokens.css` — design tokens
- `client/src/auth/AuthContext.tsx` — `useAuth()` hook
- `client/src/types/game.ts` — shared type definitions

**Mobile:**
- `mobile/src/navigation/RootNavigator.tsx` — top-level navigator (auth stack vs main stack)
- `mobile/src/screens/auth/LoginScreen.tsx`, `RegisterScreen.tsx`, `WalletAuthScreen.tsx` — auth flows
- `mobile/src/screens/game/GameRoomScreen.tsx` — main game UI
- `mobile/src/screens/lobby/LobbyScreen.tsx` — matchmaking, private rooms, SKR Tournament button
- `mobile/src/screens/lobby/LeaderboardScreen.tsx` — top players ranking (filter: games_played >= 1)
- `mobile/src/screens/results/GameResultScreen.tsx`, `TournamentResultScreen.tsx` — post-game/tournament results
- `mobile/src/screens/settings/SettingsScreen.tsx` — user info, NFT trophy gallery, language/sound, username edit (✏️ modal)
- `mobile/src/screens/settings/ProfileScreen.tsx` — player stats, game history, NFT list
- `mobile/src/services/i18n/translations/` — 11 language files (en, tr, de, es, fr, it, pt, ru, ja, zh, ar)
  - **Always use `useTranslation()` hook** from `react-i18next` — never hardcode UI strings
  - **Add new translations to ALL language files**, not just en/tr
  - Location: `mobile/src/services/i18n/translations/`
- `mobile/src/services/storage/AsyncStorageService.ts` — auth token + settings persistence (used by SocketContext for reconnect)
- `mobile/src/styles/tokens.ts` — design tokens
- `mobile/src/contexts/AuthContext.tsx` — mobile auth context
- `mobile/src/contexts/SocketContext.tsx` — socket connection
- `mobile/src/services/wallet/SeekerWalletService.ts` — MWA operations + `claimNftReward()`
- `mobile/src/services/SkrService.ts` — SKR mainnet balance query
- `mobile/src/components/ui/SkrStakeModal.tsx` — SKR stake UI (balance, presets, MWA approval)
- `mobile/src/components/ui/HelpModal.tsx` — In-app game rules modal with accordion sections (supports 11 languages)

## Game Rules Quick Reference

- **Deck:** 52 cards (2–A, 4 suits), 13 per player. **Ranking:** A > K > Q > J > 10 > … > 2
- **Must follow suit.** Trump beats non-trump.
- **Koz Maça:** Spades always trump; bid trick count only (1–13); highest cumulative score wins.
- **İhaleli Batak:** Bid suit + amount; must exceed current highest for that suit; lowest cumulative score wins (first to ≤1 wins early).
- **Scoring:** Made bid → `10×bid + (tricks−bid)`. Failed → `−10×bid`. Non-bidders → `tricks×10`.
- **Bidding ends** when all 4 players have acted AND at least one real bid exists.

## Known Issues (Do NOT Fix Unless Asked)

- Pre-existing TS unused import warnings in bot files and Solana files.
- `better-sqlite3` not found by `tsc` (works fine at runtime with `tsx`).
- Solana SDK modules (`@metaplex-foundation/*`) not found by `tsc`.
- `client/src/phaser/` — legacy, unused, has compilation errors; ignore.
- `server/src/database/migrate-to-postgres.ts` — `pg` module not found by `tsc`; pre-existing.
- `mobile/src/screens/game/GameRoomScreen.tsx` — several pre-existing TS errors (variable used before declaration, `currentGameState` null checks, duplicate `elevation`); do not fix unless asked.
- `ActionSheetIOS` from 'react-native' causes "undefined is not a function" crash on Android — use platform-specific modals or conditional imports instead.

## Environment Variables

**Server (`.env`):**
- `PORT=3001`, `JWT_SECRET`, `SOLANA_RPC_URL`, `SOLANA_PRIVATE_KEY`, `PROGRAM_ID`, `DEFAULT_BOT_DIFFICULTY=normal`
- `MERKLE_TREE` — Bubblegum tree address; cNFT minting disabled if unset
- `NFT_STORAGE_KEY` — free key from nft.storage for real IPFS metadata; falls back to data URI
- `NFT_IMAGE_URI` — IPFS URI for trophy image; has default placeholder

**Web Client (`.env`):** `VITE_SERVER_URL=ws://localhost:3001`, `VITE_SOLANA_NETWORK=devnet`, `VITE_PROGRAM_ID`, `VITE_DEFAULT_BOT_DIFFICULTY=normal`, `VITE_DEFAULT_BOT_COUNT=0`

**Mobile (`.env`):** `EXPO_PUBLIC_SOCKET_URL=https://batakci.xyz` (production) or `ws://<machine-ip>:3001` (local)
- Use `https://` for production (Cloudflare terminates TLS; Socket.IO upgrades to WSS automatically)
- Use `ws://` for local dev (plain WebSocket to local server)
- If unset, falls back to hardcoded LAN IP in `App.tsx:13`

**Mobile dependencies note:** `@solana/web3.js` is used in `SkrService.ts` and `SeekerWalletService.ts` for balance queries and transaction building. `SkrService` uses **mainnet** RPC; everything else uses devnet.

## Data Persistence & Deployment

- **Game state:** in-memory only (lost on server restart)
- **Persistent:** SQLite — player stats, game history, auth records, NFT rewards
- **Solana Program ID (Devnet):** `5ZdgoyBDknoZ8tDYMDXf8zCUQ7FxuaDbK4QffAgSfA9h`
- **cNFT Merkle Tree (Mainnet):** `EQPVVrkCnPh4FvzFxUwctCeDCi85bWRNBDjB7GvxUBo6`
- **Docker:** `docker-compose.yml` — batak-server, postgres, redis, nginx
- **VPS IP:** `91.99.218.37` (Hetzner); app lives at `~/app/`; env at `~/app/.env`
- **GitHub Release:** v1.0.0 — signed APK at `mobile/android/app/build/outputs/apk/release/app-release.apk`
