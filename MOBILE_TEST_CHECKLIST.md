# Mobile App Test Checklist - Feb 9, 2025

## Setup ✅
- [x] Server running on port 3001 (healthy)
- [x] Expo dev server running on port 8081
- [x] All code changes applied successfully

## How to Test

### 1. Connect to the App
- Open Expo Go app on your phone
- Scan QR code shown in terminal (or check http://localhost:8081)
- OR use Android emulator: `npx expo run:android`
- OR use iOS simulator: `npx expo run:ios`

### 2. Phase 1 Test: Navigation (CRITICAL)

**Test Case: Lobby → GameRoom Navigation**
- [ ] Open app → LoginScreen appears
- [ ] Toggle between Email/Wallet tabs (should switch cleanly)
- [ ] Login with email (test@example.com / password123)
- [ ] Navigate to Lobby tab
- [ ] Select game mode (Koz Maça or İhaleli Batak)
- [ ] Select bot difficulty (Easy/Normal/Hard)
- [ ] Click "Find Match" button
- [ ] **EXPECTED:** Navigate to GameRoom successfully
- [ ] **PREVIOUS BEHAVIOR:** Stuck on Lobby with "Cancel Search"

**Success Criteria:**
- ✅ Navigation from Lobby → GameRoom works
- ✅ No errors in console
- ✅ GameRoom renders in landscape mode

### 3. Phase 2 Test: Button Responsiveness

**Test Case: All Buttons Show Visual Feedback**

**LoginScreen:**
- [ ] Toggle Email/Wallet tabs → opacity changes on press
- [ ] Click show/hide password eye icon → easy to tap, shows feedback
- [ ] Click Sign In button → opacity changes
- [ ] Click Connect Wallet button → opacity changes
- [ ] Click Sign Up link → opacity changes

**LobbyScreen:**
- [ ] Click Koz Maça mode card → opacity changes, easy to tap
- [ ] Click İhaleli Batak mode card → opacity changes
- [ ] Click Easy/Normal/Hard buttons → opacity changes
- [ ] Click bot count buttons (1/2/3) → opacity changes
- [ ] Click Find Match button → opacity changes
- [ ] Click Cancel Search button → opacity changes (red button)

**GameRoomScreen:**
- [ ] Click hamburger menu (☰) → opens scoreboard
- [ ] Click suit selection buttons (♠ ♥ ♦ ♣) → easy to tap, 50x50px
- [ ] Click bid number buttons (1-13) → easy to tap, 36x36px
- [ ] Click Pass button → opacity changes (critical red)
- [ ] Click Change Suit button → opacity changes
- [ ] Click Leave Game button → opacity changes (critical red)
- [ ] Click Next Round button → opacity changes
- [ ] Click hand cards → easy to tap, shows selection

**SettingsScreen:**
- [ ] Click Language setting → shows feedback (disabled)
- [ ] Click Notifications setting → shows feedback (disabled)
- [ ] Click Sound setting → shows feedback (disabled)
- [ ] Click Sign Out button → opacity changes (critical red)

**Success Criteria:**
- ✅ ALL buttons show opacity change when pressed
- ✅ Small buttons (36-50px) are easy to tap
- ✅ No complaints about "button not working"
- ✅ Visual feedback is immediate and clear

### 4. Phase 3 Test: Auth UX

**Test Case: Mode Toggle (Email/Wallet)**
- [ ] Open LoginScreen
- [ ] **EXPECTED:** See mode toggle at top (📧 Email / 👛 Wallet)
- [ ] **PREVIOUS BEHAVIOR:** Both forms visible simultaneously
- [ ] Click Email tab → email form appears, wallet hidden
- [ ] Click Wallet tab → wallet info appears, email form hidden
- [ ] Toggle back and forth → smooth transitions
- [ ] Active tab shows purple background (#6C63FF)
- [ ] Inactive tab shows gray text (#888)

**Success Criteria:**
- ✅ Only one auth method visible at a time
- ✅ Mode toggle is intuitive and responsive
- ✅ UI is clean and uncluttered
- ✅ Wallet info card shows when in wallet mode

### 5. End-to-End Test

**Test Case: Full Game Session**
- [ ] Login with email
- [ ] Navigate to Lobby
- [ ] Select Koz Maça mode
- [ ] Select Normal difficulty
- [ ] Select 3 bots
- [ ] Click Find Match
- [ ] Wait for match (should be instant with bots)
- [ ] **Navigate to GameRoom** (CRITICAL FIX)
- [ ] Wait for bidding phase
- [ ] Submit a bid (click suit, click number)
- [ ] Wait for playing phase
- [ ] Play a card (click card from hand)
- [ ] Watch bot turns (2-3 second delays)
- [ ] Complete trick (cards collect after 4 plays)
- [ ] Continue playing until round ends
- [ ] See round complete modal
- [ ] Click Next Round
- [ ] Play another round
- [ ] Test hamburger menu → scoreboard
- [ ] Test Leave Game button

**Success Criteria:**
- ✅ Complete flow works without crashes
- ✅ Navigation is smooth
- ✅ All buttons are responsive
- ✅ Game logic functions correctly
- ✅ UI updates in real-time

### 6. Physical Device Test (Recommended)

**Important:** Test on actual device, not just simulator
- [ ] iPhone SE (375x667) - minimum screen size
- [ ] Standard Android phone
- [ ] Verify touch targets are comfortable
- [ ] Verify visual feedback is visible
- [ ] Test in different lighting conditions
- [ ] Test with sweaty fingers (realistic gameplay)

### 7. Edge Cases

- [ ] Rapid button tapping → no double-actions
- [ ] ScrollView doesn't interfere with buttons
- [ ] Disabled buttons don't respond
- [ ] Error states show properly
- [ ] Network disconnection handling
- [ ] Background/foreground transitions

## Known Issues (Pre-Existing, Not Blocking)

- TypeScript compilation errors (pre-existing, runtime works)
- Socket URL hardcoded to 192.168.178.114:3001 (development only)
- No proper error boundaries
- No haptic feedback
- Card graphics use emoji (no custom images)

## Success Summary

### Before Fix
- ❌ Navigation broken (couldn't get to GameRoom)
- ❌ Buttons felt unresponsive (no feedback)
- ❌ Auth UI cluttered (both methods visible)

### After Fix
- ✅ Navigation works (Lobby → GameRoom)
- ✅ All buttons show visual feedback
- ✅ Auth UI is clean with mode toggle

## Test Results

**Date:** ___________
**Tester:** ___________
**Device:** ___________

### Phase 1: Navigation
- [ ] PASS / [ ] FAIL
- Notes: _______________________________

### Phase 2: Button Responsiveness
- [ ] PASS / [ ] FAIL
- Notes: _______________________________

### Phase 3: Auth UX
- [ ] PASS / [ ] FAIL
- Notes: _______________________________

### End-to-End
- [ ] PASS / [ ] FAIL
- Notes: _______________________________

## Issues Found

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

## Conclusion

- [ ] Mobile app is FUNCTIONAL and ready for development
- [ ] Mobile app has issues, needs more fixes
- [ ] Mobile app is broken, revert changes

---

**Expected Outcome:** All tests PASS ✅
**Estimated Test Time:** 15-20 minutes
**Priority:** HIGH - Validates all critical fixes
