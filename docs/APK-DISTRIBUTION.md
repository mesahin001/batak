# APK Generation & Distribution Guide

## Overview

Batak Tournament is built as a Progressive Web App (PWA) that can be packaged as an Android APK using Bubblewrap. This allows distribution through:

1. Direct APK download from website
2. Sideloading via ADB
3. Google Play Store (future)
4. Solana Mobile Seeker integration

---

## Quick Start

### Prerequisites

Install required tools:

```bash
# Install Bubblewrap CLI
npm install -g @bubblewrap/cli

# Verify Java is installed (JDK 11+)
java -version

# If not installed:
# macOS: brew install openjdk@11
# Ubuntu: sudo apt install openjdk-11-jdk
```

### Build APK

```bash
# From project root

# Option 1: Use production manifest (default)
MANIFEST_URL=https://s.batakci.xyz/manifest.json ./scripts/bubblewrap-build.sh

# Option 2: Use local development server
npm run dev  # In another terminal
MANIFEST_URL=http://localhost:5173/manifest.json ./scripts/bubblewrap-build.sh
```

### APK Location

After successful build:
```
dist/apk/*.apk
```

---

## Installation Methods

### Method 1: Direct Download (Recommended for MVP)

1. Upload APK to your server:
   ```bash
   scp dist/apk/*.apk user@server:/var/www/html/downloads/
   ```

2. Add download link to your website:
   ```html
   <a href="/downloads/batak-tournament.apk" download>
     📲 Download for Android
   </a>
   ```

3. Users download and install directly

### Method 2: ADB Sideload (Testing)

```bash
# Enable USB debugging on Android device
# Connect via USB

# Install APK
adb install dist/apk/*.apk

# Launch app
adb shell monkey -p com.bataktournament.game -c android.intent.category.LAUNCHER 1
```

### Method 3: Google Play Store (Future)

**Cost:** $25 one-time developer fee

**Steps:**
1. Create Google Play Developer account
2. Generate signed release APK
3. Complete store listing
4. Submit for review
5. Release

### Method 4: Solana dApp Store (Future)

When available:
1. Package app with Solana Mobile SDK
2. Submit to Solana dApp Store
3. Seeker integration

---

## Bubblewrap Configuration

### Manifest Settings

The PWA manifest at `/client/public/manifest.json` is used by Bubblewrap:

```json
{
  "name": "Batak Tournament",
  "short_name": "Batak",
  "orientation": "portrait",
  "display": "standalone",
  "start_url": "/",
  "icons": [...]
}
```

### Bubblewrap Config File

After first run, Bubblewrap creates `config.json` in the output directory:

```json
{
  "manifestId": "...",
  "appId": "com.bataktournament.game",
  "version": "1.0.0",
  "name": "Batak Tournament",
  "icons": {...}
}
```

---

## Signing & Distribution

### Debug Signing (Default)

The script uses a debug keystore:
- **Keystore:** `./keystore.jks`
- **Password:** `batak123` (change for production!)
- **Alias:** `batak-key`

⚠️ **Warning:** Use debug signing for testing only!

### Release Signing (Production)

For Google Play or public distribution:

1. Generate release keystore:
   ```bash
   keytool -genkey \
     -v \
     -keystore release-keystore.jks \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000 \
     -alias batak-release
   ```

2. Sign APK:
   ```bash
   jarsigner -verbose \
     -sigalg SHA256withRSA \
     -digestalg SHA256 \
     -keystore release-keystore.jks \
     dist/apk/*.apk \
     batak-release
   ```

3. Align APK:
   ```bash
   zipalign -v 4 dist/apk/*.apk dist/apk/batak-tournament-release.apk
   ```

---

## Solana Mobile Seeker Integration

### What is Seeker?

Solana Seeker is a mobile app for Solana dApps. It includes a built-in wallet and supports deep-linking.

### Current Status

✅ Mobile Wallet Adapter integrated
✅ PWA configured
✅ APK generation ready
⚠️ Seeker deep-linking needs testing

### Deep Link Setup

Add to `AndroidManifest.xml` (if needed):

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="solana" />
</intent-filter>
```

### Testing with Seeker

1. Install Solana Seeker on Android device
2. Install Batak Tournament APK
3. Launch app and connect wallet
4. Verify wallet connection works

---

## Build Script Details

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MANIFEST_URL` | `https://s.batakci.xyz/manifest.json` | URL to PWA manifest |
| `APP_NAME` | `Batak Tournament` | App display name |
| `APP_PACKAGE_NAME` | `com.bataktournament.game` | Android package name |

