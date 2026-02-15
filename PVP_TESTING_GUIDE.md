# PvP Testing Guide - Batak Tournament

## Overview

This guide provides step-by-step instructions for testing real multiplayer (PvP) functionality where actual players (not bots) can play together over the network.

## Changes Made

### 1. Server: PvP Timeout Fallback (✅ Fixed)
**File:** `server/src/matchmaker/Matchmaker.ts`
**Change:** Added 60-second timeout for PvP mode (botCount=0) before falling back to bots
- PvP mode (0 bots): 60 seconds wait
- Mixed mode (1-2 bots): 30 seconds wait (existing)
- Instant bot (3 bots): Immediate start (existing)

### 2. Client: Default to PvP Mode (✅ Fixed)
**Files:** `client/.env`, `mobile/.env`
**Change:** Changed `VITE_DEFAULT_BOT_COUNT` from 3 to 0
- Old behavior: Instant bot games (no waiting)
- New behavior: Wait 60s for real players, then add bots

### 3. Client: Enhanced Queue Status (✅ Fixed)
**File:** `client/src/components/Lobby.tsx`
**Changes:**
- Show PvP mode indicator (🎮 PvP Modu)
- Display player count (e.g., "2/4 oyuncu")
- Show countdown timer for bot fallback
- Different messages for PvP vs mixed modes

## Testing Strategy

### Phase 1: Multi-Client Setup

#### Option A: Multiple Browser Tabs
1. Start server: `cd server && npm run dev`
2. Start client: `cd client && npm run dev`
3. Open 4 browser contexts:
   - Chrome regular window
   - Chrome incognito window
   - Firefox regular window
   - Firefox private window
   - OR use different Chrome profiles (chrome://settings/people)

#### Option B: Mobile + Web
1. Start server and client as above
2. Open web client in 2-3 browser tabs
3. Open mobile app on physical device
4. Ensure mobile device connected to same network

#### Option C: Network Testing (Recommended for Real PvP)
1. Start server on your computer
2. Find your local IP: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)
3. Update `.env` files to use your IP instead of localhost
4. Open clients on different devices on same network

### Phase 2: Test Cases

#### Test 1: Perfect PvP Match (4 Players, Same Mode)

**Setup:**
- Client 1-4: All select "Koz Maca"
- Client 1-4: All select "PvP (0 bots)"
- Click "Oyun Bul" on all 4 within a few seconds

**Expected Result:**
- ✅ All 4 get matched immediately
- ✅ `MATCH_FOUND` event received by all
- ✅ Room created with 4 real players
- ✅ Game starts, all players see game board

**Watch for:**
- ❌ Any player stuck in queue
- ❌ Players matched to different rooms
- ❌ Game not starting

#### Test 2: Partial Queue (2-3 Players)

**Setup:**
- Client 1-2: Select "Koz Maca" + "PvP (0 bots)"
- Click "Oyun Bul"
- Wait and observe

**Expected Result:**
- ✅ Queue status shows "2/4 oyuncu"
- ✅ Timer counts down from 60 seconds
- ✅ After 60s, bots are added automatically
- ✅ Game starts with 2 humans + 2 bots

**Watch for:**
- ❌ Queue waiting forever (should add bots after 60s)
- ❌ Wrong player count displayed
- ❌ Timer not counting down

#### Test 3: Mode Mismatch (Different Game Modes)

**Setup:**
- Client 1: Select "Koz Maca" + PvP
- Client 2: Select "İhaleli Batak" + PvP
- Click "Oyun Bul" on both

**Expected Result:**
- ✅ Both wait in separate queues
- ✅ No match created between them
- ✅ After 60s, each gets bots for their mode

#### Test 4: Bot Count Mismatch

**Setup:**
- Client 1: Select "Koz Maca" + "0 bots"
- Client 2: Select "Koz Maca" + "1 bot"
- Click "Oyun Bul"

**Expected Result:**
- ✅ Both wait in separate queues (different botCount)
- ✅ Client 1: PvP mode (60s wait)
- ✅ Client 2: Mixed mode (30s wait)

#### Test 5: Late Joiner (Testing Race Conditions)

**Setup:**
- Client 1-3: Join queue immediately
- Wait 10 seconds
- Client 4: Join queue

**Expected Result:**
- ✅ All 4 get matched as soon as Client 4 joins
- ✅ No bot fallback triggered

### Phase 3: Gameplay Testing

Once 4 real players are matched, test the full game flow:

#### 3.1 Game Start
- ✅ All 4 players see game room
- ✅ Cards dealt (13 cards per player)
- ✅ Player names/identifiers visible
- ✅ Turn order established

#### 3.2 Bidding Phase
- ✅ Each player can bid in turn
- ✅ Other players see bids appear in real-time
- ✅ Pass button works
- ✅ Bidding ends correctly (4 bids or all pass)

