# Coding Conventions

**Analysis Date:** 2025-02-14

## Naming Patterns

**Files:**
- Classes and modules: PascalCase (e.g., `GameStateMachine.ts`, `AuthService.ts`, `NormalStrategy.ts`)
- Constants and config: camelCase or UPPER_CASE (e.g., `config.ts`, `TOTAL_ROUNDS_OPTIONS`, `BCRYPT_ROUNDS`)
- Test files: use `__tests__` directory with `[module].test.ts` pattern (e.g., `src/game/__tests__/Scoring.test.ts`)

**Functions:**
- camelCase for all function names
- Exported functions: use snake_case for event handlers (e.g., `handleJoinQueue`, `handlePlayCard`)
- Bot strategy methods: camelCase (e.g., `decideBid`, `decideCard`, `chooseLeadCard`)
- Helpers: descriptive camelCase (e.g., `calculateScores`, `validateCardPlay`, `getPlayableCards`)

**Variables:**
- camelCase: const, let, function parameters (e.g., `playerId`, `currentPlayerIndex`, `trumpSuit`)
- Private fields: camelCase with `private` modifier (e.g., `private room: GameRoom`, `private db: DatabaseManager`)
- State variables: camelCase (e.g., `selectedCard`, `isPlayingCard`, `roundCompleteData`)

**Types & Interfaces:**
- PascalCase: `GameState`, `PlayerState`, `Suit`, `Card`, `Bid`, `BidType`
- Enums: PascalCase values (e.g., `Suit.SPADES`, `Rank.ACE`, `GameState.BIDDING`)
- Result/Response types: `[Operation]Result`, `[Operation]Response` (e.g., `AuthResult`, `ValidationResult`)

**Constants:**
- Global constants: UPPER_SNAKE_CASE (e.g., `BCRYPT_ROUNDS = 10`, `JWT_EXPIRY = '7d'`)
- Readonly arrays: UPPER_SNAKE_CASE (e.g., `TOTAL_ROUNDS_OPTIONS = [5, 7, 9, 11]`)

## Code Style

**Formatting:**
- No explicit linter configured (eslint/prettier files present in node_modules but not in root)
- 2-space indentation (observed across all files)
- Line length: no enforced limit (files use variable line lengths)
- Semicolons: required at end of statements
- String literals: single quotes preferred in most code (e.g., `'spades'`, `'test-room'`)

**Imports:**
- ES6 modules with `.js` extension for relative imports (e.g., `import { GameStateMachine } from './GameStateMachine.js'`)
- Absolute path aliases via `tsconfig.json`: `@/*` maps to `./src/*`
- Import order: (1) external libraries, (2) internal types, (3) internal modules

**Classes:**
- Constructor-based dependency injection: `constructor(roomId: string, db?: DatabaseManager)`
- Private fields declared at top of class: `private room: GameRoom`
- Public getter methods for state access: `getRoom()`, `getCurrentRound()`
- Method organization: public methods first, then private methods

## TypeScript Configuration

**Compiler Options (`server/tsconfig.json`):**
- Target: ES2022
- Module: ESNext
- Strict mode: enabled (`"strict": true`)
- noUnusedLocals: true (warns on unused variables)
- noUnusedParameters: true (warns on unused parameters)
- Path aliases: `@/*` → `./src/*`

## Comments

**Documentation:**
- JSDoc comments for public functions/classes:
  ```typescript
  /**
   * Calculate final scores for all players in the round.
   * Applies bid penalties and bonuses based on game mode.
   */
  export function calculateScores(...) { }
  ```

- Turkish comments in some files (game logic, state machine descriptions):
  ```typescript
  /**
   * Oyun state makinesi.
   * LOBBY → BIDDING → PLAYING → SCORING → FINISHED geçişlerini yönetir.
   */
  ```

**Inline Comments:**
- Used sparingly for non-obvious logic
- Format: `// Explanation of why or what this does`
- Section headers: `// =====================================================`

## Logging

**Framework:** Native `console.log`, `console.error` (no structured logging library)

**Patterns:**
- Prefix with component: `console.log('[GameStateMachine] ...')`
- Prefix with module: `console.log('[Matchmaker] ...')`
- Prefix with subsystem: `console.log('[Bot] ...')`
- Error logging: `console.error('[Service] Error:', error)`
- Debug output: `console.log('[Debug] Print all players in room')`

