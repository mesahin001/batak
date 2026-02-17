# Quick Start: Hackathon Submission in 2 Hours

If you need to build and submit FAST, follow this minimal path.

## Prerequisites (5 min)

```bash
# Check you have everything
java -version        # Need JDK 17+
echo $ANDROID_HOME   # Need Android SDK
adb devices          # Need Android device connected
```

## Step 1: Generate Signing Key (10 min)

```bash
cd mobile/android/app
keytool -genkey -v -keystore batak-release.keystore \
  -alias batak-release -keyalg RSA -keysize 2048 -validity 10000

# Enter passwords (SAVE THEM!)
# Fill in your name/org details
```

## Step 2: Configure Gradle (5 min)

```bash
cd mobile/android
cp gradle.properties.example gradle.properties

# Edit gradle.properties (use nano/vim/vscode)
# Update ONLY these 2 lines with YOUR passwords:
# BATAK_RELEASE_STORE_PASSWORD=YOUR_PASSWORD_HERE
# BATAK_RELEASE_KEY_PASSWORD=YOUR_PASSWORD_HERE

# Save and close
```

## Step 3: Set Server URL (2 min)

**Option A: Use ngrok (fastest)**
```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Start ngrok
ngrok http 3001
# Copy URL like: https://abc123.ngrok.io
```

**Option B: Use your production server**
```bash
# If you already have a deployed server, use that URL
```

**Update .env:**
```bash
cd mobile
nano .env

# Change this line:
# EXPO_PUBLIC_SOCKET_URL=wss://abc123.ngrok.io
# (replace with your ngrok URL or production server)

# Save and close
```

## Step 4: Build APK (15 min)

```bash
cd mobile

# Clean and prebuild
npx expo prebuild --platform android --clean

# Build release
cd android
./gradlew assembleRelease

# APK is at: android/app/build/outputs/apk/release/app-release.apk
```

## Step 5: Test APK (10 min)

```bash
# Install on device
adb install -r app/build/outputs/apk/release/app-release.apk

# Test these CRITICAL flows:
# 1. Launch app ✅
# 2. Connect wallet ✅
# 3. Join queue → Play game → Win/lose ✅
# 4. Check leaderboard ✅

# If any fail, check logs:
adb logcat | grep BatakTournament
```

## Step 6: Create Assets (30 min)

### Icon (10 min)
```bash
# Check current icon
ls -lh mobile/assets/icon.png

# If not 512x512, resize using:
# - Canva: Upload → Resize → Export as PNG
# - ImageMagick: convert icon.png -resize 512x512 icon-512.png
# - Online: https://www.simpleimageresizer.com/
```

### Banner (15 min)
```bash
# Use Canva (easiest):
# 1. Create design → Custom size → 1200x600
# 2. Search templates: "game banner"
# 3. Add text: "Batak Tournament - Turkish Card Game on Solana"
# 4. Add card graphics or Turkish motifs
# 5. Download as PNG → Save to mobile/assets/banner-1200x600.png
```

### Screenshots (5 min)
```bash
# On device: Play game and take screenshots
# Or use: adb shell screencap -p /sdcard/screenshot.png

# Need 4-5 screenshots showing:
# 1. Lobby screen
# 2. Bidding phase
# 3. Card play
# 4. Scoreboard
# 5. Leaderboard

# Save to: mobile/assets/screenshots/
```

## Step 7: Submit to dApp Store (20 min)

### Register (5 min)
1. Go to https://dapp-publishing.solanamobile.com/
2. Sign in with Solana wallet
3. Complete publisher profile

### Upload (15 min)
**App Information:**
- Name: `Batak Tournament`
- Package: `com.bataktournament.mobile`
- Category: `Games > Card`
- Price: `Free`

**Description:** (copy from below)
```
BATAK TOURNAMENT - Turkish Card Game on Solana

Play authentic Turkish trick-taking card game with blockchain rewards!

🃏 TWO GAME MODES
- Koz Maça: Classic spades-trump mode
- İhaleli Batak: Advanced bidding with suit selection

🎮 FEATURES
- Real-time multiplayer (4 players)
- AI bots with 3 difficulty levels
- Tournament system with cNFT rewards
- Global leaderboards
- Solana wallet integration

🏆 EARN REWARDS
Win tournaments and earn compressed NFTs on Solana blockchain.

📱 MOBILE-FIRST
Built for Solana Mobile with native wallet adapter support.

Perfect for card game enthusiasts and crypto natives!
```