#### 3.3 Card Playing
- ✅ Correct player prompted to play
- ✅ Card plays show up for all players
- ✅ Trick collection works correctly
- ✅ Turn order advances properly

#### 3.4 Round Completion
- ✅ All players see round scores
- ✅ Scores calculated correctly
- ✅ "Next Round" button appears
- ✅ All players must click before next round starts

#### 3.5 Game Completion
- ✅ Final scores shown to all
- ✅ Winner announced correctly
- ✅ NFT reward minted (if applicable)
- ✅ Players can return to lobby

### Phase 4: Stress Testing

#### 4.1 Network Disconnection
**Test:**
1. Start 4-player PvP game
2. Mid-game, disconnect one player (close browser/turn off WiFi)
3. Observe behavior

**Expected:**
- ✅ Other players notified of disconnect
- ✅ Game continues with bot replacing disconnected player
- OR
- ✅ Game pauses, waiting for reconnect (30s grace period)

#### 4.2 Simultaneous Card Play
**Test:**
1. During gameplay, have multiple players try to play cards simultaneously
2. Observe turn validation

**Expected:**
- ✅ Only current player's card accepted
- ✅ Other players get error message
- ✅ No duplicate cards played

#### 4.3 State Synchronization
**Test:**
1. Play through entire 5-round game
2. Compare game state across all 4 clients at various points

**Expected:**
- ✅ All players see identical trick count
- ✅ All players see identical scores
- ✅ All players see correct trump suit
- ✅ No desync issues

### Phase 5: Mobile + Web Cross-Platform

#### Test Setup:
1. 2 players on web browser
2. 2 players on mobile app
3. All join same queue (same game mode, same bot count)

**Expected:**
- ✅ Mobile and web players match together
- ✅ Gameplay smooth on all platforms
- ✅ Touch controls work on mobile
- ✅ Card visibility correct on mobile

## Known Issues to Watch For

### Critical Issues (Must Fix)
- ❌ Players stuck in queue forever
- ❌ State desync (different players see different game states)
- ❌ Turn order broken (wrong player prompted)
- ❌ Cards disappearing or duplicating
- ❌ Game freezing/hanging
- ❌ Server crashes on disconnect

### Minor Issues (Nice to Fix)
- ⚠️ Queue status not updating in real-time
- ⚠️ No notification sound when match found
- ⚠️ Slow card animations causing delays
- ⚠️ Network latency causing perceived lag

## Debugging Tips

### Server Logs
Watch server console for:
```
[Matchmaker] Player added to queue: {...}
[Matchmaker] Players for this game mode: {...}
[Matchmaker] ✓ Creating 4-player PvP match
[Matchmaker] Created REAL MP room: room_real_...
```

### Client Logs
Open browser DevTools console for:
```
Match found: {...}
Socket connected: {...}
Received game state update
```

### Network Tab
Monitor WebSocket connection:
- Check for disconnections
- Watch message sizes
- Verify event emissions

## Success Criteria

✅ **Must Have:**
- 4 players can successfully match into PvP game
- All 4 players see synchronized game state
- Bidding, card playing, and scoring work correctly
- Queue status shows clear PvP wait information
- Bot fallback works after 60 seconds
- Mobile and web players can match together

✅ **Nice to Have:**
- Cancel queue button functional
- Real-time player count updates
- Match found notification
- Smooth animations without lag

## Rollback Plan

If PvP testing reveals critical issues:

1. **Revert default bot count:**
   ```bash
   # client/.env
   VITE_DEFAULT_BOT_COUNT=3  # Back to instant bots
   ```

2. **Disable PvP timeout:**
   ```typescript
   // server/src/matchmaker/Matchmaker.ts
   // Comment out PvP timeout logic, keep only mixed mode timeout
   ```

3. **Restart server and client:**
   ```bash
   cd server && npm run dev
   cd client && npm run dev
   ```

## Next Steps After Testing

Based on test results:

### If PvP Works Perfectly:
1. ✅ Update documentation
2. ✅ Add PvP mode selection in UI ("Quick Play" vs "Ranked PvP")
3. ✅ Consider removing bot count slider for clarity
4. ✅ Add matchmaking analytics/logging

### If PvP Has Issues:
1. 🔧 Fix identified bugs
2. 🔧 Add more comprehensive logging
3. 🔧 Implement reconnection logic
4. 🔧 Test again with fixes applied

### Future Enhancements:
- Add "Quick Play" (instant bots) vs "Ranked PvP" (wait for humans) modes
- Show estimated wait time based on queue history
- Add player profiles/avatars in queue
- Implement skill-based matchmaking (ELO)
- Add spectator mode for ongoing PvP games

## Contact & Support

If you encounter issues during testing:
1. Check server logs for errors
2. Check browser console for client errors
3. Document exact steps to reproduce
4. Note which test case failed
5. Record any error messages

Good luck testing! 🎮
