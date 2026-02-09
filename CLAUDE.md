# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Batak Tournament Game** — A multiplayer Turkish trick-taking card game with cNFT rewards on Solana. Server-authoritative architecture: all game logic runs server-side, with real-time WebSocket communication to React clients.

**Tech Stack:**
- Client: React 18 + Vite + Socket.IO Client + TypeScript (WORKING)
- Mobile: React Native + Expo + Socket.IO Client (BROKEN - see below)
- Server: Node.js + Express + Socket.IO + TypeScript
- Auth: JWT + bcryptjs (wallet and email+password login)
- Database: SQLite (better-sqlite3) for player stats, game history, auth
- Blockchain: Solana Devnet + Anchor + Metaplex Bubblegum (cNFTs)

**⚠️ CRITICAL STATUS (Feb 2025):**
- **Web Client:** FULLY FUNCTIONAL at `/client/`
- **Mobile App:** BROKEN at `/mobile/` - navigation, buttons, authentication non-functional
- DO NOT work on mobile app without explicit user approval
- See `/mobile/README_STATUS.md` for detailed mobile app issues

## Development Commands

```bash
# Server (port 3001)
cd server && npm run dev

# Client (port 5173)
cd client && npm run dev

# Type-check client
cd client && npx tsc --noEmit

# Run server tests (expect 86 pass / 8 fail — ihaleli_batak scoring tests are known failures)
cd server && npm test

# Build
cd server && npm run build
cd client && npm run build

# Docker production stack
docker-compose up -d
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

### Socket.IO Events

**Client → Server:** `JOIN_QUEUE`, `LEAVE_QUEUE`, `PLAY_CARD {cardId}`, `BID_TRUMP {suit, amount}`, `REQUEST_NEXT_ROUND`, `AUTH_REGISTER`, `AUTH_LOGIN`, `AUTH_VALIDATE`, `AUTH_WALLET`

**Server → Client:** `MATCH_FOUND`, `GAME_STATE_UPDATE`, `CARD_PLAYED`, `TRICK_COMPLETE`, `ROUND_COMPLETE`, `NEXT_ROUND_STARTING`, `GAME_COMPLETE`, `ERROR`, `GAME_ERROR`

After any state change, always call `broadcastGameState(roomId, room)`.

### Auth System

Dual auth: wallet (Solana) or email+password. JWT stored in localStorage (`batak_auth_token`), 7-day expiry. Player ID format: wallet users = publicKey string, email users = `"E_"+UUIDv4`.

Key files: `server/src/auth/AuthService.ts`, `client/src/auth/AuthContext.tsx` (`useAuth()` hook).

### Bot AI (`server/src/bots/`)

Strategy pattern: `EasyStrategy` (random), `NormalStrategy` (hand analysis), `HardStrategy` (card counting). `HandAnalyzer.ts` evaluates hand strength. Bot turns have 1.5s delay, trick display has 3s delay.

### Client UI — Mobile-First Layout

`GameRoom.tsx` uses a mobile-first design (target ~390px portrait):
- **Mini header** (32px): round/trump/trick count + hamburger menu
- **CSS Grid game table** (3x3): opponent-top / opponent-left / trick-area / opponent-right / my-info-bar
- **Hand strip**: horizontal scroll with overlapping cards (48x72px, -20px margin)
- **Bidding sheet**: in-flow bottom panel (not fixed), max-height 34vh
- **Scoreboard**: hidden by default, slide-in overlay from right (hamburger toggle)
- **Navbar hidden** during gameplay (App.tsx doesn't render Navbar when `appState === 'playing'`)

Trick cards are positioned by relative player direction (top/left/right/bottom) using `getTrickSlotForPlayer()`.

## Important File Locations

**Core Game Logic (Server):**
- `server/src/game/GameStateMachine.ts` — central state machine
- `server/src/game/Card.ts` — deck creation, card comparison
- `server/src/game/TurnValidator.ts` — move validation
- `server/src/game/Scoring.ts` — score calculation

**Socket & Matchmaker:**
- `server/src/socket/SocketServer.ts` — all Socket.IO event handlers
- `server/src/matchmaker/Matchmaker.ts` — room creation, bot turn management

**Client:**
- `client/src/components/GameRoom.tsx` + `GameRoom.css` — main game UI
- `client/src/auth/AuthContext.tsx` — `useAuth()` hook (all components use this, not `useWallet()`)
- `client/src/socket/SocketContext.tsx` — socket connection
- `client/src/types/game.ts` — client-side type definitions

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
