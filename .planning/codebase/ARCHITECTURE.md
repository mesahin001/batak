# Architecture

**Analysis Date:** 2025-02-14

## Pattern Overview

**Overall:** Server-authoritative distributed game with real-time WebSocket communication and multi-platform clients (Web, React Native mobile).

**Key Characteristics:**
- All game logic runs server-side (no client-side state manipulation)
- Real-time event-driven communication via Socket.IO
- State machine drives game flow (LOBBY → BIDDING → PLAYING → SCORING → FINISHED)
- Dual authentication (Solana wallet + email/password)
- Multi-round support with persistent scoring across rounds
- Bot AI fills empty slots (pluggable strategy pattern)

## Layers

**Presentation Layer:**
- Purpose: Render game UI, handle user input, display state
- Location: `client/src/components/`, `mobile/src/screens/`
- Contains: React components (GameRoom, Lobby, Bidding UI), React Native screens
- Depends on: Socket context, Auth context, Game types
- Used by: Browsers, Expo mobile apps

**Socket/Communication Layer:**
- Purpose: Establish WebSocket connection, emit events, receive updates
- Location: `client/src/socket/SocketContext.tsx`, `mobile/src/contexts/SocketContext.tsx`
- Contains: Socket.IO client wrappers, connection management, event subscription
- Depends on: socket.io-client library
- Used by: Auth context, Game UI components

**Authentication Layer:**
- Purpose: Manage login/registration, JWT tokens, player identity
- Location: `client/src/auth/AuthContext.tsx`, `mobile/src/contexts/AuthContext.tsx`, `server/src/auth/AuthService.ts`
- Contains: Email registration, password validation, wallet integration, token persistence
- Depends on: Socket context, Solana wallet context (for mobile/web)
- Used by: App-level providers, all protected features

**Game State & Event Handling (Server):**
- Purpose: Validate moves, manage game progression, broadcast state
- Location: `server/src/socket/SocketServer.ts`, `server/src/game/GameStateMachine.ts`
- Contains: Socket event handlers for client actions (JOIN_QUEUE, PLAY_CARD, BID_TRUMP), game state machine
- Depends on: Matchmaker, DatabaseManager, AuthService, GameStateMachine
- Used by: Client Socket.IO connections

**Game Logic Layer (Server):**
- Purpose: Core game rules, card validation, score calculation
- Location: `server/src/game/`
- Contains: GameStateMachine (state transitions), TurnValidator (move validation), Scoring (round/game scores), Player (state mutations), Card (comparison logic), Deck (creation/dealing)
- Depends on: Game type definitions
- Used by: SocketServer, Matchmaker, GameStateMachine

**Matchmaking & Room Management (Server):**
- Purpose: Pair real players, fill with bots, create/destroy game rooms
- Location: `server/src/matchmaker/Matchmaker.ts`
- Contains: Queue entry management, timeout-based bot fallback (60s PvP, 30s mixed), room lifecycle
- Depends on: GameStateMachine, BotManager
- Used by: SocketServer (via event handlers)

**Bot AI Layer (Server):**
- Purpose: Play cards on behalf of bot players with realistic strategy
- Location: `server/src/bots/`
- Contains: BotManager, HandAnalyzer (evaluate hand strength), three strategies (Easy/Normal/Hard), bot turn timers
- Depends on: GameStateMachine (state reading), Game types
- Used by: Matchmaker, SocketServer (bot turn handlers)

**Data Persistence Layer (Server):**
- Purpose: Store player profiles, game history, auth records, NFT rewards
- Location: `server/src/database/DatabaseManager.ts`
- Contains: SQLite wrapper (better-sqlite3), player stats, game records, auth credentials
- Depends on: SQLite driver
- Used by: AuthService, SocketServer (record game completion)

