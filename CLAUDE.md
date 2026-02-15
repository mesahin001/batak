# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Batak Tournament Game** — A multiplayer Turkish trick-taking card game with cNFT rewards on Solana. Server-authoritative architecture: all game logic runs server-side, with real-time WebSocket communication to React clients.

**Tech Stack:**
- Client: React 18 + Vite + Socket.IO Client + TypeScript (WORKING)
- Mobile: React Native + Expo + Socket.IO Client (FUNCTIONAL - fixed Feb 9, 2025)
- Server: Node.js + Express + Socket.IO + TypeScript
- Auth: JWT + bcryptjs (wallet and email+password login)
- Database: SQLite (better-sqlite3) for player stats, game history, auth
- Blockchain: Solana Devnet + Anchor + Metaplex Bubblegum (cNFTs)

**⚠️ STATUS UPDATE (Feb 2025):**
- **Web Client:** FULLY FUNCTIONAL at `/client/`
- **Mobile App:** FULLY FUNCTIONAL at `/mobile/` - All issues resolved (Feb 10, 2025)
  - ✅ Navigation: Lobby → GameRoom (fixed with getParent())
  - ✅ Button responsiveness: 30+ buttons now have activeOpacity + hitSlop
  - ✅ Auth UX: Mode toggle (Email/Wallet tabs) with clean interface
  - ✅ Room cleanup: Players can rejoin after disconnect (publicKey-based removal)
  - ✅ Server stability: Bot timer crashes fixed with room existence checks
  - ✅ Bidding UI: Fully visible with proper z-index layering
  - ✅ Card visibility: Cards visible during bidding phase
  - ✅ İhaleli Batak: Suit selection working correctly
  - ✅ **Connection fixed (Feb 10 evening):** Removed malformed Solana plugin, app connects successfully
  - ✅ **Fullscreen mode (Feb 10 evening):** Status bar hidden in GameRoom for immersive gameplay
- **PvP Multiplayer:** IMPLEMENTED (Feb 10, 2025) - Real player-vs-player mode ready for testing
  - ✅ **60-second PvP timeout:** Queue waits 60s for 4 real players, then adds bots as fallback
  - ✅ **Default to PvP:** App now defaults to 0 bots (encourages real multiplayer)
  - ✅ **Enhanced queue UI:** Shows mode indicator, player count, and countdown timer
  - ✅ **Cross-platform:** Mobile + web players can match together
  - 📋 **Testing:** See `PVP_TESTING_GUIDE.md`, `PVP_QUICK_REFERENCE.md`, or run `./test-pvp.sh`
- **UI Redesign (Phase 1 Complete - Feb 15, 2026):**
  - ✅ **Design tokens system:** Centralized color palette (rich green felt + gold theme)
  - ✅ **Enhanced visuals:** Card shadows, gradients, radial background with texture
  - ✅ **Cross-platform consistency:** Shared design language between web and mobile
  - 📋 **Testing:** See `PHASE1_TESTING_CHECKLIST.md` and `PHASE1_VISUAL_SUMMARY.md`
- See `/mobile/README_STATUS.md` for detailed mobile app status

## Development Commands

```bash
# Server (port 3001)
cd server && npm run dev

# Client (port 5173)
cd client && npm run dev

# Mobile (Expo)
cd mobile && npm start
# Then: Press 'a' for Android, 'i' for iOS

# Mobile Development Setup (Required for physical device testing)
adb reverse tcp:8081 tcp:8081  # Metro Bundler
adb reverse tcp:3001 tcp:3001  # Game Server
# Note: Run these commands whenever you reconnect your Android device

# Type-check
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit

# Run server tests (expect 86 pass / 8 fail — ihaleli_batak scoring tests are known failures)
cd server && npm test

# Build
cd server && npm run build
cd client && npm run build
cd mobile/android && ./gradlew assembleDebug  # Android APK

# Install mobile APK
adb install -r mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Docker production stack
docker-compose up -d

# Kill process on port 3001 (if needed)
lsof -ti:3001 | xargs kill -9
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

Never trust client input. Always validate server-side.

### Game State Machine (`server/src/game/GameStateMachine.ts`)

```
LOBBY → BIDDING → PLAYING → SCORING → FINISHED
  ↑                              ↓
  └── redeal (all pass) ──────────┘
