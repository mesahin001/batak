#!/bin/bash

# PvP Testing Helper Script
# This script helps set up the environment for PvP testing

echo "==================================="
echo "Batak PvP Testing Helper"
echo "==================================="
echo ""

# Check if server is running
echo "1. Checking if server is running on port 3001..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "   ✅ Server is running on port 3001"
else
    echo "   ❌ Server NOT running on port 3001"
    echo "   Run: cd server && npm run dev"
fi

echo ""

# Check if client dev server is running
echo "2. Checking if client is running on port 5173..."
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "   ✅ Client is running on port 5173"
else
    echo "   ❌ Client NOT running on port 5173"
    echo "   Run: cd client && npm run dev"
fi

echo ""

# Show current .env settings
echo "3. Current .env settings:"
echo "   Web Client:"
if [ -f "client/.env" ]; then
    grep "VITE_DEFAULT_BOT_COUNT" client/.env || echo "   ⚠️  VITE_DEFAULT_BOT_COUNT not found"
    grep "VITE_SERVER_URL" client/.env || echo "   ⚠️  VITE_SERVER_URL not found"
else
    echo "   ❌ client/.env not found"
fi

echo ""
echo "   Mobile App:"
if [ -f "mobile/.env" ]; then
    grep "EXPO_PUBLIC_DEFAULT_BOT_COUNT" mobile/.env || echo "   ⚠️  EXPO_PUBLIC_DEFAULT_BOT_COUNT not found"
    grep "EXPO_PUBLIC_SOCKET_URL" mobile/.env || echo "   ⚠️  EXPO_PUBLIC_SOCKET_URL not found"
else
    echo "   ❌ mobile/.env not found"
fi

echo ""

# Get local IP
echo "4. Your local IP address (for mobile/network testing):"
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "Could not detect")
if [ "$LOCAL_IP" != "Could not detect" ]; then
    echo "   📱 $LOCAL_IP"
    echo "   Use this in mobile app: ws://$LOCAL_IP:3001"
else
    echo "   ⚠️  Could not auto-detect. Run 'ipconfig' or 'ifconfig' manually"
fi

echo ""

# Testing instructions
echo "==================================="
echo "Quick Start for PvP Testing:"
echo "==================================="
echo ""
echo "Option A - Browser Tabs (Easiest):"
echo "  1. Open http://localhost:5173 in 4 different browser windows:"
echo "     - Chrome regular"
echo "     - Chrome incognito (Cmd+Shift+N)"
echo "     - Firefox regular"
echo "     - Firefox private (Cmd+Shift+P)"
echo "  2. Login with different emails in each"
echo "  3. All select 'Koz Maca' and 'PvP (0 bots)'"
echo "  4. Click 'Oyun Bul' on all 4 within a few seconds"
echo "  5. Should match immediately!"
echo ""
echo "Option B - Mobile + Web:"
echo "  1. Open http://localhost:5173 in 2-3 browser tabs"
if [ "$LOCAL_IP" != "Could not detect" ]; then
echo "  2. On mobile device, update .env to: ws://$LOCAL_IP:3001"
else
echo "  2. On mobile device, update .env with your computer's IP"
fi
echo "  3. Run 'npm start' in mobile/ and press 'a' for Android"
echo "  4. All devices join same queue (same mode, same bot count)"
echo ""
echo "Option C - 2-Player Test (With Bot Fallback):"
echo "  1. Open 2 browser tabs"
echo "  2. Both select 'Koz Maca' and 'PvP (0 bots)'"
echo "  3. Click 'Oyun Bul' on both"
echo "  4. Wait 60 seconds - should see bot fallback countdown"
echo "  5. After 60s, bots added automatically"
echo ""
echo "==================================="
echo "Need Help?"
echo "==================================="
echo "📖 Read full testing guide: PVP_TESTING_GUIDE.md"
echo "🐛 Report issues with logs from browser console + server terminal"
echo ""
