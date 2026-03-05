# Phase 1.1 Testing Checklist
**Date:** February 15, 2026
**Goal:** Verify mobile app connection and all recent features (sound + particles)

## Prerequisites

Before running tests, ensure:
- ✅ Android device connected via USB with USB debugging enabled
- ✅ Server running on `localhost:3001` (run `cd server && npm run dev`)
- ✅ Metro bundler will be restarted by script

## Quick Start

```bash
cd /Users/mesahin/batak
./mobile/VERIFY_CONNECTION.sh
```

This script will:
1. Verify `.env` configuration (ws://localhost:3001)
2. Kill and restart Metro bundler
3. Setup adb port forwarding (8081, 3001)
4. Force-stop and restart the app
5. Monitor connection logs

**Expected output:**
```
Connecting to socket server: ws://localhost:3001
Socket connected: <socketId>
```

## Manual Testing Steps

If the script works, proceed with these manual tests:

### 1. Connection Verification (Critical)
- [ ] App shows lobby screen (not black screen)
- [ ] No errors in logcat about "Unable to connect"
- [ ] Socket status shows connected

**How to check:**
```bash
adb logcat | grep "Socket"
# Should see: "Socket connected: <socketId>"
```

### 2. Navigation Flow
- [ ] Login with email or wallet
- [ ] Select bot difficulty (Easy/Normal/Hard)
- [ ] Keep bot count at 0 (PvP mode)
- [ ] Click "Join Game" button
- [ ] Queue screen appears with countdown
- [ ] After 60s, game starts with 3 bots (PvP fallback)
- [ ] GameRoom screen loads successfully

### 3. Haptic Feedback (6 Effects)

Test each haptic vibration:

- [ ] **card-shuffle** — New round starts
  - **Trigger:** Wait for new round to begin
  - **Expected:** Medium vibration (0.4s)

- [ ] **card-play** — Play a card
  - **Trigger:** Tap any valid card in your hand
  - **Expected:** Light vibration (0.15s)

- [ ] **trick-win** — Trick collected
  - **Trigger:** Win a trick
  - **Expected:** Medium vibration (0.4s)

- [ ] **bid-placed** — Submit bid
  - **Trigger:** During bidding phase, select suit + number, click "Bid"
  - **Expected:** Light vibration (0.2s)

- [ ] **round-complete** — Round ends
  - **Trigger:** Complete all 13 tricks
  - **Expected:** Medium vibration (0.6s)

- [ ] **game-complete** — Game ends
  - **Trigger:** Complete all rounds (5/7/9/11 depending on mode)
  - **Expected:** Heavy vibration (1.0s)

**Note:** If vibrations don't work:
- Check device settings: Sound & Vibration → Touch Vibration (must be ON)
- Some devices have weak vibration motors

### 4. Particle Effects

- [ ] **Particle burst on trick collection:**
  - **Trigger:** Win a trick
  - **Expected:** 12 gold circular particles burst from center
  - **Duration:** ~1.5 seconds
  - **Visual:** Particles fly outward, rotate, and fade

**Debug:** If particles don't appear:
- Check console for "Trick collected for player" message
- Verify `showParticles` state is true (add console.log if needed)

### 5. UI Responsiveness

- [ ] All buttons respond to touch (30+ buttons have activeOpacity + hitSlop)
- [ ] Card tap registers immediately
- [ ] Bidding overlay appears correctly (z-index layering)
- [ ] Cards visible during bidding phase (not hidden by overlay)
- [ ] Scoreboard accessible via hamburger menu

### 6. İhaleli Batak Bidding

- [ ] Suit selection screen appears (♠ ♥ ♦ ♣)
- [ ] Selected suit highlights in gold
- [ ] Bid number grid appears (1-13)
- [ ] Pass button (0) works correctly
- [ ] Trump suit displays correctly after bidding

### 7. Fullscreen Mode

- [ ] Status bar hidden during gameplay (time, battery, network icons not visible)
- [ ] Game UI uses full screen height
- [ ] No black bars at top/bottom

**If status bar still visible:**
```bash
# Check app.json configuration
cat mobile/app.json | grep -A 5 "androidStatusBar"
# Should see: "hidden": true
```

### 8. Performance & Stability

- [ ] App doesn't crash during gameplay
- [ ] No memory leaks (play 2-3 games in a row)
- [ ] Smooth animations (60 FPS)
- [ ] Server doesn't crash when player disconnects mid-game

## Common Issues & Solutions

### Issue: App shows black screen
**Solution:**
```bash
# Restart Metro bundler
lsof -ti:8081 | xargs kill -9
cd mobile && npm start
```

### Issue: "Unable to connect to server"
**Solution:**
```bash
# Verify server is running
lsof -ti:3001
# If no output, start server:
cd server && npm run dev

# Verify port forwarding
adb reverse --list
# Should show: tcp:3001 -> tcp:3001
```

### Issue: "Metro bundler not found"
**Solution:**
```bash
# Ensure adb reverse for Metro
adb reverse tcp:8081 tcp:8081
# Reload app: shake device → Developer Menu → Reload
```

### Issue: Haptic doesn't work
**Solution:**
- Check device settings: Sound & Vibration → Touch Vibration → ON
- Some devices (emulators) don't support haptic feedback

### Issue: Particles don't appear
**Solution:**
```bash
# Check console logs
adb logcat | grep "Trick collected"
# Should see: "Trick collected for player: <playerId>"

# If missing, check GameRoomScreen.tsx line ~350 for:
if (gameState.lastTrickWinner === myPlayerId) {
  setShowParticles(true);
}
```

## Success Criteria

All items must pass:
- ✅ App connects to server successfully (no errors)
- ✅ All 6 haptic effects trigger correctly
- ✅ Particle burst visible on trick collection
- ✅ No console errors or crashes
- ✅ Navigation works smoothly (Lobby → GameRoom)
- ✅ Bidding UI fully visible with cards showing
- ✅ Fullscreen mode active (status bar hidden)

## Debugging Commands

```bash
# View all logs
adb logcat

# Filter for app-specific logs
adb logcat | grep "ReactNativeJS"

# Filter for socket logs
adb logcat | grep "Socket"

# Check running processes
adb shell ps | grep batak

# Force-stop app
adb shell am force-stop com.bataktournament.mobile

# Clear app data (reset)
adb shell pm clear com.bataktournament.mobile

# Uninstall and reinstall
adb uninstall com.bataktournament.mobile
adb install -r mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

## Next Steps After Phase 1

Once all checks pass, proceed to:
- **Phase 2.1:** Release build & signing (30 min)
- **Phase 2.2:** Marketing assets (2-3 hours)
- **Phase 2.3:** dApp Store submission (1 hour)
- **Phase 2.4:** Hackathon registration (3-4 hours)

See `NEXT_STEPS_PLAN.md` for full roadmap.

---

**Checklist Created:** February 15, 2026
**Last Updated:** February 15, 2026
**Status:** Ready for testing
