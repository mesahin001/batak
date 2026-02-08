#!/bin/bash

# Batak Tournament - Deployment Script
# Deploys both server and client to free hosting platforms

set -e

echo "🚀 Batak Tournament - Deployment Script"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVER_DIR="./server"
CLIENT_DIR="./client"
RENDER_API_KEY="${RENDER_API_KEY:-}"
VERCEL_TOKEN="${VERCEL_TOKEN:-}"

# Check which components to deploy
DEPLOY_SERVER="${DEPLOY_SERVER:-true}"
DEPLOY_CLIENT="${DEPLOY_CLIENT:-true}"

# Deploy Server to Render
if [ "$DEPLOY_SERVER" = "true" ]; then
    echo ""
    echo -e "${BLUE}📦 Deploying Server to Render...${NC}"

    if [ -z "$RENDER_API_KEY" ]; then
        echo -e "${YELLOW}RENDER_API_KEY not set. Using manual deployment instructions.${NC}"
        echo ""
        echo "To deploy to Render:"
        echo "1. Create account at https://render.com"
        echo "2. Connect your GitHub repository"
        echo "3. Create new Web Service"
        echo "4. Configure:"
        echo "   - Root: ./server"
        echo "   - Build: npm run build"
        echo "   - Start: npm run start"
        echo "   - Environment Variables (see .env.example)"
    else
        # Deploy using Render CLI (if available)
        if command -v render &> /dev/null; then
            cd "$SERVER_DIR"
            render deploy
            cd -
        else
            echo -e "${YELLOW}Render CLI not found. Please deploy via dashboard.${NC}"
        fi
    fi
fi

# Deploy Client to Vercel
if [ "$DEPLOY_CLIENT" = "true" ]; then
    echo ""
    echo -e "${BLUE}📦 Deploying Client to Vercel...${NC}"

    if [ -z "$VERCEL_TOKEN" ]; then
        echo -e "${YELLOW}VERCEL_TOKEN not set. Using manual deployment instructions.${NC}"
        echo ""
        echo "To deploy to Vercel:"
        echo "1. Install Vercel CLI: npm i -g vercel"
        echo "2. Run: cd client && vercel"
        echo ""
        echo "Or deploy via Vercel dashboard:"
        echo "1. Go to https://vercel.com"
        echo "2. Import your GitHub repository"
        echo "3. Configure:"
        echo "   - Root: ./client"
        echo "   - Build Command: npm run build"
        echo "   - Output: ./dist"
    else
        # Deploy using Vercel CLI
        if command -v vercel &> /dev/null; then
            cd "$CLIENT_DIR"
            vercel --prod --token="$VERCEL_TOKEN"
            cd -
        else
            echo -e "${YELLOW}Vercel CLI not found. Install with: npm i -g vercel${NC}"
        fi
    fi
fi

# Build APK for distribution
echo ""
echo -e "${BLUE}📱 Building APK for distribution...${NC}"

if [ -f "./scripts/bubblewrap-build.sh" ]; then
    chmod +x ./scripts/bubblewrap-build.sh
    echo "Run ./scripts/bubblewrap-build.sh to build APK"
else
    echo -e "${YELLOW}APK build script not found${NC}"
fi

# Deployment summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Instructions Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📋 Post-deployment checklist:"
echo ""
echo "Server (Render/Railway):"
echo "  □ Set environment variables in dashboard"
echo "  □ Copy server URL for client configuration"
echo "  □ Test WebSocket connection"
echo ""
echo "Client (Vercel):"
echo "  □ Update VITE_SERVER_URL with server URL"
echo "  □ Update VITE_PROGRAM_ID with deployed program ID"
echo "  □ Test PWA functionality"
echo ""
echo "Solana Program:"
echo "  □ Deploy to devnet: anchor deploy"
echo "  □ Copy program ID"
echo "  □ Update client and server environment variables"
echo "  □ Create/reuse Merkle tree for cNFTs"
echo ""
echo "APK:"
echo "  □ Build APK: ./scripts/bubblewrap-build.sh"
echo "  □ Test on Android device"
echo "  □ Test Solana Seeker wallet connection"
echo "  □ Submit to dApp Store (if applicable)"
