#!/bin/bash

# Batak Tournament - Local Development Script
# Starts both server and client for local development

set -e

echo "🃏 Batak Tournament - Local Development"
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Kill any existing processes on ports
echo ""
echo "🧹 Cleaning up existing processes..."

# Kill process on port 3001 (server)
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Kill process on port 5173 (client)
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Install dependencies if needed
echo ""
echo "📦 Installing dependencies..."

if [ ! -d "server/node_modules" ]; then
    echo -e "${BLUE}Installing server dependencies...${NC}"
    cd server && npm install && cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo -e "${BLUE}Installing client dependencies...${NC}"
    cd client && npm install && cd ..
fi

# Setup environment files
echo ""
echo "🔧 Setting up environment files..."

if [ ! -f "server/.env" ]; then
    echo -e "${YELLOW}Creating server .env file...${NC}"
    cat > server/.env << EOF
# Server Configuration
PORT=3001
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=
SOLANA_NETWORK=devnet
PROGRAM_ID=BatakPK1111111111111111111111111111111111
MERKLE_TREE=
EOF
    echo -e "${YELLOW}⚠️  Please configure server/.env with your Solana keys${NC}"
fi

if [ ! -f "client/.env" ]; then
    echo -e "${YELLOW}Creating client .env file...${NC}"
    cat > client/.env << EOF
VITE_SERVER_URL=ws://localhost:3001
VITE_SOLANA_NETWORK=devnet
VITE_PROGRAM_ID=BatakPK1111111111111111111111111111111
VITE_DEFAULT_BOT_DIFFICULTY=normal
VITE_DEFAULT_BOT_COUNT=3
EOF
fi

# Start server
echo ""
echo -e "${BLUE}🚀 Starting server...${NC}"
cd server && npm run dev &
SERVER_PID=$!
cd -

# Wait for server to start
sleep 3

# Start client
echo -e "${BLUE}🚀 Starting client...${NC}"
cd client && npm run dev &
CLIENT_PID=$!
cd -

# Save PIDs for cleanup
echo $SERVER_PID > .server.pid
echo $CLIENT_PID > .client.pid

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Development Environment Ready!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "🌐 Server running at: http://localhost:3001"
echo "🌐 Client running at: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop all processes"
echo ""

# Handle cleanup
trap "echo ''; echo '🛑 Stopping services...'; kill $SERVER_PID $CLIENT_PID 2>/dev/null; rm -f .server.pid .client.pid; exit 0" INT TERM

# Wait for processes
wait
