# Phase 1: Quick Start Guide
**Goal:** Fix mobile connection and verify all features work

## 🚀 One-Command Setup

```bash
cd /Users/mesahin/batak
./mobile/VERIFY_CONNECTION.sh
```

This handles everything automatically:
- ✅ Verifies .env configuration
- ✅ Restarts Metro bundler
- ✅ Sets up port forwarding
- ✅ Restarts the app
- ✅ Shows connection logs

## 📱 What to Test After Connection

### Quick Smoke Test (5 minutes)
1. **Connection:** App shows lobby (not black screen)
2. **Navigation:** Login → Join Game → Queue → GameRoom
3. **Gameplay:** Play one trick, verify card tap works
4. **Haptic:** Feel vibration when playing card
5. **Particles:** See gold burst when winning trick

### Full Feature Test (15 minutes)
See `mobile/PHASE1_TESTING_CHECKLIST.md` for detailed checklist.

## 🔧 Common Fixes

**Black screen?**
```bash
lsof -ti:8081 | xargs kill -9
cd mobile && npm start
```

**Can't connect?**
```bash
# Check server running
lsof -ti:3001
# If empty, start server:
cd server && npm run dev

# Re-setup port forwarding
adb reverse tcp:3001 tcp:3001
adb reverse tcp:8081 tcp:8081
```

**App won't start?**
```bash
adb shell am force-stop com.bataktournament.mobile
adb shell am start -n com.bataktournament.mobile/.MainActivity
```

## ✅ Success Criteria

Phase 1 complete when:
- [x] App connects to server (see "Socket connected" in logs)
- [x] All 6 haptic effects work (card-play, trick-win, etc.)
- [x] Particle burst visible on trick collection
- [x] No crashes or errors

## ➡️ Next Phase

After Phase 1 passes, proceed to **Phase 2: Hackathon Prep**
- Release APK signing
- Marketing assets
- dApp Store submission
- Hackathon registration

---

**Quick Start:** `./mobile/VERIFY_CONNECTION.sh`
**Full Checklist:** `mobile/PHASE1_TESTING_CHECKLIST.md`
**Next Steps:** See main plan document
