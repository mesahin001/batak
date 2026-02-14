# Testing Patterns

**Analysis Date:** 2025-02-14

## Test Framework

**Runner:**
- Jest 29.7.0
- Config: `server/jest.config.js`
- Environment: Node.js

**Assertion Library:**
- Jest built-in assertions with `@jest/globals`

**Run Commands:**
```bash
cd server && npm test              # Run all tests
cd server && npm run test:watch    # Watch mode
npm test -- --coverage            # Coverage report
```

**Expected Output:**
- 86 tests pass
- 8 tests fail (known: ihaleli_batak scoring formula tests - expected test failures)

## Test File Organization

**Location:**
- Co-located pattern: Tests in `src/[module]/__tests__/[module].test.ts`
- Example: `server/src/game/__tests__/Scoring.test.ts` (tests `server/src/game/Scoring.ts`)

**Test Files:**
- `server/src/game/__tests__/Card.test.ts` — Card creation, shuffling, dealing
- `server/src/game/__tests__/GameFlow.test.ts` — Integration tests for multi-turn games
- `server/src/game/__tests__/Scoring.test.ts` — Scoring calculations (includes 8 known failures)
- `server/src/game/__tests__/TurnValidator.test.ts` — Move validation and bid validation

**Naming Convention:**
- Pattern: `[module].test.ts`
- Test suites: `describe('[Module]', () => { ... })`
- Test cases: `it('should [expected] [given condition]', () => { ... })`

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect } from '@jest/globals';
import { functionUnderTest } from '../module.js';

// Helper functions at top
function createCard(suit: Suit, rank: Rank, id?: string): Card {
  return { suit, rank, id: id || `${suit}-${rank}-test` };
}

