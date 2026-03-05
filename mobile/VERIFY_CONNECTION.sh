#!/bin/bash
# Batak Mobile - Connection Verification Script
# Phase 1.1: Fix Mobile App Connection Issue

set -e  # Exit on error

echo "========================================="
echo "Batak Mobile - Connection Verification"
echo "========================================="
echo ""

# Step 1: Verify .env configuration
echo "[1/5] Verifying .env configuration..."
if grep -q "ws://localhost:3001" mobile/.env; then
    echo "✅ .env correctly configured with ws://localhost:3001"
else
    echo "❌ ERROR: .env does not contain ws://localhost:3001"
    echo "Please update mobile/.env line 4 to: EXPO_PUBLIC_SOCKET_URL=ws://localhost:3001"
    exit 1
fi
echo ""

# Step 2: Kill Metro bundler
echo "[2/5] Restarting Metro bundler..."
echo "Killing any existing Metro processes on port 8081..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || echo "No Metro process found on port 8081"
echo "✅ Metro bundler cleared"
echo ""

# Step 3: Setup port forwarding
echo "[3/5] Setting up adb port forwarding..."
if ! command -v adb &> /dev/null; then
    echo "❌ ERROR: adb command not found. Please install Android SDK Platform Tools."
    exit 1
fi

# Check if device is connected
if ! adb devices | grep -q "device$"; then
    echo "❌ ERROR: No Android device connected"
    echo "Please connect your device via USB and enable USB debugging"
    exit 1
fi

echo "Setting up port forwarding..."
adb reverse tcp:8081 tcp:8081  # Metro bundler
adb reverse tcp:3001 tcp:3001  # Game server
echo "✅ Port forwarding configured (8081 → Metro, 3001 → Server)"
echo ""

# Step 4: Force-stop and restart app
echo "[4/5] Restarting mobile app..."
adb shell am force-stop com.bataktournament.mobile 2>/dev/null || echo "App not currently running"
sleep 1
adb shell am start -n com.bataktournament.mobile/.MainActivity
echo "✅ App restarted"
echo ""

# Step 5: Monitor connection logs
echo "[5/5] Monitoring connection logs..."
echo "Watch for: 'Socket connected: <socketId>'"
echo "Press Ctrl+C to stop monitoring"
echo ""
echo "----------------------------------------"
adb logcat -c  # Clear existing logs
adb logcat | grep -E "Socket|ReactNativeJS|Connecting to socket"