**Upload Files:**
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- Icon: `mobile/assets/icon.png` (512x512)
- Banner: `mobile/assets/banner-1200x600.png`
- Screenshots: 4-5 images

**Privacy Policy:**
- URL: `https://github.com/YOUR_USERNAME/batak/blob/main/mobile/PRIVACY_POLICY.md`

**Compliance:**
- ✅ Check "Complies with Solana dApp Store policies"

**Submit!**

## Step 8: Register for Hackathon (25 min)

### Create Account (5 min)
1. Go to https://solanamobile.radiant.nexus/
2. Sign in with email or wallet
3. Complete profile

### Submit Project (20 min)

**Project Details:**
- **Name:** Batak Tournament
- **Category:** Gaming
- **Tagline:** "Turkish trick-taking card game with Solana rewards"

**Description:** (copy from `README_HACKATHON.md` or write your own)

**Key points to mention:**
- First Turkish Batak game on Solana Mobile
- Mobile-first design (not web port)
- Complete feature set (multiplayer, bots, blockchain rewards)
- Production-ready app (not prototype)
- Cultural authenticity (85M+ potential users)

**Links:**
- GitHub: `https://github.com/YOUR_USERNAME/batak`
- Demo: (Upload quick screen recording or link to dApp Store)
- Website: (Optional)

**Tech Stack:**
- React Native + Expo
- Solana Mobile SDK
- TypeScript
- Socket.IO
- Metaplex Bubblegum (cNFTs)

**Submit before March 9, 2026!**

## Total Time: ~2 hours

- Step 1-2: Signing (15 min)
- Step 3-4: Build (17 min)
- Step 5: Test (10 min)
- Step 6: Assets (30 min)
- Step 7: dApp Store (20 min)
- Step 8: Hackathon (25 min)
- **Buffer:** 10 min

## Troubleshooting

### Build fails
```bash
# Clean and retry
cd mobile/android
./gradlew clean
./gradlew assembleRelease --stacktrace
```

### APK crashes
```bash
# Clear app data
adb shell pm clear com.bataktournament.mobile
# Reinstall
adb install -r app/build/outputs/apk/release/app-release.apk
```

### Can't connect to server
```bash
# Check .env has correct URL
cat mobile/.env | grep SOCKET_URL

# Test server
curl https://your-server-url.com
```

## After Submission

### Wait for Review
- dApp Store: 2-5 business days
- Check email for updates

### Create Demo Video (Optional but Recommended)
- Screen record gameplay (2-3 minutes)
- Edit with iMovie/DaVinci Resolve
- Upload to YouTube
- Add to hackathon submission

### Promote
- Tweet about submission
- Share in Solana Discord
- Post in hackathon community

## Files You Need

| File | Location | Purpose |
|------|----------|---------|
| APK | `android/app/build/outputs/apk/release/app-release.apk` | Upload to dApp Store |
| Icon | `mobile/assets/icon.png` | 512x512 PNG |
| Banner | `mobile/assets/banner-1200x600.png` | 1200x600 PNG |
| Screenshots | `mobile/assets/screenshots/` | 4-5 gameplay images |
| Privacy Policy | `mobile/PRIVACY_POLICY.md` | Link in submission |

## Checklist

Before submitting, verify:

- [ ] APK builds successfully
- [ ] APK installed and tested on device
- [ ] Wallet connection works
- [ ] Full game playable
- [ ] Icon is 512x512 PNG
- [ ] Banner is 1200x600 PNG
- [ ] 4+ screenshots captured
- [ ] Description written
- [ ] Privacy policy accessible
- [ ] dApp Store submission complete
- [ ] Hackathon registration complete
- [ ] Deadline: Before March 9, 2026

## Need More Time?

For detailed instructions, see:
- **Full guide:** `HACKATHON_SUBMISSION.md`
- **Build details:** `BUILD_RELEASE.md`
- **Security checks:** `SECURITY_CHECKLIST.md`

---

**You got this! 🚀**

The hardest part (building the app) is already done. Now just package it up and submit!
