# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Batak Tournament Game** - A multiplayer Turkish trick-taking card game with cNFT rewards on Solana. The game uses a server-authoritative architecture where all game logic runs server-side, with real-time WebSocket communication to React clients.

**Tech Stack:**
- Client: React 18 + Vite + Socket.IO Client + TypeScript
- Server: Node.js + Express + Socket.IO + TypeScript
- Blockchain: Solana Devnet + Anchor + Metaplex Bubblegum (cNFTs)
- Target: Solana Seeker Android app via PWA→APK (Bubblewrap)

## Development Commands

### Starting the Development Environment

```bash
# Terminal 1: Start server (port 3001)
cd server && npm run dev

# Terminal 2: Start client (port 5173)
cd client && npm run dev

# Or use the combined script (if available)
./scripts/local-dev.sh
```

### Building

```bash
# Server
cd server && npm run build

# Client
cd client && npm run build

# Solana Anchor program
cd solana-program
anchor build
anchor test
anchor deploy
```

### Testing

```bash
# Server tests
cd server && npm test
cd server && npm run test:watch
```

### APK Build (Android)

```bash
chmod +x scripts/bubblewrap-build.sh
./scripts/bubblewrap-build.sh
```

## Architecture Overview

### Server-Authoritative Game Architecture

**Critical:** All game logic validation happens on the server. The client is only responsible for rendering and collecting user input.

**Flow:**
1. Client sends action via Socket.IO (`play_card`, `bid_trump`)
2. Server validates using `TurnValidator.ts`
3. Server updates `GameStateMachine.ts`
4. Server broadcasts new state to all clients via `game_state_update`
5. Client renders the new state

**Key implication:** Never trust client input. Always validate on server-side.

### Game State Machine

**Location:** `server/src/game/GameStateMachine.ts`

**States:**
- `LOBBY` - Waiting for players
- `BIDDING` - Players bid tricks (1-13) with Spades as trump
- `PLAYING` - 13 tricks are played
- `SCORING` - Round scores calculated
- `FINISHED` - Game over

**State Transitions:**
```
LOBBY → BIDDING → PLAYING → SCORING → FINISHED
  ↑                              ↓
  └── redeal (all pass) ──────────┘
```

