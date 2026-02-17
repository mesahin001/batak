# Quick Reference: Building Release APK

This is a condensed guide for building the production APK. For full details, see [HACKATHON_SUBMISSION.md](./HACKATHON_SUBMISSION.md).

## Prerequisites

```bash
# Verify Java version (need JDK 17+)
java -version

# Verify Android SDK
echo $ANDROID_HOME

# Should output: /Users/[USER]/Library/Android/sdk
```

## Step 1: Generate Signing Key (ONE TIME ONLY)

```bash
cd mobile/android/app

keytool -genkey -v -keystore batak-release.keystore \
  -alias batak-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# SAVE YOUR PASSWORDS! You'll need them for every release.
```

## Step 2: Configure Gradle (ONE TIME ONLY)

```bash
cd mobile/android

# Copy template
cp gradle.properties.example gradle.properties

# Edit gradle.properties
nano gradle.properties

# Update these lines with YOUR passwords:
# BATAK_RELEASE_STORE_PASSWORD=<your-keystore-password>
# BATAK_RELEASE_KEY_PASSWORD=<your-key-password>

# DO NOT COMMIT gradle.properties!
# Add to .gitignore if not already there
```

## Step 3: Set Production Environment

```bash
cd mobile

# Option A: Use production .env
cp .env.production .env

# Option B: Edit .env directly
nano .env

# Update server URL:
# EXPO_PUBLIC_SOCKET_URL=wss://your-production-server.com
```

## Step 4: Build APK

```bash
cd mobile

# Clean previous builds
npm run clean  # or: cd android && ./gradlew clean && cd ..

# Prebuild (generates native Android code)
npx expo prebuild --platform android --clean

# Build release APK
cd android
./gradlew assembleRelease

# Output: android/app/build/outputs/apk/release/app-release.apk
```

## Step 5: Verify APK

```bash
cd mobile/android

# Check APK details
aapt dump badging app/build/outputs/apk/release/app-release.apk | grep package

# Expected output:
# package: name='com.bataktournament.mobile' versionCode='1' versionName='1.0.0'

# Check APK size
ls -lh app/build/outputs/apk/release/app-release.apk

# Should be 20-30 MB
```

## Step 6: Install & Test

```bash
# Connect Android device via USB
# Enable USB debugging in Developer Options

# Check device connected
adb devices

# Install APK
adb install -r app/build/outputs/apk/release/app-release.apk

# Launch app
adb shell am start -n com.bataktournament.mobile/.MainActivity

# View logs
adb logcat | grep BatakTournament
```

## Troubleshooting

### Build fails with "Keystore not found"

```bash
# Check if keystore exists
ls -la mobile/android/app/*.keystore

# If missing, run Step 1 again
```

### Build fails with "Password incorrect"

```bash
# Verify gradle.properties has correct passwords
cat mobile/android/gradle.properties | grep PASSWORD

# Update if needed
nano mobile/android/gradle.properties
```

### APK crashes on launch

```bash
# Clear app data
adb shell pm clear com.bataktournament.mobile

# Uninstall and reinstall
adb uninstall com.bataktournament.mobile
adb install -r app/build/outputs/apk/release/app-release.apk

# Check for errors
adb logcat | grep -i error
```

### Server connection fails

```bash
# Check .env configuration
cat mobile/.env | grep SOCKET_URL

# Test server accessibility
curl -I https://your-server.com

# If using ngrok:
# 1. Start server: cd server && npm run dev
# 2. Start ngrok: ngrok http 3001
# 3. Update .env with ngrok URL (wss://abc123.ngrok.io)
```

### Build successful but APK not found

```bash
# Check build output directory
ls -la mobile/android/app/build/outputs/apk/release/

# Try alternative build command
cd mobile/android
./gradlew clean
./gradlew assembleRelease --stacktrace
```

## Quick Commands Summary

```bash
# Complete rebuild (clean slate)
cd mobile/android
./gradlew clean
cd ..
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease

# Fast rebuild (no clean)
cd mobile/android
./gradlew assembleRelease

# Install on device
adb install -r android/app/build/outputs/apk/release/app-release.apk

# Uninstall from device
adb uninstall com.bataktournament.mobile

# View logs
adb logcat | grep BatakTournament
```

## Version Bumping (Future Releases)

When releasing v1.1, v1.2, etc.:

```bash
# 1. Update version in app.json
nano mobile/app.json
# Change: "version": "1.0.0" → "1.1.0"
# Change: "versionCode": 1 → 2

# 2. Rebuild
cd mobile/android
./gradlew clean
./gradlew assembleRelease

# Output: app-release.apk (now v1.1.0 / versionCode 2)
```

## File Locations

```
mobile/
├── .env                          ← Active environment config
├── .env.production               ← Production config template
├── app.json                      ← App metadata & version
├── android/
│   ├── gradle.properties         ← Signing credentials (DO NOT COMMIT!)
│   └── app/
│       ├── batak-release.keystore ← Signing key (BACKUP SECURELY!)
│       └── build/outputs/apk/release/
│           └── app-release.apk   ← Final APK
```

## Security Checklist

Before releasing:

- [ ] `.env` has production server URL (not localhost)
- [ ] `gradle.properties` has release keystore config
- [ ] Keystore file is backed up securely
- [ ] Keystore passwords saved in password manager
- [ ] `.gitignore` includes `gradle.properties` and `*.keystore`
- [ ] No debug logs or API keys in code
- [ ] Privacy policy updated
- [ ] Test on physical device

## Next Steps After Building

1. **Test thoroughly** on physical device (30+ min session)
2. **Create marketing assets** (icon, banner, screenshots)
3. **Submit to Solana dApp Store** (see HACKATHON_SUBMISSION.md)
4. **Register for hackathon** (solanamobile.radiant.nexus)
5. **Create demo video** (2-3 minutes)

## Help & Resources

- Full guide: [HACKATHON_SUBMISSION.md](./HACKATHON_SUBMISSION.md)
- Expo build docs: https://docs.expo.dev/build/setup/
- Android signing guide: https://reactnative.dev/docs/signed-apk-android
- Solana dApp Store: https://docs.solanamobile.com/dapp-publishing/

---

**Last Updated:** February 10, 2026
