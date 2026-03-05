# Batak Tournament — Release Build Guide

Deadline: **9 Mart 2026** (Solana Mobile Monolith Hackathon)

---

## Step 1 — Generate Release Keystore (one-time)

Run from `mobile/android/app/`:

```bash
cd mobile/android/app

keytool -genkey -v \
  -keystore batak-release.keystore \
  -alias batak-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You'll be prompted for passwords and organization details. **Save the passwords — losing them means you can never update the app.**

> The keystore file (`*.keystore`) is gitignored — it will NOT be committed. Keep a secure backup (e.g., 1Password, iCloud Keychain).

---

## Step 2 — Add Credentials to gradle.properties

Edit `mobile/android/gradle.properties` and uncomment + fill these lines:

```properties
BATAK_UPLOAD_STORE_FILE=batak-release.keystore
BATAK_UPLOAD_STORE_PASSWORD=<your store password>
BATAK_UPLOAD_KEY_ALIAS=batak-key-alias
BATAK_UPLOAD_KEY_PASSWORD=<your key password>
```

---

## Step 3 — Build Release APK

```bash
cd mobile/android
./gradlew assembleRelease
```

Output: `mobile/android/app/build/outputs/apk/release/app-release.apk`

---

## Step 4 — Install & Verify on Device

```bash
# Install
adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk

# Verify version
adb shell dumpsys package com.bataktournament.mobile | grep versionName
# Expected: versionName=1.0.0

# Verify it's signed with release key (not debug)
apksigner verify --verbose mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## Step 5 — Test Release Build

- [ ] App launches without crashes
- [ ] Login with Seeker wallet (MWA flow works)
- [ ] Join matchmaking queue → game starts
- [ ] Play a full round — cards play correctly
- [ ] Private room: create code + join from another device
- [ ] NFT trophy visible in Settings (if minting enabled)

---

## Step 6 — Record Demo Video (manual)

Use Android's built-in screen recorder or ADB:

```bash
# ADB screenrecord (max 3 min, saves to device)
adb shell screenrecord /sdcard/batak-demo.mp4

# Pull to Mac
adb pull /sdcard/batak-demo.mp4 .
```

**Demo script (2-3 min):**
1. Open app, authorize Seeker wallet
2. Join matchmaking → game loads
3. Play 2-3 tricks (show card animations)
4. Create private room, show 6-char code
5. Show Settings → NFT Trophy Gallery
6. (If live minting works) Win a game → claim cNFT

---

## Step 7 — dApp Store Submission

URL: https://dappstore.solanamobile.com

Required:
- APK file (from Step 3)
- App icon: 512×512 PNG
- Feature banner: 1200×600 PNG
- 2-3 screenshots
- Description (see `mobile/MARKETING.md`)
- Package name: `com.bataktournament.mobile`
- Category: Games

---

## Step 8 — Hackathon Registration

URL: https://solana.com/monolith

Fill in:
- Project name: Batak Tournament
- Description: (use Short Pitch from `mobile/MARKETING.md`)
- GitHub repo URL
- Demo video URL
- APK download link (upload to GitHub Releases or Google Drive)

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `./gradlew assembleDebug` | Debug APK (fast) |
| `./gradlew assembleRelease` | Release APK (signed) |
| `adb install -r app-release.apk` | Install on connected device |
| `adb reverse tcp:3001 tcp:3001` | Forward server port to device |
| `lsof -ti:3001 \| xargs kill -9` | Kill server if stuck on port |

## Troubleshooting

**Build fails with "keystore not found":**
→ Confirm `BATAK_UPLOAD_STORE_FILE=batak-release.keystore` and the file exists in `mobile/android/app/`

**App crashes on launch (release only):**
→ Check ProGuard rules. Add to `proguard-rules.pro`:
```
-keep class com.bataktournament.** { *; }
-keep class expo.** { *; }
```

**MWA not finding Seeker:**
→ Ensure Seeker wallet app is installed on the same device. Release builds require Seeker to be installed.
