#!/bin/bash
# Vite cache temizleme ve yeniden başlatma scripti

echo "🧹 Cleaning Vite cache..."
rm -rf dist .vite node_modules/.vite

echo "🔄 Restarting dev server..."
npm run dev