describe('Module Name', () => {
  describe('functionName', () => {
    describe('Scenario or category', () => {
      it('should do X when Y', () => {
        // Arrange
        const input = createCard(...);

        // Act
        const result = functionUnderTest(input);

        // Assert
        expect(result).toBe(...);
      });
    });
  });
});
```

**Patterns:**

1. **Setup Pattern:**
   - Helper functions defined at top of file (e.g., `createPlayer()`, `createCard()`)
   - Factories return fully populated objects with sensible defaults
   - Use to create test data without repetition

2. **Teardown Pattern:**
   - Not needed for unit tests (no persistent state)
   - Game state is created fresh for each test

3. **Assertion Pattern:**
   - Use `expect()` with matchers: `.toBe()`, `.toEqual()`, `.toContain()`, `.toHaveLength()`
   - Chain assertions: `expect(result).toBe(70);`
   - Multiple assertions in single test when testing related outcomes

## Mocking

**Framework:** Jest built-in mocking (no external library)

**Patterns:**
- Not heavily used in current tests
- Database mocks: None (tests are unit-level)
- Socket mocks: None (SocketServer has no tests yet)

**What to Mock:**
- External dependencies: DatabaseManager, API calls, WebSockets
- Time-based operations: Bot turn delays (would use `jest.useFakeTimers()`)

**What NOT to Mock:**
- Core game logic (GameStateMachine, TurnValidator)
- Card operations (createDeck, shuffleDeck)
- Scoring calculations
- Pure utility functions

## Fixtures and Factories

**Test Data Pattern:**

From `Scoring.test.ts`:
```typescript
function createPlayer(
  id: string,
  name: string,
  tricksWon: number = 0,
  totalScore: number = 0,
  roundScores: number[] = [],
  bid: Bid | null = null,
  declaredKing: boolean = false
): PlayerState {
  return {
    id,
    name,
    type: PlayerType.HUMAN,
    hand: [],
    tricksWon,
    score: 0,
    totalScore,
    roundScores,
    bid,
    isReady: false,
    declaredKing
  };
}
```

From `Card.test.ts`:
```typescript
function createCard(suit: Suit, rank: Rank, id?: string): Card {
  return {
    suit,
    rank,
    id: id || `${suit}-${rank}-test`
  };
}
```

**Location:**
- Defined in each test file at top, before describe blocks
- Not centralized; duplicated across test files
- Keep focused on specific module's needs

## Coverage

**Requirements:** Not enforced (no minimum coverage target)

**Configuration** (`jest.config.js`):
```javascript
collectCoverageFrom: [
  'src/**/*.ts',
  '!src/**/*.d.ts',
  '!src/server.ts',
  '!src/types/**'
],
coverageDirectory: 'coverage',
coverageReporters: ['text', 'lcov', 'html']
```

**View Coverage:**
```bash
cd server && npm test -- --coverage
# Generates: server/coverage/index.html for detailed report
```

**Gaps:**
- Socket event handlers not tested (SocketServer.ts)
- Database operations not tested (DatabaseManager.ts)
- Bot strategies not tested (NormalStrategy.ts, EasyStrategy.ts)
- Auth service not fully tested
- Matchmaker not tested

## Test Types

**Unit Tests:**
- Scope: Pure functions (Scoring, TurnValidator, Card operations)
- Approach: Single input → single output, no side effects
- Example: `calculateScores()`, `validateCardPlay()`, `createDeck()`
- Run: `npm test -- [module].test.ts`

**Integration Tests:**
- Scope: Multi-step game flows with state changes
- Approach: Create GameStateMachine, add players, simulate game
- Example: `GameFlow.test.ts` tests deal → bidding → playing → scoring
- Run: `npm test -- GameFlow.test.ts`

**E2E Tests:**
- Not implemented
- Would test: Full game from queue join to match completion via Socket.IO
- Tools needed: Jest + Socket.IO client mock

## Common Patterns

**Async Testing (not currently used):**
```typescript
// If tests needed to be async (e.g., await bcrypt):
it('should hash password', async () => {
  const hashed = await bcrypt.hash('password', 10);
  expect(hashed).toBeTruthy();
});
```

**Error Testing:**

From `TurnValidator.test.ts`:
```typescript
describe('Turn validation', () => {
  it('should reject card play when not player turn', () => {
    const card = createCard(Suit.SPADES, Rank.ACE);
    const player = createPlayer('p1', 'Player 1', [card]);

    const result = validateCardPlay(player, card, null, false); // isPlayerTurn=false

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Not your turn');
  });
});
```

Pattern: Call function with invalid input, assert error is returned (not thrown)

**State Mutation Testing:**

From `GameFlow.test.ts`:
```typescript
it('should deal exactly 13 cards to each player', () => {
  const machine = new GameStateMachine('test-room', 5, 'koz_maca');
  machine.addPlayer('p1', 'Player 1', false);
  machine.addPlayer('p2', 'Player 2', true);
  machine.addPlayer('p3', 'Player 3', true);
  machine.addPlayer('p4', 'Player 4', true);

  machine.startGame(); // Mutation happens here

  const state = machine.getRoom(); // Read new state
  expect(state.players[0].hand.length).toBe(13);
});
```

Pattern: Mutate via method call, then inspect state via getter

**Multi-step Tests:**

```typescript
it('should maintain card count after playing tricks', () => {
  const machine = new GameStateMachine('test-room', 5, 'koz_maca');
  machine.addPlayer(...); // Step 1: Setup
  machine.startGame();    // Step 2: Initialize

  machine.submitBid(...); // Step 3: Bid phase
  machine.submitBid(...);

  machine.startPlaying(); // Step 4: Play phase
  for (let i = 0; i < 4; i++) {
    machine.playCard(...); // Step 5: Play cards
  }

  const state = machine.getRoom();
  expect(state.players[0].hand.length).toBe(12); // Assert: Step 6
});
```

## Configuration

**Jest Config** (`server/jest.config.js`):
```javascript
export default {
  preset: 'ts-jest',                    // TypeScript support
  testEnvironment: 'node',              // Node.js environment
  roots: ['<rootDir>/src'],             // Search tests in src/
  testMatch: ['**/__tests__/**/*.test.ts'], // Test file pattern
  moduleNameMapper: {                   // Handle .js extensions in imports
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        noUnusedLocals: false,          // Relax checks in tests
        noUnusedParameters: false,
      }
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
};
```

**TypeScript in Tests:**
- Tests compiled by ts-jest before running
- Unused variable warnings disabled for test files
- Full type checking enabled for assertions

## Known Issues with Tests

**Failing Tests (Expected):**
- 8 tests in `Scoring.test.ts` fail (ihaleli_batak scoring formula mismatch)
- Tests documented but not fixed (known limitation of scoring system)
- Total: 86 pass / 8 fail

**Missing Test Coverage:**
- Socket.IO event handlers (SocketServer.ts) — No tests
- Database operations (DatabaseManager.ts) — No tests
- Bot AI strategies (bots/ folder) — No tests
- Authentication (AuthService.ts) — Minimal tests
- Matchmaker logic — No tests

## Running Tests in Development

```bash
# Run all tests
cd server && npm test

# Run single test file
cd server && npm test -- Scoring.test.ts

# Run tests matching pattern
cd server && npm test -- --testNamePattern="should calculate score"

# Watch mode (re-run on changes)
cd server && npm run test:watch

# Coverage report
cd server && npm test -- --coverage
# Opens: server/coverage/index.html
```

---

*Testing analysis: 2025-02-14*