**Authentication & Authorization (Server):**
- Purpose: Validate credentials, issue JWT tokens, manage player auth records
- Location: `server/src/auth/AuthService.ts`
- Contains: Email/password registration and login, wallet token generation, JWT verification
- Depends on: bcryptjs, jsonwebtoken, DatabaseManager
- Used by: SocketServer (auth event handlers)

**Blockchain Integration (Server):**
- Purpose: Mint cNFT rewards upon game completion
- Location: `server/src/solana/`
- Contains: TournamentManager, CNFTMinter (mints cNFTs), MerkleTreeManager, SolanaClient
- Depends on: Metaplex Bubblegum, Anchor, Solana web3.js
- Used by: SocketServer (on game completion)

**Configuration & Startup (Server):**
- Purpose: Load environment variables, initialize services, start HTTP/WebSocket server
- Location: `server/src/server.ts`, `server/src/config.ts`
- Contains: Express app, HTTP server, SocketServer instantiation, health check endpoints
- Depends on: All service layers
- Used by: npm start, Docker container

## Data Flow

**Game Join Flow:**
1. Client emits `JOIN_QUEUE` with botCount, gameMode, difficulty
2. SocketServer routes to `Matchmaker.joinQueue()`
3. Matchmaker checks for instant match (botCount === 3) or queues player
4. If 4 players queued for same gameMode → `createRoom()` creates GameStateMachine, adds players
5. Server emits `MATCH_FOUND` to all 4 sockets with initial `gameState`
6. Client receives event, transitions from Lobby to GameRoom

**Card Play Flow:**
1. Client emits `PLAY_CARD { cardId }` for current player
2. SocketServer validates: correct player? valid card? follows suit?
3. Server removes card from hand, adds to current trick
4. If trick complete (4 cards) → `completeTrick()` calculates winner, updates trick history
5. Server broadcasts updated `GAME_STATE_UPDATE` to all players (per-player hidden hands)
6. Client renders new state

**Bidding Flow:**
1. Game enters BIDDING state → server broadcasts `GAME_STATE_UPDATE`
2. For each player in turn order:
   - If human: waits for `BID_TRUMP { suit, amount }` or pass
   - If bot: delay 1.5s, `BotManager.selectBid()` returns suit/amount, server calls `submitBid()`
3. When all 4 bids received (or 3 pass): `trumpSuit` set, game transitions to PLAYING
4. Server broadcasts state with trump, first player index, empty hand

**Round Completion Flow:**
1. All 13 tricks completed → game transitions to SCORING state
2. Server calculates scores for each player: `calculateScores()` applies Batak rules
3. Updates player `roundScores` array, cumulative `totalScore`
4. Server checks win condition (for Ihaleli: first ≤1? for Koz Maca: rounds exhausted?)
5. If game complete → FINISHED, record in database, mint NFTs
6. Server emits `ROUND_COMPLETE` or `GAME_COMPLETE` event

**State Management:**
- **Server source of truth:** `GameStateMachine` holds immutable room state (copied on each mutation)
- **Per-player visibility:** `getStateForClient(playerId)` hides opponents' hands before broadcast
- **Client side:** Receive state, render, emit action, await next state update
- **Multi-round:** State persists across rounds (cumulative scores, round history), player hands reset for new deal

## Key Abstractions

**GameStateMachine:**
- Purpose: Central state machine managing all game progression
- Examples: `server/src/game/GameStateMachine.ts`
- Pattern: Immutable state updates, methods for each action (startGame, submitBid, playCard, completeTrick, completeRound, startNextRound)

**Player Identification:**
- Purpose: Uniquely identify players across connections and reconnects
- Examples: `playerId` = wallet publicKey or `"E_"+UUIDv4` for email users
- Pattern: Always match by `playerId` (stable), NOT `socketId` (changes on reconnect)

**Room Lifecycle:**
- Purpose: Track game room state from creation to destruction
- Examples: `Matchmaker.rooms` Map<roomId, GameRoom>
- Pattern: Room contains gameMachine, player sockets map, botManager; destroyed when game finishes

