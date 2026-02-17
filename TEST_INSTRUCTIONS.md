# 2-Browser Tab PvP Test - Step by Step

## Your Test Instructions

### Step 1: Open 2 Browser Tabs
1. **Tab 1:** Open Chrome regular window → http://localhost:5173
2. **Tab 2:** Open Chrome incognito window (Cmd+Shift+N) → http://localhost:5173

### Step 2: Login with Different Accounts

**Tab 1:**
- Click "Email ile Giris" (Email login)
- Use: test1@test.com / password123 (or create new account)

**Tab 2:**
- Click "Email ile Giris"
- Use: test2@test.com / password123 (or create new account)

### Step 3: Configure Queue Settings

**BOTH tabs should have:**
- Game mode: "Koz Maca" (should be default)
- Bot count: 0 (should be default now - shows "PvP")
- Bot difficulty: Doesn't matter for PvP

### Step 4: Join Queue

**WITHIN A FEW SECONDS:**
- Tab 1: Click "Oyun Bul"
- Tab 2: Click "Oyun Bul"

### Step 5: Watch for Queue Status

**You should see on BOTH tabs:**
```
🎮 PvP Modu - Oyuncu Bekleniyor...
2/4 oyuncu • Botlar 60s sonra eklenecek
```

**The timer should count down from 60.**

### Step 6: Wait for Bot Fallback

**After ~60 seconds:**
- Timer reaches 0
- Status changes to "Botlarla eslesildi!"
- Both players redirected to game room
- Game starts with: 2 humans + 2 bots

---

## What to Check

### ✅ Expected Behavior:
- [ ] Both tabs show PvP mode indicator
- [ ] Player count shows "2/4 oyuncu"
- [ ] Timer counts down from 60 seconds
- [ ] After 60s, both get "Botlarla eslesildi!" message
- [ ] Game starts successfully
- [ ] Both players can see the game board
- [ ] Both players' names are visible
- [ ] Bidding phase works
- [ ] Can play cards in turns

### ❌ Issues to Report:
- [ ] Stuck in queue forever (no bot fallback)
- [ ] Timer not counting down
- [ ] Player count wrong
- [ ] Only one player enters game
- [ ] Game doesn't start
- [ ] Can't see other player
- [ ] Cards not working
- [ ] Any errors in browser console (F12)

---

## Browser Console Logs to Watch

**Open DevTools (F12) in both tabs and check Console tab:**

**Good messages:**
```
Socket connected
Match found: {...}
Received game state update
```

**Bad messages:**
```
Socket disconnected
Error: ...
Failed to join queue
```

---

## Server Logs to Watch

**In your server terminal, look for:**

**When joining queue:**
```
[Matchmaker] Player added to queue: { socketId: ..., publicKey: ..., gameMode: koz_maca }
[Matchmaker] Queue: { total: 2, gameMode: koz_maca }
```

**After 60 seconds:**
```
[Matchmaker] Bot fallback triggered for player: ...
[Matchmaker] Creating room with bots for player: ...
```

**When game starts:**
```
[SocketServer] Broadcasting game state to room: ...
```

---

## After Testing

Report back:
1. ✅ What worked
2. ❌ What didn't work
3. 📋 Any error messages
4. 🖼️ Screenshots if helpful

---

## If It Works - Next Test!

Try the **4-player test:**
1. Open 4 different browser contexts
2. All join queue within a few seconds
3. Should get **INSTANT match** (no 60s wait!)
4. Play a full game with 4 real players

