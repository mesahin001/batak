# Batak Tournament - Monolith Hackathon Submission Guide

This guide provides step-by-step instructions for submitting Batak Tournament to the Solana Mobile Monolith Hackathon and Solana dApp Store.

## Overview

**Hackathon:** The MONOLITH Solana Mobile Hackathon
**Timeline:** January 26 - March 9, 2026
**Category:** Gaming
**Prize Pool:** $125,000+ (ten $10,000 top prizes)

## Prerequisites

- [ ] macOS or Linux with Android development tools
- [ ] Java JDK 17 or higher
- [ ] Android SDK (via Android Studio)
- [ ] Physical Android device for testing (recommended: Solana Seeker)
- [ ] Production server URL (or use ngrok for testing)

## Phase 1: Generate Release Signing Key (30 minutes)

### Step 1.1: Create Signing Key

```bash
cd mobile/android/app

# Generate new keystore (NOT for Google Play - this is for Solana dApp Store only)
keytool -genkey -v -keystore batak-release.keystore \
  -alias batak-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# You will be prompted for:
# - Keystore password (save this securely!)
# - Key password (save this securely!)
# - Your name/organization details
```

**IMPORTANT:** Save your passwords securely! You'll need them for every release build.

### Step 1.2: Configure Gradle Properties

```bash
cd mobile/android

# Copy template
cp gradle.properties.example gradle.properties

# Edit gradle.properties and update:
# - BATAK_RELEASE_STORE_PASSWORD=<your keystore password>
# - BATAK_RELEASE_KEY_PASSWORD=<your key password>
```

### Step 1.3: Verify Keystore

```bash
# Check keystore details
keytool -list -v -keystore app/batak-release.keystore -alias batak-release
```

## Phase 2: Configure Production Environment (15 minutes)

### Step 2.1: Set Production Server URL

**Option A: Use Production Server**
```bash
cd mobile

# Edit .env.production
# Change EXPO_PUBLIC_SOCKET_URL to your production server
# Example: wss://batak-tournament.com
```

**Option B: Use ngrok for Testing**
```bash
# On your server machine
cd server
npm run dev

# In another terminal
ngrok http 3001

# Copy ngrok URL (e.g., https://abc123.ngrok.io)
# Update mobile/.env.production:
# EXPO_PUBLIC_SOCKET_URL=wss://abc123.ngrok.io
```

### Step 2.2: Update App Version

Edit `mobile/app.json`:
```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    }
  }
}
```

## Phase 3: Build Release APK (20 minutes)

### Step 3.1: Pre-build Expo

```bash
cd mobile

# Install dependencies
npm install

# Pre-build for Android (generates native code)
npx expo prebuild --platform android --clean
```

### Step 3.2: Build Release APK

```bash
cd mobile/android

# Build release APK
./gradlew assembleRelease

# Output location: android/app/build/outputs/apk/release/app-release.apk
```

### Step 3.3: Verify APK

```bash
# Check APK details
aapt dump badging app/build/outputs/apk/release/app-release.apk | grep package

# Expected output:
# package: name='com.bataktournament.mobile' versionCode='1' versionName='1.0.0'
```

## Phase 4: Test Release Build (30 minutes)

### Step 4.1: Install on Device

```bash
# Connect Android device via USB (enable USB debugging)
adb devices

# Install APK
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

### Step 4.2: Test Checklist

- [ ] App launches successfully
- [ ] Wallet connection works (Phantom/Seeker)
- [ ] Email login works
- [ ] Join queue and find match
- [ ] Play full game (all phases: bidding, playing, scoring)
- [ ] Bot AI responds correctly
- [ ] Cards display properly
- [ ] Navigation works (Lobby → GameRoom → Lobby)
- [ ] Leaderboard loads
- [ ] Profile displays stats
- [ ] No crashes or freezes

### Step 4.3: Performance Check

- [ ] App loads in <3 seconds
- [ ] Game responds to touches smoothly
- [ ] No lag during card animations
- [ ] Socket reconnects after backgrounding app

## Phase 5: Create Marketing Assets (2-3 hours)

### Required Assets

1. **App Icon (512x512 PNG)**
   - Current: `mobile/assets/icon.png` (need to verify size)
   - Theme: Batak cards, Turkish motifs
   - Export at 512x512px, transparent background optional

2. **Promotional Banner (1200x600 PNG)**
   - Create new file: `mobile/assets/banner-1200x600.png`
   - Include: Game logo, cards, "Earn Solana Rewards" tagline
   - Show multiplayer aspect

3. **Screenshots (4-5 images)**
   - Create: `mobile/assets/screenshots/`
   - Capture:
     - Lobby/matchmaking screen
     - Active gameplay (bidding phase)
     - Card play with trick area
     - Scoreboard after round
     - Leaderboard/profile

4. **App Description**

```
BATAK TOURNAMENT - Turkish Card Game on Solana

