# Codebase Concerns

**Analysis Date:** 2025-02-14

## Tech Debt

### Scoring Formula Mismatch (ihaleli_batak mode)
- Issue: Test suite documents 8 failing tests in scoring calculations, but actual test run shows all 94 tests passing. Historical comment in CLAUDE.md references expected failures that no longer exist.
- Files: `server/src/game/Scoring.ts`, `server/src/game/__tests__/Scoring.test.ts`
- Impact: Documentation is outdated. The scoring implementation appears correct now, but legacy comments suggest past formula uncertainty.
- Fix approach: Verify ihaleli_batak scoring formula matches true Turkish rules (currently `tricksWon × 10` for successful bids, `-amount × 10` for failures). Document the formula clearly in code comments.

### Large File Complexity
- Issue: `SocketServer.ts` (1,092 lines) and `Matchmaker.ts` (755 lines) contain multiple concerns that could be split into smaller modules.
- Files: `server/src/socket/SocketServer.ts`, `server/src/matchmaker/Matchmaker.ts`
- Impact: Hard to maintain, test, and debug socket event handlers and matchmaking logic together. High cognitive load.
- Fix approach: Extract bot turn handling into `BotTurnHandler.ts`, matchmaker queue logic into `QueueManager.ts`, private room logic into `PrivateRoomManager.ts`.

### TypeScript Compilation Warnings (Pre-existing)
- Issue: Unused imports across bot strategy files, Solana SDK modules report "not found" at compilation time despite working at runtime.
- Files: `server/src/bots/strategies/*.ts`, `server/src/solana/*.ts`
- Impact: TSC --noEmit reports noise; may hide real type errors. Better-sqlite3 module resolution is a runtime-only issue.
- Fix approach: Add `ts-ignore` comments for known false positives, or configure tsconfig.json to suppress these specific module errors.

### Environment Variable Secrets Exposure Risk
- Issue: `.env` files exist but are properly in `.gitignore`. However, `.env.example` files list environment variable names that could hint at infrastructure details.
- Files: `client/.env.example`, `mobile/.env.example`, `mobile/.env.production`
- Impact: Low immediate risk (secrets not exposed), but `.env.production` exists in repo and should be .gitignored or excluded from version control.
- Fix approach: Ensure `.env.production` is never committed. Use `.env.production.example` instead with placeholder values.

### Floating Promise in Socket Connection Setup
- Issue: `setupRedisAdapter()` in SocketServer constructor returns a Promise but is not awaited or error-handled.
- Files: `server/src/socket/SocketServer.ts:38`
- Impact: If Redis adapter setup fails asynchronously, `setupEventHandlers()` may be called before adapter is ready, or errors silently ignored.
- Fix approach: Make constructor async and await Redis adapter, or restructure to initialize adapter after event handlers are ready with proper error handling.

## Known Bugs

### Disconnected Socket References in Bot Timers
- Symptom: Bot action setTimeout callbacks may execute after room is deleted, referencing stale room object.
- Files: `server/src/socket/SocketServer.ts:941-989`, `server/src/socket/SocketServer.ts:850-900`, `server/src/matchmaker/Matchmaker.ts:300+`
- Trigger: Player disconnects during bot's 2-3 second delay in bot-only game → room closes → timer fires → room reference is undefined
- Workaround: Implemented room existence check in all bot timers (verified Feb 10, 2025). However, no global cleanup of pending timers on room close.
- Fix approach: Add a timer registry to GameRoom and clear all pending timers in `closeRoom()` method.

### Socket Reconnection Edge Cases
- Symptom: Player reconnects quickly (< 30 second grace period) may encounter race conditions where old and new sockets coexist momentarily.
- Files: `server/src/matchmaker/Matchmaker.ts:65-79`, `server/src/socket/SocketServer.ts:680-740`
- Trigger: Rapid disconnect + reconnect while still in queue or in active game room.
- Workaround: Queue deduplication by publicKey checks for disconnected sockets, but game state may briefly have duplicate references.
- Fix approach: Implement socket replacement atomically — immediately close old socket when new one connects with same publicKey.

### Room Cleanup Not Guaranteed on Disconnect
- Symptom: If `handleDisconnect()` fails to find or properly remove player, ghost players may remain in room.gameMachine internal state.
- Files: `server/src/socket/SocketServer.ts:650-750`, `server/src/matchmaker/Matchmaker.ts:527-550`
- Trigger: Network failures, unhandled exceptions in disconnect handler.
- Workaround: `removePlayerFromRoomByPublicKey()` now removes from both socket map and game state. But if socket lookup fails initially, second reference remains.
- Fix approach: Add audit logging to verify both locations are updated, or implement a periodic cleanup sweep.

