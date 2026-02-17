#!/bin/bash
# Complete restart for Android development

echo "🧹 Step 1: Cleaning..."
pkill -f "expo|metro" 2>/dev/null
rm -rf .expo node_modules/.cache
echo "✅ Cache cleared"

echo ""
echo "🔌 Step 2: Port forwarding..."
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3001 tcp:3001
echo "✅ Ports forwarded"

echo ""
echo "🚀 Step 3: Starting Metro..."
echo "Wait for Metro to start, then press 'a' for Android"
echo ""

npm start