**Important Methods:**
- `startGame()` - Deals 13 cards to each player (52 card deck: 2-A, 4 suits)
- `submitBid()` - Records a bid (must exceed current highest)
- `passBid()` - Player passes (records as amount: 0, moves to next player)
- `playCard()` - Plays a card after validation
- `completeTrick()` - Determines trick winner, awards trick
- `clearTrick()` - Resets for next trick (called after delay to show last card)
- `completeRound()` - Calculates scores when all 13 tricks complete, checks win conditions
- `startNextRound()` - Starts next round (multi-round games)
- `getStateForClient(playerId)` - Returns customized state (hides other players' cards)

### Multi-Round Game Structure

- **Rounds per game**: 5, 7, 9, or 11 rounds (configurable via `totalRounds` parameter)
- **Cards per player**: 13 cards (52-card deck: 2-A)
- **Tricks per round**: 13 tricks
- **Winner**: Player who reaches exactly **1 or below** (LOW score wins, NOT high)
- **After max rounds**: Lowest cumulative score wins

### Batak-Specific Rules (Critical for Development)

**Deck:** 52 cards (standard deck without jokers)
- Ranks: 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A (13 ranks × 4 suits = 52 cards)
- Each player receives 13 cards
- 13 tricks per round

**Trump:** Always Spades (♠/Maça) in Turkish Batak

**Card Ranking:** A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2

**Play Rules:**
- Must follow suit if possible
- Trump beats non-trump
- Higher trump wins, or highest card of lead suit

**Scoring** (`server/src/game/Scoring.ts`):
- Made bid or MORE: `10 × bid + (tricks_won - bid)` (e.g., bid 7, take 9 → 72 points)
- Failed bid: `-10 × bid` (e.g., bid 7, take 5 → -70 points)
- Non-bidders: `tricks_won × 10`
- El almaz (no tricks bid): +50 if 0 tricks, -50 if any tricks taken

### Bot AI Architecture

**Location:** `server/src/bots/`

**Strategy Pattern Implementation:**
- `EasyStrategy.ts` - Random valid moves, 50% pass rate, minimum bids
- `NormalStrategy.ts` - Hand analysis based bidding, basic card selection
- `HardStrategy.ts` - Card counting, memory of played cards, strategic play

**Hand Analysis** (`HandAnalyzer.ts`):
```typescript
interface HandAnalysis {
  totalStrength: number
  suitStrength: Record<Suit, number>
  highCards: number  // Aces and Kings
  guaranteedTricks: number
  possibleTricks: number
  voidSuits: Suit[]  // Can trump these suits
}
```

**Bot Turn Timing:**
- 1.5 second delay for realistic pacing
- 3 second delay after trick completion before clearing (to show last card)

### Socket.IO Communication

**Server Location:** `server/src/socket/SocketServer.ts`

**Client → Server Events:**
```typescript
JOIN_QUEUE            // Join matchmaking
LEAVE_QUEUE           // Leave queue
PLAY_CARD             // { cardId }
BID_TRUMP             // { suit: 'spades', amount: 1-13 } or { suit: 'spades', amount: 0 } for pass
REQUEST_NEXT_ROUND    // Request to start next round (multi-round)
```

**Server → Client Events:**
```typescript
MATCH_FOUND           // { roomId, gameState } - Full game state included
GAME_STATE_UPDATE     // Full state (customized per player - hides other hands)
CARD_PLAYED           // { playerId, cardId } - Broadcast notification
ROUND_COMPLETE        // Round finished with scores
NEXT_ROUND_STARTING   // Next round is starting (multi-round)
GAME_COMPLETE         // Game over + final results: { winner, players, roundHistory }
ERROR                 // { message }
```

**Critical Pattern:** After any game state change, always broadcast via `broadcastGameState(roomId, room)` which calls `gameMachine.getStateForClient(socketId)` for each player to hide opponents' cards.

### Bot Bidding Flow

**Important:** Bidding ends when:
1. All 4 players have had a chance (`bids.length >= 4`)
2. At least one real bid exists (`some(b => b.amount > 0)`)

**Human player at index 0**, bots at indices 1, 2, 3:
- Bidding starts with index 1 (left of dealer)
- Human bids last (index 0)
- After human passes/bids, if conditions met, `startPlaying()` is called
- `startPlaying()` sets trump to Spades and currentPlayerIndex to highest bidder

**Do NOT check `!currentPlayerIsHuman` before starting game** - this was causing bugs where the game wouldn't start after human passed.

### Solana Integration (Optional for MVP)

**Smart Contract:** `solana-program/programs/batak-tournament/`

**Server Managers:** `server/src/solana/`
- `TournamentManager.ts` - On-chain tournament operations
- `CNFTMinter.ts` - Compressed NFT minting via Bubblegum
- `MerkleTreeManager.ts` - Merkle tree management

**cNFT Flow:**
1. Tournament finishes → Server determines winner
2. `submitMatchResult()` - Records winner on-chain (server-signed only)
3. `mintTournamentReward()` - Mints cNFT to winner's wallet

## Important File Locations

### Core Game Logic (Server)
- `server/src/game/GameStateMachine.ts` - **CENTRAL** state machine
- `server/src/game/Card.ts` - Deck creation, card comparison, validation helpers
- `server/src/game/Deck.ts` - Deck creation and dealing
- `server/src/game/TurnValidator.ts` - Move validation
- `server/src/game/Scoring.ts` - Score calculation (Batak formula)
- `server/src/game/Player.ts` - Player state helper functions

### Socket Server
- `server/src/socket/SocketServer.ts` - All Socket.IO event handlers
  - `handleJoinQueue()` - Creates room, starts game
  - `handlePlayCard()` - Card playing with trick completion checks
  - `handleBidTrump()` - Bidding logic
  - `handleRequestNextRound()` - Multi-round next round handler
  - `handleBotTurns()` - Bot turn management
  - `handleBotBidding()` - Bot bidding management
  - `checkRoundComplete()` - Determines if round/game is complete
  - `broadcastGameState()` - State synchronization

### Bot AI
- `server/src/bots/BatakBot.ts` - Main bot class
- `server/src/bots/HandAnalyzer.ts` - Hand strength analysis
- `server/src/bots/strategies/` - Strategy implementations (Easy, Normal, Hard)

### Types
- `server/src/types/game.ts` - Suit, Rank, Card, Player, Bid, GameState enums, BidType, RoundRecord
- `server/src/types/socket.ts` - Socket event enums

### Client Components
- `client/src/components/GameRoom.tsx` - Main game UI, card display, bidding, round complete modal
- `client/src/components/TournamentResults.tsx` - Final results with round history
- `client/src/socket/SocketContext.tsx` - Socket connection management
- `client/src/solana/WalletContext.tsx` - Wallet connection (includes mock fallback)
- `client/src/types/game.ts` - Client-side type definitions

## Game Modes

The game supports two distinct Batak variants:

### Koz Maça (Trump Jack)
- Spades (♠) is ALWAYS trump - no trump selection
- Independent bidding - players bid only trick count (1-13)
- HIGHEST cumulative score wins after max rounds
- No early game end - play all rounds
- Same scoring formula as İhaleli Batak

### İhaleli Batak (Auction Batak)
- Players bid BOTH suit (as trump) AND trick count
- Two-step bidding: select suit, then bid amount
- Must bid higher than current highest for selected suit
- Lowest cumulative score wins (first to ≤1 wins early)
- More competitive/strategic than Koz Maça

## Known Issues & Solutions

### Issue: "13 trick bekleniyor ama 8 kart veriliyor"
**Solution:** Ensure `createDeck()` in `server/src/game/Card.ts` includes all 13 ranks (TWO through ACE), not just SEVEN through ACE.

### Issue: "Pass geçince sıra tekrar bana geliyor"
**Solution:** `passBid()` must record the pass in the bids array with `amount: 0`. The bidding completion check uses `bids.length >= 4` to determine if all players have had a turn.

### Issue: "Oyun bitmiyor, hala rakip bekleniyor yazıyor"
**Solution:**
1. After 13th trick, `completeTrick()` calls `completeRound()` which sets state to `SCORING`
2. Then `clearTrick()` is called after 3 second delay
3. Check `latestState.state === 'scoring'` to send `ROUND_COMPLETE` event
4. Ensure `getHighestBid()` filters out pass bids (`b.amount > 0`)

### Issue: "5 tur sonunda Game Over - Final scores being calculated... kalıyor"
**Solution:** The `completeRound()` method must check if max rounds reached and automatically call `completeGame()`:

```typescript
// Check if we've reached max rounds - end game with lowest score winner
if (this.room.currentRound >= this.room.totalRounds) {
  const lowestScorer = getLowestScorer(this.room.players);
  if (lowestScorer) {
    this.completeGame(lowestScorer.id);
    return;
  }
}
```

### Issue: "WebSocket error / Bağlanamıyor"
**Solution:** Check both server (port 3001) and client (port 5173+) are running. The client's `VITE_SERVER_URL` should be `ws://localhost:3001` or `http://localhost:3001`.

### Issue: "Yanlış kart atınca oyun kitlendi" (Game freezes on invalid card play)
**Solution:** When server rejects a card play (must follow suit violation), it emits `game_error` event. Client must:
1. Listen to `game_error` event in GameRoom.tsx
2. Clear `selectedCard` and `isPlayingCard` states
3. Show alert with error message

```typescript
const handleError = (error: any) => {
  setSelectedCard(null);
  setIsPlayingCard(false);
  alert(error?.message || 'Kart oynatılamadı. Lütfen yeniden dene.');
};
socket.on('game_error', handleError);
```

### Issue: "Aynı anda 2 kart atanabildi" (Double-click allows two cards)
**Solution:** Add double-click protection in `handleCardClick`:
1. Check `isPlayingCard` state before allowing card play
2. Set `isPlayingCard = true` when emitting play_card
3. Clear it on next game_state_update

```typescript
if (isPlayingCard || selectedCard !== null) {
  return; // Prevent double-click
}
setIsPlayingCard(true);
setSelectedCard(cardId);
socket.emit('play_card', { cardId });
```

### Issue: "Scoring shows 20 instead of 11" (Bid 1, took 2 tricks)
**Solution:** Bids are stored in `room.bids[]` array, not `player.bid`. When calculating scores:
1. Pass `this.room.bids` array to `calculateScores()`
2. Use `calculatePlayerScoreWithBid(player, playerBid, gameMode)` which takes bid as parameter
3. Formula: `10 × bid + (tricks_won - bid)` → `10 × 1 + (2 - 1) = 11`

## Environment Variables

**Server (.env):**
```bash
PORT=3001
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=[base58_encoded_key]
SOLANA_NETWORK=devnet
PROGRAM_ID=[program_id]
MERKLE_TREE=[merkle_tree_address]
DEFAULT_BOT_DIFFICULTY=normal
```

**Client (.env):**
```bash
VITE_SERVER_URL=ws://localhost:3001
VITE_SOLANA_NETWORK=devnet
VITE_PROGRAM_ID=[program_id]
VITE_DEFAULT_BOT_DIFFICULTY=normal
VITE_DEFAULT_BOT_COUNT=3
```

## Common Development Tasks

### Adding a New Bot Difficulty Level
1. Create new strategy file in `server/src/bots/strategies/`
2. Implement `BotStrategy` interface
3. Add to `BotManager.ts` difficulty mapping
4. Update `config.ts` default difficulty

### Modifying Bidding Rules
- `GameStateMachine.ts` - Bid validation, state transitions
- `SocketServer.ts` - Bidding completion logic
- `TurnValidator.ts` - Bid validation rules

### Modifying Scoring
- `Scoring.ts` - Score calculation logic (Batak formula)
- `GameStateMachine.ts` - `calculateScores()` call

### Debugging Game State Issues
1. Add console.log in `GameStateMachine.ts` methods
2. Check `broadcastGameState()` is called after state changes
3. Verify `getStateForClient()` returns correct format
4. Use browser DevTools Console to see client-side game state

### Testing Bot Behavior
- Set `botDifficulty` in Lobby or use `DEFAULT_BOT_DIFFICULTY` env var
- Set `botCount` (0-3) for number of bot opponents
- Bot at index 0 plays first after bidding winner