```

Key methods: `startGame()`, `submitBid()`, `passBid()`, `playCard()`, `completeTrick()`, `clearTrick()`, `completeRound()`, `startNextRound()`, `getStateForClient(playerId)`

### Multi-Round Structure
- 5/7/9/11 rounds per game, 13 tricks per round, 52-card deck
- Koz Maca: Spades always trump, highest cumulative score wins
- Ihaleli Batak: Players bid suit+amount, lowest cumulative score wins

### Player Identification (Critical!)

Human players are identified by **playerId** (wallet publicKey or `"E_"+UUID`), NOT socketId.

```typescript
// CORRECT — match by playerId from useAuth()
const { playerId } = useAuth();
const myPlayerIndex = playerId
  ? gameState.players?.findIndex((p) => p.id === playerId)
  : gameState.players?.findIndex((p) => p.type === 'human'); // bot-only fallback

// WRONG — returns index 0 for all humans in 4-player PvP
const myPlayerIndex = gameState.players?.findIndex((p) => p.type === 'human');
```

Server-side: `room.players` Map uses playerId as key. `broadcastGameState()` uses `player.id` to find each player's socket.

**CRITICAL: Room Player Removal Pattern (Fixed Feb 10, 2025)**

When removing a player from a room, you MUST remove them from BOTH locations:

1. **Socket Map:** `room.players.delete(publicKey)`
2. **Game State:** `room.gameMachine.removePlayer(publicKey)`

```typescript
// CORRECT — removes from both locations
removePlayerFromRoomByPublicKey(roomId: string, publicKey: string): void {
  const room = this.rooms.get(roomId);
  if (!room) return;

  room.players.delete(publicKey);              // ← Remove from socket map
  room.gameMachine.removePlayer(publicKey);    // ← Remove from game state

  if (this.getHumanPlayerCount(room) === 0) {
    this.closeRoom(roomId);
  }
}

// WRONG — only removes from socket map, player remains in game state
removePlayerFromRoomByPublicKey(roomId: string, publicKey: string): void {
  const room = this.rooms.get(roomId);
  room.players.delete(publicKey);  // ← Missing gameMachine.removePlayer()!
}
```

**Why publicKey instead of socketId?**
- `socketId` changes on every reconnect/disconnect
- `publicKey` (wallet address or `"E_"+UUID`) is stable across sessions
- Always use `removePlayerFromRoomByPublicKey()` instead of `removePlayerFromRoom()`

See `server/src/matchmaker/Matchmaker.ts:540-568` for implementation.

### Socket.IO Events

**Client → Server:** `JOIN_QUEUE`, `LEAVE_QUEUE`, `PLAY_CARD {cardId}`, `BID_TRUMP {suit, amount}`, `REQUEST_NEXT_ROUND`, `AUTH_REGISTER`, `AUTH_LOGIN`, `AUTH_VALIDATE`, `AUTH_WALLET`

**Server → Client:** `MATCH_FOUND`, `GAME_STATE_UPDATE`, `CARD_PLAYED`, `TRICK_COMPLETE`, `ROUND_COMPLETE`, `NEXT_ROUND_STARTING`, `GAME_COMPLETE`, `ERROR`, `GAME_ERROR`

After any state change, always call `broadcastGameState(roomId, room)`.

### Auth System

Dual auth: wallet (Solana) or email+password. JWT stored in localStorage (`batak_auth_token`), 7-day expiry. Player ID format: wallet users = publicKey string, email users = `"E_"+UUIDv4`.

Key files: `server/src/auth/AuthService.ts`, `client/src/auth/AuthContext.tsx` (`useAuth()` hook).

### Bot AI (`server/src/bots/`)

Strategy pattern: `EasyStrategy` (random), `NormalStrategy` (hand analysis), `HardStrategy` (card counting). `HandAnalyzer.ts` evaluates hand strength. Bot turns have 1.5s delay, trick display has 3s delay.

**CRITICAL: Bot Timer Safety Pattern (Fixed Feb 10, 2025)**

All bot actions with `setTimeout` MUST check room existence before executing:

```typescript
// CORRECT — checks room exists before bot action
setTimeout(() => {
  const currentRoom = this.rooms.get(roomId);
  if (!currentRoom) {
    console.log('[Bot] Room no longer exists, skipping action');
    return;
  }
  // ... execute bot action
}, 3000);

