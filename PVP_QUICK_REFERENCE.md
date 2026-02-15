# PvP Quick Reference Card

## 🎮 What Changed?

### ✅ Server
- **PvP timeout:** Now falls back to bots after 60s (was: never)
- **Mixed mode timeout:** 30s (unchanged)
- **Instant bot mode:** Immediate (unchanged)

### ✅ Client
- **Default mode:** PvP (0 bots) — was: Instant (3 bots)
- **Queue display:** Shows mode, player count, countdown timer
- **Mode indicator:** 🎮 PvP Modu / 🤖 Karisik Mod

---

## 🚀 Quick Test (2 Minutes)

### Easiest Test - 2 Players + Bot Fallback

1. **Open 2 browser windows:**
   ```
   Chrome regular:    http://localhost:5173
   Chrome incognito:  http://localhost:5173 (Cmd+Shift+N)
   ```

2. **In each window:**
   - Login with different email
   - Select "Koz Maca"
   - Keep "0 bots" (default)
   - Click "Oyun Bul"

3. **Watch for:**
   - ✅ "🎮 PvP Modu - Oyuncu Bekleniyor..."
   - ✅ "2/4 oyuncu"
   - ✅ "Botlar 60s sonra eklenecek" (countdown)
   - ✅ After 60s: Bots added, game starts

---

## 🔥 Full PvP Test (4 Players)

1. **Open 4 contexts:**
   - Chrome regular
   - Chrome incognito (Cmd+Shift+N)
   - Firefox regular
   - Firefox private (Cmd+Shift+P)

2. **All 4:** Same mode + 0 bots + "Oyun Bul" (quickly)

3. **Expected:** Instant match, no bots!

---

## 📱 Mobile Test

```bash
# Mobile .env already updated to ws://192.168.178.114:3001
cd mobile && npm start
# Press 'a' for Android

# Then on device: join queue with web players
```

---

## 🐛 Debugging

### Server Logs (Look For)
```
[Matchmaker] Player added to queue
[Matchmaker] Players for this game mode: count: 2
[Matchmaker] ✓ Creating 4-player PvP match  ← When 4 join
```

### Client Console (Look For)
```
Match found: {...}
Received game state update
```

### If Issues
1. Check server running: `lsof -i :3001`
2. Check client running: `lsof -i :5173`
3. Check `.env`: `grep BOT_COUNT client/.env`
4. Run: `./test-pvp.sh`

---

## 📋 Test Checklist

### Queue Behavior
- [ ] PvP mode shows "🎮 PvP Modu"
- [ ] Player count displays "X/4 oyuncu"
- [ ] Timer counts down from 60s
- [ ] After 60s, bots added automatically
- [ ] With 4 players, instant match (no wait)

### Gameplay (4 Real Players)
- [ ] All players see game start
- [ ] Bidding phase works
- [ ] Card playing works
- [ ] Scores display correctly
- [ ] No desync issues

### Cross-Platform
- [ ] Mobile + web can match
- [ ] Gameplay smooth on all platforms

---

## 🔄 Rollback (If Needed)

```bash
# Revert to instant bot mode
echo "VITE_DEFAULT_BOT_COUNT=3" >> client/.env

# Or edit manually:
# client/.env: VITE_DEFAULT_BOT_COUNT=3
# mobile/.env: EXPO_PUBLIC_DEFAULT_BOT_COUNT=3
```

---

## 📚 Full Documentation

- **Testing Guide:** `PVP_TESTING_GUIDE.md` (detailed)
- **Implementation:** `PVP_IMPLEMENTATION_SUMMARY.md` (technical)
- **This Card:** Quick reference

---

## 🎯 Success Criteria

### Phase 1 (Must Work)
- ✅ 2-player queue → bot fallback after 60s
- ✅ 4-player queue → instant PvP match
- ✅ Queue UI shows status clearly

### Phase 2 (Test Now)
- [ ] Full game with 4 real players
- [ ] No state desync
- [ ] Cross-platform matching

### Phase 3 (Future)
- [ ] Reconnection handling
- [ ] "Quick Play" vs "Ranked" modes
- [ ] Skill-based matchmaking

---

## ⚡ Commands

```bash
# Check status
./test-pvp.sh

# Start server
cd server && npm run dev

# Start client
cd client && npm run dev

# Start mobile
cd mobile && npm start

# Kill server
lsof -ti:3001 | xargs kill -9
```

---

## 🤔 FAQs

**Q: Why 60s for PvP?**
A: Balances waiting for real players vs. not making users wait forever.

**Q: Can I still play instant bot games?**
A: Yes! Change bot count to "3" before clicking "Oyun Bul".

**Q: What if I want longer/shorter wait?**
A: Edit `Matchmaker.ts` line 130, change `60000` to desired milliseconds.

**Q: Mobile not connecting?**
A: Check `.env` has your computer's IP: `ws://192.168.178.114:3001`

---

## 📞 Need Help?

1. Check server terminal for errors
2. Check browser DevTools console
3. Run `./test-pvp.sh` for diagnostics
4. Read `PVP_TESTING_GUIDE.md` for details

---

**Last Updated:** February 10, 2026
**Status:** ✅ Ready for Testing
**Files Changed:** 3 (Matchmaker.ts, 2x .env)
**New Files:** 3 (this + guide + summary)