Play the authentic Turkish trick-taking card game with blockchain rewards!

🃏 TWO GAME MODES
- Koz Maça: Classic spades-trump mode
- İhaleli Batak: Advanced bidding with suit selection

🎮 FEATURES
- Real-time multiplayer (4 players)
- AI bots with 3 difficulty levels
- Tournament system with cNFT rewards
- Global leaderboards
- Solana wallet integration (Phantom, Seeker)

🏆 EARN REWARDS
Win tournaments and earn compressed NFTs on Solana blockchain. Prove your skills with on-chain achievements!

📱 MOBILE-FIRST DESIGN
Built specifically for Solana Mobile with native wallet adapter support. Optimized for touch controls and portrait/landscape play.

🌍 CULTURAL HERITAGE
First authentic Turkish Batak game on blockchain. Popular across 85M+ Turkish speakers worldwide.

Perfect for card game enthusiasts and crypto natives alike!
```

### Design Tools

- **Canva:** Easy templates for banner/icon
- **Figma:** Professional design tool
- **GIMP/Photoshop:** Advanced editing
- **Android Screenshot:** Use device screenshot + editing

## Phase 6: Submit to Solana dApp Store (1 hour)

### Step 6.1: Register Publisher Account

1. Go to [Solana dApp Store Publisher Portal](https://dapp-publishing.solanamobile.com/)
2. Sign in with Solana wallet
3. Complete publisher profile
4. Accept terms and conditions

### Step 6.2: Upload APK

```bash
# Install Solana dApp Store CLI (if available)
# Or use web portal upload