// WRONG — crashes if room closed during delay
setTimeout(() => {
  const room = this.rooms.get(roomId);
  room.gameMachine.playCard(botId, cardId);  // ← Crashes if room deleted!
}, 3000);
```

**Why is this needed?**
- Player can disconnect/leave during bot's delay period
- Room gets closed immediately for bot-only games
- Timer fires after room deletion → server crash

**Locations requiring this pattern:**
- `Matchmaker.ts:296` — Bot turn timer
- `SocketServer.ts:859` — Bot bidding timer
- Any future bot delayed actions

See commit history (Feb 10, 2025) for full implementation.

### Client UI — Mobile-First Layout

**Web Client (`client/src/components/GameRoom.tsx`):**
- **Mini header** (32px): round/trump/trick count + hamburger menu
- **CSS Grid game table** (3x3): opponent-top / opponent-left / trick-area / opponent-right / my-info-bar
- **Hand strip**: horizontal scroll with overlapping cards (48x72px, -20px margin)
- **Bidding sheet**: in-flow bottom panel (not fixed), max-height 34vh
- **Scoreboard**: hidden by default, slide-in overlay from right (hamburger toggle)
- **Navbar hidden** during gameplay (App.tsx doesn't render Navbar when `appState === 'playing'`)

**Mobile App (`mobile/src/screens/game/GameRoomScreen.tsx`):**
- Target: ~390px portrait, React Native (no CSS Grid)
- **Game table**: Absolute positioning for opponent slots (top/left/right)
- **Trick area**: Center of screen with absolute positioning
- **My hand**: Bottom strip with horizontal ScrollView
- **Bidding overlay**: `position: 'absolute'`, z-index layering (see below)
- **Stats**: Horizontal layout `2el • ♠7` (tricksWon + bid symbol)

**CRITICAL: React Native Z-Index Layering (Fixed Feb 10, 2025)**

React Native overlays require careful z-index management:

```typescript
// Layer hierarchy (highest to lowest):
biddingOverlay: {
  position: 'absolute',
  top: 40,
  left: 8,
  right: 8,
  bottom: 140,          // ← Leave space for cards to be visible
  zIndex: 9999,         // ← Highest
  elevation: 9999,      // ← Android shadow/elevation
  backgroundColor: 'rgba(15, 15, 30, 0.98)',
}

myHandStrip: {
  position: 'absolute',
  bottom: 8,
  zIndex: 9998,         // ← Below overlay, above background
  elevation: 9998,
}

