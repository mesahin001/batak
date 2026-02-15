# Phase 1: Visual Foundation - Testing Checklist

**Status:** ✅ Complete - Ready for Testing
**Commit:** `61a30f0`
**Tag:** `phase1-complete`
**Date:** February 15, 2026

## What Changed

Phase 1 introduced **CSS-only visual enhancements** without changing any layout positions or game logic:

### Design Tokens Created
- **Web:** `/client/src/styles/tokens.css` (imported in `index.css`)
- **Mobile:** `/mobile/src/styles/tokens.ts` (imported in `GameRoomScreen.tsx`)

### Visual Changes Applied

#### 1. Color Palette - Rich Green Felt Theme
- **Background:** Radial gradient felt texture (#0d2818 → #1a472a → #2d5a3d)
- **Gold Accents:** #d4af37 (primary), #f4e5c3 (light), #b8941e (dark)
- **Cards:** White gradient with subtle shadow
- **Borders:** Gold borders on active elements

#### 2. Card Enhancements
- **Shadows:** Medium depth (0 4px 6px rgba(0,0,0,0.4))
- **Borders:** 1.5-2px with #e5e7eb color
- **Gradients:** Linear gradient (white → #f8f9fa)
- **Typography:** Serif font (Georgia) for card ranks with text shadow
- **Hover/Selected:** Gold glow shadow effect

#### 3. UI Element Updates
- **Bidding Overlay:** Dark gradient + gold top border + shadow
- **Trick Area:** Radial gold highlight (8% opacity)
- **Buttons:** Gold theme with scale transforms on active
- **Header:** Gold border bottom (was pink/red)

#### 4. Mobile-Specific Updates
- **Opponent Slots:** Felt-themed backgrounds with gold active borders
- **Info Bar:** Gold border + shadow
- **Hand Container:** Felt background with shadow
- **Modals:** Gold borders + shadow elevation

---

## Testing Protocol

### Automated Tests

```bash
# Type-check (should pass with no errors)
cd client && npx tsc --noEmit
cd mobile && npx tsc --noEmit  # If available

# Run existing test suite (expect 86 pass / 8 fail - same as before)
cd server && npm test
```

### Manual Testing Checklist

#### Web Client (Port 5173)

```bash
cd client && npm run dev
```

**Visual Inspection:**
- [ ] Background shows rich green felt gradient (no tiling artifacts)
- [ ] Background has subtle noise texture overlay
- [ ] Cards have white gradient background (not flat white)
- [ ] Card ranks use serif font (Georgia)
- [ ] Card ranks have subtle text shadow
- [ ] Card borders are light gray (#e5e7eb)
- [ ] Cards have visible shadow depth

**Interaction:**
- [ ] Hover over card → gold glow shadow appears
- [ ] Click/select card → gold border + glow
- [ ] Bidding buttons use gold theme (not red/pink)
- [ ] Active bid button scales up (1.05) and glows
- [ ] Bidding overlay has dark gradient + gold top border
- [ ] Header border is gold (not pink)

**Cross-Browser:**
- [ ] Chrome/Edge (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)

#### Mobile App (Expo)

```bash
cd mobile && npm start
# Then press 'a' for Android or 'i' for iOS
```

**Visual Inspection:**
- [ ] Background is dark felt green (#0d2818)
- [ ] Cards have white background with shadow
- [ ] Opponent slots have felt-themed background
- [ ] Active opponent has gold border + glow
- [ ] Info bar has gold border
- [ ] Hand container has dark felt background

**Interaction:**
- [ ] Tap card → gold border appears
- [ ] Bidding overlay has gold top border
- [ ] Bid number buttons are gold (not blue)
- [ ] Tap bid button → visual feedback
- [ ] Modals have gold borders

**Devices:**
- [ ] iPhone 12+ (iOS 17)
- [ ] Pixel 5+ (Android 13)
- [ ] Low-end device: iPhone 8 / Pixel 3 (performance check)

---

## Performance Metrics

### Expected Results
- **Frame Rate:** ≥55fps during gameplay (same as baseline)
- **Bundle Size:** +5-10% (acceptable for CSS-only changes)
- **Lighthouse Performance:** ≥90 (same as baseline)
- **No layout shift:** CLS score unchanged

### How to Test Performance

```bash
# Web - Chrome DevTools
1. Open DevTools → Performance tab
2. Start recording
3. Play 1 full round (13 tricks)
4. Stop recording
5. Check FPS graph → should stay green (≥55fps)

# Mobile - React DevTools
1. Enable "Show Perf Monitor" in React DevTools
2. Play 1 full round
3. Monitor FPS → should stay ≥55fps
```

---

## Accessibility Check

### WCAG AA Contrast Requirements
- **Card Rank (black on white):** 21:1 ✅ (exceeds 4.5:1)
- **Gold on dark felt:** ~8:1 ✅ (exceeds 4.5:1)
- **White text on felt:** ~12:1 ✅ (exceeds 4.5:1)

### Manual Check
```bash
# Use axe DevTools extension in Chrome
1. Install axe DevTools
2. Run scan on GameRoom page
3. Verify no new violations introduced
```

---

## Known Issues (Expected)

These issues exist **before** Phase 1 and are **not** introduced by this phase:

1. **Server Tests:** 8 ihaleli_batak scoring tests fail (known issue)
2. **TypeScript Warnings:** Unused imports in bot/Solana files (pre-existing)
3. **better-sqlite3:** Not found by tsc (works at runtime)
4. **Phaser files:** Compilation errors (legacy, unused)

---

## Rollback Instructions

If Phase 1 causes any issues:

```bash
# Option 1: Reset to tag
git reset --hard phase1-pre-visual  # If tag exists
git clean -fd

# Option 2: Revert commit
git revert 61a30f0

# Option 3: Manual rollback
git restore client/src/styles/tokens.css
git restore client/src/index.css
git restore client/src/components/GameRoom.css
git restore mobile/src/styles/tokens.ts
git restore mobile/src/screens/game/GameRoomScreen.tsx
```

All changes are CSS-only → instant rollback, no data loss.

---

## Success Criteria

Phase 1 is **successful** if:

✅ All cards render with new shadows/borders
✅ Background gradient visible (no texture tiling)
✅ Text contrast ≥4.5:1 (WCAG AA)
✅ Performance: 60fps maintained
✅ Works on Chrome, Safari, Firefox
✅ Works on iPhone 12, Pixel 5
✅ Zero new console errors
✅ Zero layout shifts

---

## Next Steps

After Phase 1 passes **2-3 test cycles**:

1. ✅ Visual appeal approved (user feedback)
2. ✅ Performance verified (60fps maintained)
3. ✅ Accessibility checks passed
4. ✅ Cross-browser/device testing complete

**Then proceed to Phase 2: Enhanced Animations**
- Framer Motion / React Native Reanimated
- Spring physics for card dealing
- Particle effects on trick collection
- Score popup animations

---

## Testing Notes

**First Test Cycle:**
- Date: ___________
- Tester: ___________
- Result: ⬜ Pass / ⬜ Fail
- Issues: ___________

**Second Test Cycle:**
- Date: ___________
- Tester: ___________
- Result: ⬜ Pass / ⬜ Fail
- Issues: ___________

**Third Test Cycle (if needed):**
- Date: ___________
- Tester: ___________
- Result: ⬜ Pass / ⬜ Fail
- Issues: ___________

---

**Phase 1 Sign-off:**
- [ ] All manual tests passed
- [ ] Performance acceptable
- [ ] No blocking issues
- [ ] Ready for Phase 2

**Signed:** ___________ **Date:** ___________