**Strategy Pattern (Bot AI):**
- Purpose: Swap bot difficulty without changing main bot logic
- Examples: `server/src/bots/strategies/{Easy|Normal|Hard}Strategy.ts`
- Pattern: Each implements `selectCard(hand, trumpSuit, trickCards, playerIndex)` differently

**Client-Side State Isolation:**
- Purpose: Each client renders only its own perspective of game
- Examples: `client/src/components/GameRoom.tsx` uses `gameState.players[myPlayerIndex]`
- Pattern: `useAuth().playerId` identifies self, find own index via array search, render accordingly

**Dual Auth:**
- Purpose: Support wallet-less (email) and wallet-based login seamlessly
- Examples: `server/src/auth/AuthService.ts` generates tokens for both; `client/src/auth/AuthContext.tsx` auto-detects
- Pattern: playerId format differs (publicKey vs "E_"+UUID) but treated identically in game logic

## Entry Points

**Server:**
- Location: `server/src/server.ts`
- Triggers: `npm run dev` or Docker container startup
- Responsibilities: Create HTTP server, initialize DatabaseManager, AuthService, CNFTMinter, SocketServer; expose /health endpoint

**WebSocket Connection:**
- Location: `server/src/socket/SocketServer.ts` constructor
- Triggers: Browser/mobile app connects to Socket.IO server
- Responsibilities: Register event handlers (JOIN_QUEUE, PLAY_CARD, BID_TRUMP, etc.); manage per-socket lifecycle

**Game State Machine:**
- Location: `server/src/game/GameStateMachine.ts`
- Triggers: `Matchmaker.createRoom()` instantiates one per game
- Responsibilities: Execute game flow (deal cards, bidding, playing, scoring); validate transitions; calculate outcomes

**Client Web:**
- Location: `client/src/main.tsx` → `App.tsx`
- Triggers: Browser load `npm run dev` or `npm run build` + serve
- Responsibilities: Initialize React providers (SocketProvider, AuthProvider, WalletProvider); route app state (loading → auth → lobby → playing → results)

**Client Mobile:**
- Location: `mobile/App.tsx` → `RootNavigator.tsx`
- Triggers: Expo app startup (`npm start` → press 'a' or 'i')
- Responsibilities: Initialize i18n, providers (SocketProvider, AuthProvider, WalletProvider); conditional render auth vs main navigation

## Error Handling

**Strategy:** Defensive validation on server, user-friendly errors on client

**Patterns:**
- **Move Validation:** `TurnValidator.validateCardPlay()` checks card exists in hand, follows suit/trump rules; rejects invalid moves, sends ERROR event
- **Game State Validation:** Before state transitions (e.g., can't play card in BIDDING state), guard clauses return early
- **Room Lifecycle:** When room destroyed (all players left, game finished), check room existence before executing bot timers; skip if room not found
- **Auth Errors:** Return `{ success: false, error: "..." }` from AuthService; client displays message, prompts retry
- **Socket Disconnection:** Store player publicKey, allow rejoin within grace period (30s); if not rejoined, remove from game

## Cross-Cutting Concerns

**Logging:** Console logging with prefixes: `[GameStateMachine]`, `[Matchmaker]`, `[SocketServer]`, `[AuthService]`, `[Bot]`; no structured logging library

**Validation:** Per-layer (move validation in GameStateMachine, email format in AuthService, token in SocketServer); **all client input is untrusted**

**Authentication:** JWT tokens stored in localStorage (web/mobile); validated on socket auth events; 7-day expiry; wallet auto-auth on connection

**Security:** bcryptjs for password hashing (10 rounds); server-authoritative state (client can't modify); Solana transaction signing for NFT mints

**Scalability:** In-memory room storage (loses state on restart); Redis adapter available for distributed Socket.IO; PostgreSQL upgrade path documented

---

*Architecture analysis: 2025-02-14*