trickCard: {
  // No explicit zIndex (defaults to 1 or auto)
}
```

**Common pitfalls:**
1. ❌ Overlay inside `gameTable` → can't go above sibling elements
2. ✅ Overlay as sibling to `gameTable` → full z-index control
3. ❌ Fullscreen overlay (`bottom: 0`) → hides cards during bidding
4. ✅ Partial overlay (`bottom: 140`) → cards visible for decision-making
5. ❌ Using `ScrollView` for bid numbers → rendering issues
6. ✅ Using `View` with flexWrap → reliable rendering

**İhaleli Batak Bidding Flow:**
1. Show suit selection (♠ ♥ ♦ ♣) → user picks suit
2. Show bid numbers (1-13) → user picks amount
3. Or Pass button (0) → skip bidding

Trick cards are positioned by relative player direction (top/left/right/bottom) using `getTrickSlotForPlayer()`.

### Design System & Styling (Phase 1 - Feb 2026)

**Design Tokens (Single Source of Truth):**
- **Web:** `/client/src/styles/tokens.css` (imported in `index.css`)
  - CSS custom properties: colors, shadows, gradients, typography
  - Usage: `var(--gold-primary)`, `var(--shadow-md)`, `var(--gradient-felt)`

- **Mobile:** `/mobile/src/styles/tokens.ts` (TypeScript constants)
  - Imported as: `import { COLORS, SHADOWS, RADIUS } from '../../styles/tokens'`
  - Usage: `backgroundColor: COLORS.feltDark`, `...SHADOWS.md`

**Color Palette:**
- **Theme:** Rich green felt (casino aesthetic) + gold accents
- **Primary:** `#d4af37` (gold) — buttons, borders, highlights
- **Background:** Radial gradient (`#0d2818` → `#1a472a` → `#2d5a3d`) + SVG noise texture
- **Cards:** White with subtle gradient, serif fonts (Georgia) for ranks

**Key Principle:** Never hardcode colors/shadows — always use tokens for consistency across web/mobile.

## Important File Locations

**Core Game Logic (Server):**
- `server/src/game/GameStateMachine.ts` — central state machine
- `server/src/game/Card.ts` — deck creation, card comparison
- `server/src/game/TurnValidator.ts` — move validation
- `server/src/game/Scoring.ts` — score calculation

**Socket & Matchmaker:**
- `server/src/socket/SocketServer.ts` — all Socket.IO event handlers
- `server/src/matchmaker/Matchmaker.ts` — room creation, bot turn management

**Client (Web):**
- `client/src/components/GameRoom.tsx` + `GameRoom.css` — main game UI
- `client/src/styles/tokens.css` — design tokens (colors, shadows, gradients)
- `client/src/auth/AuthContext.tsx` — `useAuth()` hook (all components use this, not `useWallet()`)
- `client/src/socket/SocketContext.tsx` — socket connection
- `client/src/types/game.ts` — client-side type definitions

**Client (Mobile):**
- `mobile/src/screens/game/GameRoomScreen.tsx` — main game UI (React Native)
- `mobile/src/styles/tokens.ts` — design tokens (COLORS, SHADOWS, RADIUS)
- `mobile/src/screens/auth/AuthScreen.tsx` — login/register (Email + Wallet tabs)
- `mobile/src/screens/lobby/LobbyScreen.tsx` — matchmaking queue
- `mobile/src/contexts/AuthContext.tsx` — mobile auth context
- `mobile/src/contexts/SocketContext.tsx` — mobile socket connection

**Database & Auth:**
- `server/src/database/DatabaseManager.ts` — SQLite (players, games, nft_rewards, auth tables)
- `server/src/auth/AuthService.ts` — JWT + bcrypt

**Solana:** `server/src/solana/` — TournamentManager, CNFTMinter, MerkleTreeManager

## Batak Rules Quick Reference

- **Deck:** 52 cards (2-A, 4 suits), 13 per player
- **Ranking:** A > K > Q > J > 10 > ... > 2
- **Must follow suit.** Trump (spades in Koz Maca) beats non-trump.
- **Scoring:** Made bid → `10×bid + (tricks-bid)`. Failed → `-10×bid`. Non-bidders → `tricks×10`.
- **Bidding ends** when `bids.length >= 4` AND at least one real bid exists.

## Game Modes

**Koz Maca:** Spades always trump, bid trick count only (1-13), highest cumulative score wins.

**Ihaleli Batak:** Bid suit + amount, must exceed current highest for that suit, lowest cumulative score wins (first to ≤1 wins early).

## Known Issues (Do NOT Fix Unless Asked)

