#!/bin/bash

# Batak Tournament - PWA to APK Build Script
# Uses Bubblewrap to package the PWA as an Android APK

set -e

echo "🃏 Batak Tournament - APK Build Script"
echo "========================================"

# Configuration
MANIFEST_URL="${MANIFEST_URL:-https://s.batakci.xyz/manifest.json}"
APP_NAME="Batak Tournament"
APP_PACKAGE_NAME="com.bataktournament.game"
OUTPUT_DIR="./dist/apk"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check if Bubblewrap is installed
if ! command -v bubblewrap &> /dev/null; then
    echo -e "${YELLOW}Bubblewrap not found. Installing...${NC}"
    npm install -g @bubblewrap/cli
fi

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo -e "${RED}Error: Java is required but not found.${NC}"
    echo "Please install Java JDK 11 or higher."
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Initialize Bubblewrap project
echo ""
echo "🔧 Initializing Bubblewrap project..."
echo "Manifest URL: $MANIFEST_URL"

# Run bubblewrap init (non-interactive)
bubblewrap init --manifest "$MANIFEST_URL" --directory "$OUTPUT_DIR" || {
    echo -e "${RED}Failed to initialize Bubblewrap project${NC}"
    echo "Make sure your PWA is running and accessible at $MANIFEST_URL"
    exit 1
}

# Update icon settings
echo ""
echo "🎨 Updating app configuration..."

# Build APK
echo ""
echo "📱 Building APK..."
cd "$OUTPUT_DIR"

bubblewrap build || {
    echo -e "${RED}Failed to build APK${NC}"
    exit 1
}

# Sign APK (for testing)
echo ""
echo "✍️  Signing APK (debug)..."

KEYSTORE="./keystore.jks"
KEY_ALIAS="batak-key"

if [ ! -f "$KEYSTORE" ]; then
    keytool -genkey \
        -v \
        -keystore "$KEYSTORE" \
        -alias "$KEY_ALIAS" \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000 \
        -storepass "batak123" \
        -keypass "batak123" \
        -dname "CN=Batak Tournament, OU=Game, O=Batak, L=Istanbul, ST=TR, C=TR"
fi

# Find unsigned APK
UNSIGNED_APK=$(find . -name "*.apk" -not -name "*signed*" | head -1)

if [ -n "$UNSIGNED_APK" ]; then
    SIGNED_APK="${UNSIGNED_APK%.apk}-signed.apk"

    jarsigner -verbose \
        -sigalg SHA256withRSA \
        -digestalg SHA256 \
        -keystore "$KEYSTORE" \
        -storepass "batak123" \
        -keypass "batak123" \
        "$UNSIGNED_APK" \
        "$KEY_ALIAS"

    # Align APK
    if command -v zipalign &> /dev/null; then
        zipalign -v 4 "$UNSIGNED_APK" "$SIGNED_APK"
        echo -e "${GREEN}✅ APK signed and aligned: $SIGNED_APK${NC}"
    else
        echo -e "${GREEN}✅ APK signed: $UNSIGNED_APK${NC}"
    fi
fi

cd -

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Build Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "APK Location: $OUTPUT_DIR"
echo ""
echo "📲 To install on Android:"
echo "1. Enable 'Install from unknown sources' in settings"
echo "2. Transfer APK to device"
echo "3. Open APK file to install"
echo ""
echo "🔗 For Solana Seeker integration:"
echo "The app includes deep-linking support for wallet connection"
