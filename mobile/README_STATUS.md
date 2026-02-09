# Batak Mobile App - BROKEN STATUS

## Current Status: NON-FUNCTIONAL

**Created:** Feb 2025
**Last Tested:** Feb 9, 2025
**Status:** DO NOT USE - Navigation, buttons, and authentication broken

## What Works

- ✅ App builds and installs on Android
- ✅ App launches and shows LoginScreen
- ✅ Socket connects to server (after hardcoded IP fix)
- ✅ Bottom tab navigation renders
- ✅ Server logs show game creation

## What Doesn't Work

### Critical Issues

1. **Authentication Broken**
   - Email login button shows but form never appears
   - Wallet login untested
   - User cannot progress past login

2. **Navigation Architecture Broken**
   ```
   RootNavigator (Stack)
   ├── AuthNavigator
   └── MainNavigator (Tabs) ← LobbyScreen is here
       └── Can ONLY navigate to other tabs
       ❌ CANNOT navigate to GameNavigator (sibling)
   ```

3. **Game Flow Broken**
   - Find Match → creates game on server
   - But navigation to GameRoom FAILS
   - User stuck on Lobby with "Cancel Search"

4. **TouchableOpacity Not Responding**
   - Game mode buttons don't respond
   - Bot difficulty buttons don't respond
   - Settings menu items don't respond
   - Likely z-index or hitbox issues

## Root Causes

### 1. Navigation Structure
LobbyScreen navigation prop only has access to MainNavigator tabs:
```typescript
// In LobbyScreen.tsx - DOESN'T WORK
navigation.navigate('Game', {  // 'Game' doesn't exist in MainNavigator
  screen: 'GameRoom',
  params: { roomId: data.roomId }
});
```

### 2. Missing navigation.getParent()
To navigate to sibling navigator, need:
```typescript
navigation.getParent()?.navigate('GameRoom', { roomId: data.roomId });
```

### 3. TouchableOpacity Issues
Buttons may be behind other views or missing hitSlop

## Files Involved

- `/mobile/src/navigation/RootNavigator.tsx` - Navigator structure
- `/mobile/src/navigation/MainNavigator.tsx` - Tab navigator (contains Lobby)
- `/mobile/src/navigation/GameNavigator.tsx` - Game screens (sibling of Main)
- `/mobile/src/screens/lobby/LobbyScreen.tsx` - Broken navigation
- `/mobile/src/screens/auth/LoginScreen.tsx` - Broken email form

## Required Fixes

### Priority 1: Navigation (BLOCKING)
Option A: Move GameNavigator screens to RootNavigator
Option B: Use navigation.getParent() in LobbyScreen
Option C: Restructure as single navigator with conditional screens

### Priority 2: TouchableOpacity
- Add hitSlop to all buttons
- Check View z-index layering
- Add activeOpacity for feedback
- Test on physical device

### Priority 3: Authentication
- Fix email login form state
- Add proper show/hide logic
- Test both login paths

### Priority 4: Testing
Full end-to-end test required:
1. Login → Lobby → Select Mode → Find Match → GameRoom → Play

## Commit History

- `41cba38` - Initial mobile app commit (broken)
- `d9f61fa` - Fixed TypeScript errors
- No functional commits yet

## Recommendation

**ABANDON this mobile app approach:**
1. Web client already works perfectly
2. Add Solana Seeker wallet to web client (1 day)
3. Wrap as PWA for mobile install (1 day)
4. One working platform > two broken platforms

**OR invest 2-3 days to properly fix:**
- Complete navigation restructure
- Fix all TouchableOpacity issues
- Complete authentication
- Full E2E testing

## Notes

- Socket URL hardcoded to `192.168.178.114:3001` (not production-ready)
- Many UI components are placeholder only
- No actual card images (using emoji/text)
- No landscape orientation support
- No proper error handling

---

**DO NOT deploy this mobile app in current state**
**DO NOT promise mobile app functionality**
**USE web client for all testing and development**