- `Scoring.test.ts`: 8 tests fail (ihaleli_batak mode scoring formula mismatch). Expected test output: 86 pass / 8 fail.
- Pre-existing TS unused import warnings across bot files, Solana files.
- `better-sqlite3` not found by tsc (works at runtime with tsx).
- Solana SDK modules (@metaplex-foundation/*) not found by tsc.

## Common Debugging Patterns (Learned Feb 10, 2025)

### Server Crashes After Player Disconnect
**Symptom:** "Cannot read properties of undefined (reading 'id')" in bot timers
**Root Cause:** Bot timer executes after room deletion
**Solution:** Always check room existence in `setTimeout` callbacks (see Bot AI section)

### Players Can't Rejoin After Leaving
**Symptom:** Server tries to rejoin old game instead of creating new match
**Root Cause:** Player not removed from `room.gameMachine` internal state
**Solution:** Use `removePlayerFromRoomByPublicKey()` to remove from BOTH socket map and game state

### Mobile UI Elements Not Visible
**Symptom:** Buttons/overlays render but not visible on screen
**Root Cause:** Z-index scope issue or fullscreen overlay
**Solution:**
1. Move overlay outside parent container to gain z-index control
2. Use partial overlay (`bottom: 140`) not fullscreen (`bottom: 0`)
3. Set explicit z-index hierarchy (overlay > cards > background)
4. Add `elevation` for Android shadow rendering

### ScrollView vs View in React Native
**Symptom:** Elements in ScrollView not rendering
**Root Cause:** ScrollView has complex rendering lifecycle
**Solution:** Use `View` with `flexWrap: 'wrap'` for simple layouts like bid number grids

### Trick Cards Unreadable
**Symptom:** White text on white background or transparent background
**Root Cause:** Missing background color or wrong text color
**Solution:** Add `backgroundColor: '#fff'` to card, use `getSuitColor()` for text (red for ♥♦, black for ♠♣)

### Mobile APK Build & Installation Issues
**Symptom:** `adb install` fails with "No such file or directory" or APK not found
**Root Cause:** APK path is relative, not absolute
**Solution:**
```bash
# Use absolute path for installation
adb install -r /Users/mesahin/batak/mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Or find the APK first
find mobile/android/app/build/outputs -name "*.apk"
```

**Symptom:** "Unable to load script" error after installing APK
**Root Cause:** Metro bundler not running or port forwarding not set up
**Solution:**
```bash
# 1. Start Metro bundler (from mobile directory)
cd mobile && npm start

# 2. Setup port forwarding
adb reverse tcp:8081 tcp:8081  # Metro
adb reverse tcp:3001 tcp:3001  # Game server

# 3. Reload app: shake device → Developer Menu → Reload
```

## Environment Variables

**Server (.env):** `PORT=3001`, `JWT_SECRET`, `SOLANA_RPC_URL`, `SOLANA_PRIVATE_KEY`, `PROGRAM_ID`, `DEFAULT_BOT_DIFFICULTY=normal`

**Client (.env):** `VITE_SERVER_URL=ws://localhost:3001`, `VITE_SOLANA_NETWORK=devnet`, `VITE_PROGRAM_ID`, `VITE_DEFAULT_BOT_DIFFICULTY=normal`, `VITE_DEFAULT_BOT_COUNT=3`

## Data Persistence

- Game state: **in-memory only** (lost on server restart)
- Player stats, game history, auth records, NFT rewards: **SQLite** (persistent)
- Production upgrade path: PostgreSQL + Redis for state recovery (see `docs/PRODUCTION-ROADMAP.md`)

## Deployment

**Deployed Solana Program ID (Devnet):** `5ZdgoyBDknoZ8tDYMDXf8zCUQ7FxuaDbK4QffAgSfA9h`

**Docker:** `docker-compose.yml` includes batak-server, postgres, redis, nginx. See `.env.production.example` for config.

**Solana Playground deployment:** Copy `solana-program/playground/lib.rs` to https://beta.solpg.io, build & deploy, update `.env` with new program ID.