**Examples from codebase:**
```typescript
console.log(`Client connected: ${socket.id}`);
console.log('[GameStateMachine] Current players in room:');
console.error('[AuthService] Register error:', error);
console.log('[Bot] Room no longer exists, skipping action');
```

## Error Handling

**Patterns:**
- Try-catch blocks around async operations and database calls:
  ```typescript
  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const playerId = this.db.registerEmailUser(email, passwordHash);
    return { success: true, playerId, token };
  } catch (error) {
    console.error('[AuthService] Register error:', error);
    return { success: false, error: 'Kayit basarisiz' };
  }
  ```

- Validation results as objects: `ValidationResult { valid: boolean; reason?: string }`
- Success/failure results: `AuthResult { success: boolean; error?: string; playerId?: string; token?: string }`
- Early returns for null/undefined checks:
  ```typescript
  if (!socket) return;
  if (!auth) {
    return { success: false, error: 'Email veya sifre hatali' };
  }
  ```

**Room Safety Pattern (Critical for bot timers):**
All bot actions with `setTimeout` check room existence before executing:
```typescript
setTimeout(() => {
  const currentRoom = this.rooms.get(roomId);
  if (!currentRoom) {
    console.log('[Bot] Room no longer exists, skipping action');
    return;
  }
  // ... execute bot action
}, 3000);
```

**Player Removal Pattern (Critical):**
When removing players, remove from BOTH socket map and game state:
```typescript
room.players.delete(publicKey);           // Remove from socket map
room.gameMachine.removePlayer(publicKey); // Remove from game state
```

## Function Design

**Size:** Functions average 20-80 lines; complex logic split into helpers

**Parameters:**
- Maximum 4 parameters per function; use objects for additional args
- Required params first, optional params after
- Type annotations required for all parameters

**Return Values:**
- Functions return typed objects, not tuples
- Void functions used for state mutations (e.g., `submitBid()`)
- Pure functions return new data structures instead of mutating:
  ```typescript
  export function setPlayerBid(player: PlayerState, bid: Bid): PlayerState {
    return { ...player, bid };
  }
  ```

**Async/Await:**
- Used for bcrypt operations, database calls, socket emissions
- No promise chains; prefer async/await

## Module Design

**Exports:**
- Explicit export statements: `export class`, `export function`, `export interface`
- Named exports preferred over default exports
- Barrel files not used; direct imports

**Organization:**
- Game logic: `server/src/game/` (GameStateMachine.ts, TurnValidator.ts, Scoring.ts, etc.)
- Socket handlers: `server/src/socket/` (SocketServer.ts, handlers/)
- Authentication: `server/src/auth/` (AuthService.ts)
- Bot AI: `server/src/bots/strategies/` (NormalStrategy.ts, EasyStrategy.ts, etc.)
- Database: `server/src/database/` (DatabaseManager.ts)
- Types: `server/src/types/` (game.ts, socket.ts, tournament.ts)

## Client (React/React Native) Conventions

**Component Naming:** PascalCase (e.g., `GameRoom`, `AuthScreen`, `LobbyScreen`)

**Context/Hooks:**
- Export context and provider: `AuthProvider`, `SocketProvider`
- Export hook: `useAuth()`, `useSocket()`
- Context creation in single file

**State Management:**
- `useState()` for component-level state
- Context for app-level state (auth, socket)
- Props drilling acceptable for game state

**Styling:**
- React Native: StyleSheet.create() with PascalCase keys
- Web: CSS modules (`GameRoom.css`) or inline styles

**React Native Specific:**
- Component names match file names: `GameRoomScreen.tsx` exports `GameRoomScreen`
- Use `useNavigation()` hook from React Navigation
- Screen parameters typed and extracted at top of component

## Test Naming and Structure

**Test Files:**
- Location: `src/[module]/__tests__/[module].test.ts`
- Pattern: `describe()` > `describe()` > `it()`
- Descriptive test names: `should [expected behavior] [given conditions]`

Example:
```typescript
describe('Scoring Module', () => {
  describe('calculatePlayerScoreWithBid', () => {
    it('should calculate score for bid exactly met (bid 7, take 7)', () => {
      // test body
    });
  });
});
```

**Helper Functions:**
- Define at top of test file above describe blocks
- Prefix with `create` for factories: `createPlayer()`, `createCard()`
- Keep minimal and focused on test data

---

*Convention analysis: 2025-02-14*
