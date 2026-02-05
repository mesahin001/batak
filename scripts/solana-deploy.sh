#!/bin/bash

# Batak Tournament - Solana Devnet Deployment Script
# This script deploys the Batak Tournament program to Solana Devnet

set -e

echo "=================================="
echo " BATAK TOURNAMENT - SOLANA DEPLOY"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo -e "${RED}Error: Solana CLI not installed${NC}"
    echo "Install: brew install solana"
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo -e "${YELLOW}Warning: Anchor not found in PATH${NC}"
    echo "Installing Anchor..."

    # Try to install Anchor using cargo
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force 2>/dev/null || {
        echo -e "${RED}Failed to install Anchor${NC}"
        echo "Manual installation: https://www.anchor-lang.com/docs/installation"
        exit 1
    }

    # Install latest Anchor
    $HOME/.cargo/bin/avm install latest
    $HOME/.cargo/bin/avm use latest

    # Add to PATH for this session
    export PATH="$HOME/.avm/bin:$PATH"
fi

# Set to devnet
echo -e "${GREEN}Configuring Solana for Devnet...${NC}"
solana config set --url devnet

# Get program keypair
PROGRAM_DIR="$(dirname "$0")/../solana-program"
DEPLOY_KEYPAIR="$PROGRAM_DIR/deploy-keypair.json"

if [ ! -f "$DEPLOY_KEYPAIR" ]; then
    echo -e "${YELLOW}Creating new deployment keypair...${NC}"
    solana-keygen new --no-bip39-passphrase --outfile "$DEPLOY_KEYPAIR" --silent
fi

# Get program ID
PROGRAM_ID=$(solana-keygen pubkey "$DEPLOY_KEYPAIR")
echo -e "${GREEN}Program ID: $PROGRAM_ID${NC}"

# Update Anchor.toml and lib.rs with program ID
sed -i '' "s/declare_id!(\"[^\"]*\")/declare_id!(\"$PROGRAM_ID\")/" "$PROGRAM_DIR/programs/batak-tournament/src/lib.rs"
sed -i '' "s/batak_tournament = \"[^\"]*\"/batak_tournament = \"$PROGRAM_ID\"/" "$PROGRAM_DIR/Anchor.toml"

# Check balance
echo -e "${GREEN}Checking wallet balance...${NC}"
BALANCE=$(solana balance)
echo "Balance: $BALANCE"

# Airdrop if needed (devnet only)
if [[ "$BALANCE" == "0 SOL" ]]; then
    echo -e "${YELLOW}Requesting airdrop...${NC}"
    solana airdrop 2 || {
        echo -e "${YELLOW}Airdrop failed. Using faucet...${NC}"
        echo "Visit: https://faucet.solana.com/"
        read -p "Press Enter after getting SOL..."
    }
fi

# Build program
echo -e "${GREEN}Building program...${NC}"
cd "$PROGRAM_DIR"

# Try standard anchor build
if anchor build; then
    echo -e "${GREEN}Build successful!${NC}"
else
    echo -e "${RED}Build failed. Trying alternative method...${NC}"

    # Alternative: Use cargo directly
    cd programs/batak-tournament
    cargo build-sbf || cargo build-bpf || {
        echo -e "${RED}Build failed. Please check Rust toolchain.${NC}"
        echo "Required: rustup install stable && rustup component add rust-src"
        exit 1
    }
    cd ../..
fi

# Deploy program
echo -e "${GREEN}Deploying to Devnet...${NC}"
anchor deploy --provider.cluster devnet || {
    echo -e "${RED}Deploy failed. Trying manual deployment...${NC}"

    # Get the program binary path
    PROGRAM_SO="target/deploy/batak_tournament.so"

    if [ ! -f "$PROGRAM_SO" ]; then
        echo -e "${RED}Program binary not found at $PROGRAM_SO${NC}"
        exit 1
    fi

    # Deploy manually
    solana program deploy "$PROGRAM_SO" --program-id "$DEPLOY_KEYPAIR"
}

echo ""
echo -e "${GREEN}=================================="
echo " DEPLOYMENT SUCCESSFUL!"
echo "==================================${NC}"
echo ""
echo "Program ID: $PROGRAM_ID"
echo "Cluster: Devnet"
echo ""
echo "Next steps:"
echo "1. Update server .env with PROGRAM_ID=$PROGRAM_ID"
echo "2. Test the program with: anchor test"
echo ""
