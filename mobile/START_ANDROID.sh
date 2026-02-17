#!/bin/bash
# Android app başlatma scripti

echo "🔧 Setting up port forwarding..."
adb reverse tcp:8081 tcp:8081  # Metro Bundler
adb reverse tcp:3001 tcp:3001  # Game Server

echo ""
echo "🚀 Starting Metro bundler..."
npm start

# Kullanım:
# 1. Bu script'i çalıştır: ./START_ANDROID.sh
# 2. Metro açıldığında 'a' bas (Android)
# 3. App cihazda açılır