### SocketContext useEffect Dependency Array
- Symptom: `SocketProvider` in client reconnects on every parent re-render due to `url` dependency, creating multiple socket instances.
- Files: `client/src/socket/SocketContext.tsx:83-89`
- Trigger: Parent component re-renders while socket is already initialized.
- Workaround: None currently. useCallback on `connect` doesn't prevent reinstantiation if dependencies change.
- Fix approach: Move socket URL to a stable ref, or memoize SocketProvider with React.memo.

## Security Considerations

### JWT Secret Not Rotated
- Risk: Single JWT_SECRET used for all tokens. If compromised, all existing tokens become vulnerable. No rotation mechanism.
- Files: `server/src/auth/AuthService.ts:136-139`, `.env` file
- Current mitigation: 7-day token expiry (JWT_EXPIRY), forces re-login regularly.
- Recommendations:
  1. Implement key versioning (store multiple secrets with versions)
  2. Add token rotation: refresh tokens with new secret on each use
  3. Log token issuance and validation failures
  4. Support key rotation without service restart

### Password Hashing Uses Default Rounds
- Risk: BCRYPT_ROUNDS = 10 is acceptable but on lower end. If passwords ever leak (DB breach), faster cracking is possible.
- Files: `server/src/auth/AuthService.ts:23`
- Current mitigation: Passwords hashed, not stored plaintext. 7-day JWT expiry limits damage window.
- Recommendations:
  1. Increase to 12 rounds (minimal performance impact, significantly slows cracking)
  2. Document why 10 was chosen (if intentional for mobile registration UX)

### CORS Configuration Too Permissive
- Risk: `origin: '*'` allows any domain to connect. In production, should restrict to known client domains.
- Files: `server/src/socket/SocketServer.ts:24-26`
- Current mitigation: Only affects Socket.IO; HTTP routes may have different CORS config.
- Recommendations:
  1. Set `SOCKET_ALLOWED_ORIGINS` environment variable
  2. Use whitelist for known client domains (web client URL, mobile app deep links)
  3. Reject wildcard origins in production