### Build Process

1. **Initialize** - Download manifest and create project
2. **Configure** - Set app metadata and permissions
3. **Build** - Generate unsigned APK
4. **Sign** - Sign with keystore
5. **Align** - Optimize APK size

### Customization

Edit `scripts/bubblewrap-build.sh` to customize:

```bash
# Change package name
APP_PACKAGE_NAME="com.yourcompany.batak"

# Change manifest URL
MANIFEST_URL="https://your-domain.com/manifest.json"

# Add additional features
# See: bubblewrap init --help
```

---

## Troubleshooting

### Issue: "Manifest not found"

**Solution:**
- Ensure PWA is deployed and accessible
- Test manifest URL in browser
- Check for CORS issues

### Issue: "Java not found"

**Solution:**
```bash
# macOS
brew install openjdk@11

# Ubuntu/Debian
sudo apt install openjdk-11-jdk

# Set JAVA_HOME
export JAVA_HOME=/path/to/java
```

### Issue: "Bubblewrap init fails"

**Solution:**
```bash
# Update Bubblewrap
npm update -g @bubblewrap/cli

# Check manifest URL
curl -I $MANIFEST_URL

# Try with verbose output
bubblewrap init --manifest "$MANIFEST_URL" --directory "$OUTPUT_DIR" --verbose
```

### Issue: "APK won't install on device"

**Solution:**
1. Enable "Install from unknown sources"
2. Check Android version compatibility (minSdkVersion)
3. Verify APK signature
4. Check available storage space

### Issue: "Wallet connection fails in APK"

**Solution:**
1. Test in browser first
2. Check Mobile Wallet Adapter integration
3. Verify deep-link configuration
4. Check app permissions

---

## Version Management

### Update Version

1. Update version in `client/public/manifest.json`
2. Rebuild APK
3. Increment version code in Bubblewrap config

### Release Strategy

```bash
# Development builds
MANIFEST_URL=http://localhost:5173/manifest.json ./scripts/bubblewrap-build.sh

# Staging builds
MANIFEST_URL=https://staging.batakci.xyz/manifest.json ./scripts/bubblewrap-build.sh

# Production builds
MANIFEST_URL=https://s.batakci.xyz/manifest.json ./scripts/bubblewrap-build.sh
```

---

## Automation

### CI/CD Integration

Add to GitHub Actions (`.github/workflows/build-apk.yml`):

```yaml
name: Build APK

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '11'

      - name: Install Bubblewrap
        run: npm install -g @bubblewrap/cli

      - name: Build APK
        env:
          MANIFEST_URL: https://s.batakci.xyz/manifest.json
        run: ./scripts/bubblewrap-build.sh

      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: batak-tournament-apk
          path: dist/apk/*.apk
```

---

## Distribution Checklist

### Pre-Distribution
- [ ] Test APK on multiple devices
- [ ] Verify wallet connection works
- [ ] Test all game features
- [ ] Check permissions are minimal
- [ ] Verify app icon and name
- [ ] Test with Solana Seeker (if available)

### Distribution
- [ ] Upload APK to server
- [ ] Add download link to website
- [ ] Test download and installation
- [ ] Monitor for crash reports
- [ ] Gather user feedback

### Post-Distribution
- [ ] Track download statistics
- [ ] Monitor app performance
- [ ] Collect crash reports
- [ ] Plan updates based on feedback

---

## Cost Summary

| Item | Cost |
|------|------|
| Bubblewrap CLI | Free |
| Debug signing | Free |
| APK hosting | ~€0.01/100 downloads |
| Google Play Developer | $25 one-time (optional) |
| Apple Developer | $99/year (if iOS app planned) |

---

## Next Steps

### Immediate (This Week)
1. Build test APK
2. Install on Android device
3. Test all features
4. Upload to website for testing

### Short Term (Next Month)
1. Gather beta tester feedback
2. Fix critical bugs
3. Optimize APK size
4. Prepare Play Store listing

### Long Term (3-6 Months)
1. Submit to Google Play Store
2. Integrate with Solana Seeker
3. Implement push notifications
4. Add offline mode

---

## Resources

- Bubblewrap Docs: https://github.com/GoogleChromeLabs/bubblewrap
- PWA Builder: https://www.pwabuilder.com/
- Solana Mobile: https://solanamobile.com/
- Android Publishing: https://developer.android.com/studio/publish

---

**Last Updated:** February 2026
**Status:** Ready for testing