# Ensure compliance flag
# The APK must comply with Solana dApp Store policies:
# - No malware/spyware
# - No illegal content
# - Functional wallet adapter
# - Clear privacy policy
```

### Step 6.3: Complete Listing

**App Information:**
- Name: Batak Tournament
- Package: com.bataktournament.mobile
- Category: Games > Card
- Price: Free
- In-app purchases: None (currently)

**Description:** (Use text from Phase 5)

**Assets:**
- Icon: 512x512 PNG
- Banner: 1200x600 PNG
- Screenshots: 4-5 images

**Privacy Policy:**
- Create simple policy at `/mobile/PRIVACY_POLICY.md`
- Host on GitHub Pages or include in app

**Compliance:**
- [ ] Check "Complies with Solana dApp Store policies"
- [ ] Verify wallet adapter implementation
- [ ] Confirm no malicious code

### Step 6.4: Submit for Review

- Review timeline: 2-5 business days
- You'll receive email notification
- May need to respond to feedback

## Phase 7: Register for Hackathon (30 minutes)

### Step 7.1: Create Hackathon Account

1. Go to https://solanamobile.radiant.nexus/
2. Sign in with email or wallet
3. Complete profile

### Step 7.2: Submit Project

**Project Details:**
- **Name:** Batak Tournament
- **Category:** Gaming
- **Tagline:** "Turkish trick-taking card game with Solana rewards"
- **Description:** (Use app description + technical details)

**Links:**
- **GitHub:** https://github.com/[YOUR_REPO]/batak
- **Demo Video:** (Create 2-3 min video - see below)
- **dApp Store:** (Link from Phase 6)
- **Website:** (Optional)

### Step 7.3: Create Demo Video (2-3 hours)

**Video Structure (2-3 minutes):**
1. **Intro (15s):** "Batak Tournament - Traditional Turkish card game meets Solana blockchain"
2. **Problem (20s):** "Card games lack fair rewards and global accessibility"
3. **Solution (30s):** "Mobile-first multiplayer with on-chain achievements"
4. **Gameplay Demo (60s):**
   - Show wallet connection
   - Join queue
   - Bidding phase
   - Playing cards
   - Winning round
5. **Features (30s):** Highlight AI bots, leaderboards, cNFT rewards
6. **Tech Stack (15s):** React Native + Solana Mobile SDK + Socket.IO
7. **CTA (10s):** "Available on Solana dApp Store - Play now!"

**Tools:**
- **Screen recording:** Built-in Android screen recorder
- **Editing:** iMovie, DaVinci Resolve (free), CapCut
- **Voiceover:** Optional but recommended
- **Music:** Use royalty-free music (YouTube Audio Library)

**Upload to:**
- YouTube (unlisted or public)
- Vimeo
- Loom

### Step 7.4: Prepare Pitch Deck (Optional but Recommended)

**Slides (8-10 total):**
1. Title: Batak Tournament logo + tagline
2. Problem: Card game market gap
3. Solution: Mobile-first Solana game
4. Gameplay: Screenshots with annotations
5. Technology: Architecture diagram
6. Market: Turkish card game culture (85M+ players)
7. Traction: (If any - downloads, users, feedback)
8. Roadmap: Future features (tournaments, tokens, multiplayer lobbies)
9. Team: (Optional)
10. Thank You: Contact info + links

## Phase 8: Polish & Final Checks (1-2 hours)

### Pre-Submission Checklist

**Code Quality:**
- [ ] No console.log/debug code in production
- [ ] Error boundaries handle crashes gracefully
- [ ] Loading states for all async operations
- [ ] Proper TypeScript types (no 'any')

**UX Polish:**
- [ ] All buttons have touch feedback
- [ ] Loading spinners during network calls
- [ ] Error messages are user-friendly
- [ ] Navigation is intuitive

**Performance:**
- [ ] App size < 50MB
- [ ] Cold start < 3 seconds
- [ ] No memory leaks (test with long sessions)
- [ ] Smooth 60fps animations

**Compliance:**
- [ ] Privacy policy included
- [ ] No hardcoded API keys in APK
- [ ] Proper error handling for wallet failures
- [ ] Clear permissions explained

**Documentation:**
- [ ] README updated with latest info
- [ ] CHANGELOG created for version 1.0.0
- [ ] Code comments for complex logic
- [ ] API documentation (if relevant)

## Timeline

**Total Time: ~7-10 hours spread across 1-2 weeks**

| Phase | Duration | Deadline Recommendation |
|-------|----------|------------------------|
| 1. Signing Key | 30 min | Week 1 Day 1 |
| 2. Production Config | 15 min | Week 1 Day 1 |
| 3. Build APK | 20 min | Week 1 Day 2 |
| 4. Test Release | 30 min | Week 1 Day 2 |
| 5. Marketing Assets | 2-3 hrs | Week 1 Day 3-4 |
| 6. dApp Store | 1 hr | Week 2 Day 1 |
| 7. Hackathon | 3-4 hrs | Week 2 Day 2-3 |
| 8. Polish | 1-2 hrs | Week 2 Day 4 |

**Final Deadline:** March 9, 2026

## Troubleshooting

### Build Fails with "Keystore not found"

```bash
# Check keystore location
ls -la mobile/android/app/*.keystore

# If missing, regenerate (see Phase 1.1)
```

### APK Crashes on Launch

```bash
# Check logs
adb logcat | grep BatakTournament

# Common fixes:
# 1. Clear app data: adb shell pm clear com.bataktournament.mobile
# 2. Rebuild: cd android && ./gradlew clean && ./gradlew assembleRelease
```

### Wallet Adapter Not Working

- Ensure Solana Mobile SDK plugin in app.json
- Check that Phantom/Seeker wallet is installed
- Verify network (devnet vs mainnet)

### Server Connection Failed

- Check EXPO_PUBLIC_SOCKET_URL in .env.production
- Verify server is running and accessible
- Test with curl: `curl https://your-server.com`
- Check firewall rules

## Resources

- [Solana Mobile Docs](https://docs.solanamobile.com/)
- [Expo Build Guide](https://docs.expo.dev/build/setup/)
- [Android Signing Guide](https://reactnative.dev/docs/signed-apk-android)
- [Solana dApp Store Publishing](https://docs.solanamobile.com/dapp-publishing/intro)
- [Monolith Hackathon](https://solanamobile.radiant.nexus/)

## Questions?

- Solana Mobile Discord: https://discord.gg/solanamobile
- Expo Discord: https://discord.gg/expo
- Hackathon Support: Contact via Radiant Nexus platform

## Next Steps After Submission

1. **Monitor Review Status:** Check email for dApp Store feedback
2. **Engage Community:** Share on Twitter/Discord
3. **Gather Feedback:** Beta test with small group
4. **Iterate:** Fix bugs, add features based on feedback
5. **Plan v1.1:** Roadmap for post-hackathon improvements

Good luck! 🎮🃏🚀