### Email Validation Regex
- Risk: Regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` is too permissive (allows `a@b.c` which may bounce). Doesn't catch common typos.
- Files: `server/src/auth/AuthService.ts:40`
- Current mitigation: Low impact (worst case: user registers with invalid email and can't receive password reset).
- Recommendations:
  1. Use more robust regex or email validation library
  2. Implement email confirmation (send OTP to verify ownership)
  3. Add rate limiting on registration endpoint

### No Rate Limiting on Auth Endpoints
- Risk: `register()` and `login()` endpoints have no rate limiting. Attackers can brute-force passwords or spam registrations.
- Files: `server/src/socket/SocketServer.ts:200-240` (auth event handlers)
- Current mitigation: None.
- Recommendations:
  1. Implement rate limiter (e.g., `express-rate-limit`) per IP or publicKey
  2. Lock account after N failed login attempts (30 minutes)
  3. Log auth failures for monitoring

## Performance Bottlenecks

### Game State Broadcast to All Clients
- Problem: `broadcastGameState()` sends full game state to every player every state change. In multiplayer, this includes hidden hands for other players.
- Files: `server/src/socket/SocketServer.ts` (called ~100+ times), `server/src/socket/handlers/GameHandler.ts`
- Cause: No subscription system; all room members get all events. Large game state objects serialized as JSON.
- Improvement path:
  1. Implement per-player state filtering before broadcast (already done in `getStateForClient()`)
  2. Implement selective broadcasting (only changed fields)
  3. Compress state diffs instead of full state
  4. Rate-limit state broadcasts during rapid changes (batching)

### No Query Optimization on Leaderboard Fetches
- Problem: Leaderboard queries (`getLeaderboard()`) may scan entire players table without proper indexes.
- Files: `server/src/database/DatabaseManager.ts:145-165`
- Cause: SQLite performance adequate for dev, but will degrade with 10k+ players.
- Improvement path:
  1. Add indexes on `rank_tier`, `current_season_points`, `last_played_at`
  2. Implement pagination for leaderboard (return top 100, not all)
  3. Cache leaderboard in Redis (expire every 1 hour)

### Client GameRoom Re-renders on Every State Change
- Problem: `setCurrentGameState()` causes full component re-render, including all card elements, even for minor state changes.
- Files: `client/src/components/GameRoom.tsx:85-92`
- Cause: No memoization of subcomponents. Every player's card hand re-renders.
- Improvement path:
  1. Split into smaller memoized components (PlayerHand, TrickArea, BiddingSheet)
  2. Use React.memo on card elements
  3. Implement useCallback for event handlers
  4. Consider Zustand/Redux for selective state subscriptions

### Mobile GameRoomScreen Has 1,468 Lines (Monolithic)
- Problem: All game UI logic in single component (rendering, event handling, state management).
- Files: `mobile/src/screens/game/GameRoomScreen.tsx`
- Cause: MVP development pressure. Would benefit from component decomposition.
- Improvement path:
  1. Extract CardHandStrip component
  2. Extract PlayerSlots component (top/left/right rendering)
  3. Extract BiddingOverlay component
  4. Extract GameStats component
  5. Keep only game flow logic in parent

## Fragile Areas

### GameStateMachine State Transitions Not Fully Guarded
- Files: `server/src/game/GameStateMachine.ts:678`
- Why fragile: State machine allows transitions without validation that preconditions are met. Example: `startPlaying()` assumes 4 players and bidding complete, but doesn't assert.
- Safe modification:
  1. Add precondition checks with early returns
  2. Add state assertion at start of each transition method
  3. Test all invalid transition paths
- Test coverage: Limited coverage for state transition edge cases

### Bid Validation Has Implicit Rules
- Files: `server/src/socket/handlers/GameHandler.ts`, `server/src/game/TurnValidator.ts`
- Why fragile: Bid rules (must exceed current highest for ihaleli_batak, must be 1-13 for koz_maca) are scattered across multiple files.
- Safe modification:
  1. Centralize bid validation in `TurnValidator.validateBid()`
  2. Document all bid rules in one place
  3. Add validation tests for edge cases (bid 0, bid 13, bid lower than current highest)
- Test coverage: Bid validation tests exist but may miss edge cases

### Player Removal From Two Data Structures
- Files: `server/src/matchmaker/Matchmaker.ts:556-583`, `server/src/socket/SocketServer.ts:680-750`
- Why fragile: Must remove player from BOTH `room.players` (socket map) and `room.gameMachine` (game state). Missing one causes ghost players or crashes.
- Safe modification:
  1. Encapsulate removal in single Matchmaker method (already done: `removePlayerFromRoomByPublicKey()`)
  2. Add assertion to verify both removals in tests
  3. Add logging when removal succeeds
- Test coverage: No automated tests for this pattern; manual testing required

### Bot Difficulty Defaults Silently
- Files: `server/src/matchmaker/Matchmaker.ts:120+`, `server/src/socket/SocketServer.ts:96-105`
- Why fragile: If botDifficulty not provided, defaults to 'normal' without validation. If enum changes, default may become invalid.
- Safe modification:
  1. Make botDifficulty required (not optional)
  2. Validate against enum at entry points
  3. Return error if invalid difficulty provided
- Test coverage: No tests for invalid bot difficulty values

## Scaling Limits

### In-Memory Room Storage
- Current capacity: Server can store ~10,000 active game rooms (reasonable for dev server)
- Limit: Single Node.js process has ~1.5GB heap. Each room ≈ 150KB (full game state, 4 players, hand, history). Beyond 10k rooms, server crashes.
- Scaling path:
  1. **Immediate (< 1,000 players):** Increase Node.js heap (`--max-old-space-size=4096`)
  2. **Medium (< 10,000 players):** Offload room state to Redis, keep hot games in memory
  3. **Large (> 10,000 concurrent):** Shard servers by game region/ID, use Kafka for state sync

### SQLite Database Concurrency
- Current capacity: SQLite handles ~100 concurrent writes (WAL mode helps, but still limited)
- Limit: Multiple servers writing simultaneously will deadlock or fail
- Scaling path:
  1. Single server: SQLite + WAL mode (current) handles 100+ users
  2. Multi-server: Migrate to PostgreSQL (already migration code exists at `server/src/database/migrate-to-postgres.ts`)
  3. Very large: Add read replicas, implement sharding by user ID

### No Bot AI Optimization
- Current capacity: HardStrategy bot performs card counting for 13 cards, 4 players. O(n²) complexity per decision.
- Limit: Beyond 100 concurrent bot games, bot CPU usage becomes noticeable (10% server CPU per bot)
- Scaling path:
  1. Cache bot decisions (same hand state → same decision)
  2. Pre-compute bot moves during idle time
  3. Offload bot AI to separate worker process pool

### Network Bandwidth Per Game
- Current: Each game broadcasts full state (~5KB) 10-50 times per round (bidding + 13 tricks × 5 broadcasts)
- Limit: 1,000 concurrent games = 50-250 Mbps egress (already significant for commodity hosting)
- Scaling path:
  1. Implement delta compression (send only changed fields)
  2. Batch state updates (send every 100ms, not per-event)
  3. Compress WebSocket frames with permessage-deflate

## Dependencies at Risk

### Socket.IO Version Management
- Risk: Socket.IO client/server version mismatch can cause silent failures
- Files: `package.json` (server and client) specify socket.io versions
- Impact: Mobile app, web client, server all need compatible versions
- Migration plan: Version socket.io uniformly across all packages; test after updates

### Better-sqlite3 Runtime Dependency
- Risk: Module loads at runtime but TypeScript can't resolve it. Future tsc upgrades may break.
- Files: `server/src/database/DatabaseManager.ts:14`
- Impact: Compilation works but type-checking disabled for this module
- Migration plan: Migrate to PostgreSQL (eliminate sqlite3 dependency) using existing migration code

### Solana SDK (Metaplex, Anchor)
- Risk: Bleeding-edge libraries; APIs change frequently. Program ID hardcoded.
- Files: `server/src/solana/*.ts`, CLAUDE.md lists Program ID
- Impact: NFT minting may break if SDK or Solana network changes
- Migration plan:
  1. Abstract Solana client behind interface (already done: `SolanaClient.ts`)
  2. Pin SDK versions precisely (not ^)
  3. Monitor Solana changelog monthly

## Missing Critical Features

### No Persistence for Active Games
- Problem: If server restarts, all in-progress games are lost. Players disconnect and can't rejoin.
- Blocks: Reliable multiplayer experience, long-running tournaments
- Implementation: Save game state to Redis/DB on every state change, reload on startup

### No Player Session Recovery
- Problem: Disconnected player sees "game ended" instead of "rejoin" option during grace period
- Blocks: Mobile players with flaky networks can't continue games
- Implementation: Track player disconnect time, show "rejoin" button for 5 minutes

### No Tournament Mode
- Problem: Games are one-off; no cumulative ranking across multiple games
- Blocks: Leaderboard is misleading (doesn't persist across restarts)
- Implementation: Add tournament record creation, track progression through rounds

### No Admin Dashboard
- Problem: No way to monitor server health, active games, player reports
- Blocks: Debugging live issues, identifying problematic players
- Implementation: Add admin panel with real-time metrics (games running, avg player count, error log)

### No Chat System
- Problem: Players can't communicate during game; blocks social engagement
- Blocks: Competitive/spectator experience
- Implementation: Add in-game chat with message history

## Test Coverage Gaps

### Bot Strategy Testing
- What's not tested: HardStrategy card counting accuracy, edge cases (4 aces in hand, 0 trump, etc.)
- Files: `server/src/bots/strategies/HardStrategy.ts` (289 lines, no test file exists)
- Risk: Bot plays suboptimal cards in edge cases, hurting multiplayer experience
- Priority: Medium (affects bot difficulty perception)

### Private Room Lifecycle
- What's not tested: Private room creation, password validation, join/leave, host migration
- Files: `server/src/matchmaker/Matchmaker.ts` (private room methods), no integration tests
- Risk: Private rooms break silently (already caused issues during testing)
- Priority: High (multiplayer critical path)

### Disconnection & Reconnection Flow
- What's not tested: Rapid disconnect/reconnect, reconnect with stale state, reconnect to finished game
- Files: `server/src/socket/SocketServer.ts` (handleDisconnect, handleRejoinGame), no automated tests
- Risk: Ghost players, duplicate connections, crash on rejoin
- Priority: High (affects stability)

### Payment/NFT Minting Flow
- What's not tested: CNFTMinter.mintReward() end-to-end, Solana transaction failure/retry, metaplex integration
- Files: `server/src/solana/CNFTMinter.ts` (228 lines), `server/src/socket/SocketServer.ts:796-820` (minting on game end)
- Risk: NFTs fail to mint silently or partially, users think they didn't earn rewards
- Priority: High (revenue/engagement critical)

### Game Mode Edge Cases
- What's not tested: ihaleli_batak with all passes, koz_maca el almaz scoring, bidding timeout behavior
- Files: `server/src/game/GameStateMachine.ts`, `server/src/game/Scoring.ts`
- Risk: Unexpected game states (game doesn't progress, scoring is wrong)
- Priority: Medium (affects game integrity)

---

*Concerns audit: 2025-02-14*
