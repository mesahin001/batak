# Batak Tournament Game - NFT Rewards on Solana

A complete multiplayer Turkish Batak card game with Compressed NFT (cNFT) rewards on Solana, targeting Solana Seeker (Android) via PWA→APK approach.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Game Rules](#game-rules)
- [Solana Integration](#solana-integration)
- [Development](#development)
- [Deployment](#deployment)
- [APK Build](#apk-build)
- [Environment Variables](#environment-variables)
- [Testing](#testing)

## Features

- **Multiplayer Gameplay:** 4 players per table (humans + bots)
- **Bot AI:** Three difficulty levels (Easy, Normal, Hard)
- **Server-Authoritative:** All game logic validated on server
- **cNFT Rewards:** Compressed NFTs for tournament winners (~100x cheaper)
- **Mobile-First:** Optimized for Android with Solana Seeker support
- **PWA Support:** Install as app on mobile devices

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Client** | React + Phaser.js + Socket.IO Client |
| **Server** | Node.js + TypeScript + Express + Socket.IO |
| **Blockchain** | Solana Devnet + Anchor + Metaplex Bubblegum |
| **Packaging** | Bubblewrap (PWA → APK) |

## Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   React +       │  ────────────▶  │   Node.js       │
│   Phaser PWA    │                  │   Game Server   │
└─────────────────┘                  └────────┬────────┘
      │                                     │
      │                                     ▼
      │ Solana Tx                    ┌──────────────┐
      ▼                              │   Solana     │
┌─────────────┐                      │   Devnet     │
│   Solana    │                      └──────────────┘
│   Seeker    │                              │
│   Wallet    │                              ▼
└─────────────┘                      ┌──────────────┐
                                     │  Anchor +    │
                                     │  Bubblegum   │
                                     │  (cNFTs)     │
                                     └──────────────┘
```

## Project Structure

```
batak/
├── client/                      # PWA Client
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── Lobby.tsx
│   │   │   ├── GameRoom.tsx
│   │   │   └── TournamentResults.tsx
│   │   ├── phaser/              # Game engine
│   │   │   ├── scenes/
│   │   │   │   └── GameScene.ts
│   │   │   ├── objects/
│   │   │   │   ├── Card.ts
│   │   │   │   └── PlayerArea.ts
│   │   │   └── utils/
│   │   ├── solana/              # Wallet integration
│   │   │   └── WalletContext.tsx
│   │   ├── socket/              # WebSocket client
│   │   │   └── SocketContext.tsx
│   │   └── types/               # TypeScript types
│   └── package.json
│
├── server/                      # Game Server
│   ├── src/
│   │   ├── game/                # Game logic
│   │   │   ├── GameStateMachine.ts
│   │   │   ├── Card.ts
│   │   │   ├── Deck.ts
│   │   │   ├── Player.ts
│   │   │   ├── TurnValidator.ts
│   │   │   └── Scoring.ts
│   │   ├── bots/                # AI opponents
│   │   │   ├── BatakBot.ts
│   │   │   ├── HandAnalyzer.ts
│   │   │   └── strategies/
│   │   │       ├── EasyStrategy.ts
│   │   │       ├── NormalStrategy.ts
│   │   │       └── HardStrategy.ts
│   │   ├── socket/              # WebSocket server
│   │   │   └── SocketServer.ts
│   │   ├── solana/              # Blockchain integration
│   │   │   ├── SolanaClient.ts
│   │   │   ├── TournamentManager.ts
│   │   │   ├── CNFTMinter.ts
│   │   │   └── MerkleTreeManager.ts
│   │   └── server.ts            # Entry point
│   └── package.json
│
├── solana-program/              # Anchor Smart Contract
│   └── programs/
│       └── batak-tournament/
│           └── src/
│               ├── lib.rs
│               ├── state.rs
│               ├── instructions/
│               └── error.rs
│
├── metadata/                    # NFT Metadata
│   ├── nft-metadata.json
│   └── ai-prompts.txt           # Image generation prompts
│
├── scripts/                     # Utility Scripts
│   ├── bubblewrap-build.sh      # APK build
│   ├── deploy.sh                # Deployment
│   └── local-dev.sh             # Local development
│
└── README.md
```

## Quick Start

### Prerequisites

```bash
# Node.js 18+
node --version

# Rust (for Anchor)
rustc --version

# Anchor CLI
anchor --version

# Solana CLI
solana --version
```

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/batak.git
cd batak

# Install dependencies (using the helper script)
chmod +x scripts/local-dev.sh
./scripts/local-dev.sh

# Or manually:
cd server && npm install
cd ../client && npm install
```

### Local Development

```bash
# Start everything with the helper script
./scripts/local-dev.sh

# Or manually:
# Terminal 1 - Server
cd server && npm run dev

# Terminal 2 - Client
cd client && npm run dev
```

## Game Rules

### Batak Overview

Batak is a Turkish trick-taking card game for 4 players. The game has two main variants:

### Game Modes

**Koz Maça (Trump Jack):**
- Spades (♠) is always trump
- Players bid only trick count (1-13)
- Highest cumulative score wins
- Play all rounds (no early ending)

**İhaleli Batak (Auction Batak):**
- Players bid both suit (as trump) AND trick count
- Lowest cumulative score wins
- First to reach ≤1 wins early
- More competitive/strategic

### Game Flow

1. **LOBBY:** Players wait for 4 participants (humans + bots)
2. **DEALING:** Each player receives 13 cards
3. **BIDDING:** Players bid number of tricks (1-13)
   - Koz Maça: Bid trick count only (spades always trump)
   - İhaleli Batak: Select suit, then bid trick count
4. **PLAYING:** 13 tricks are played
5. **SCORING:** Scores calculated based on bids and tricks won

### Card Ranking

High to Low: **A → K → Q → J → 10 → 9 → 8 → 7 → 6 → 5 → 4 → 3 → 2**

### Play Rules

- Must follow suit if possible
- Trump suit beats non-trump
- Highest trump wins, or highest card of lead suit

### Scoring

| Result | Score Formula | Example |
|--------|--------------|---------|
| Made bid or MORE | `10 × bid + (tricks_won - bid)` | Bid 7, take 9 → 72 points |
| Failed bid | `-10 × bid` | Bid 7, take 5 → -70 points |
| No bid (passed) | `tricks_won × 10` | No bid, take 3 → 30 points |
| El almaz (no tricks) | +50 if 0 tricks, -50 if any | Success → +50 |

### Multi-Round Games

- Games consist of 5, 7, 9, or 11 rounds
- Cumulative score tracked across all rounds
- İhaleli Batak: First to ≤1 wins immediately
- Koz Maça: Highest score after all rounds wins

## Solana Integration

### Compressed NFTs (cNFT)

Uses Metaplex Bubblegum for cost-effective minting:

| Feature | cNFT | Standard NFT |
|---------|------|--------------|
| Cost per mint | ~$0.0001 | ~$0.02 |
| Storage | Merkle tree | Individual account |
| Transfer | Standard | Standard |

### Instructions

| Instruction | Purpose |
|-------------|---------|
| `create_tournament` | Create new tournament |
| `register_player` | Register player |
| `submit_match_result` | Submit verified result |
| `mint_compressed_nft_reward` | Mint cNFT to winner |

### NFT Metadata

```json
{
  "name": "Batak Champion 🥇 - Season 1",
  "symbol": "BTK",
  "description": "Winner of Tournament #1234",
  "attributes": [
    { "trait_type": "Tournament ID", "value": "1234" },
    { "trait_type": "Date", "value": "2025-01-26" },
    { "trait_type": "Rank", "value": "1st Place" },
    { "trait_type": "Prize Tier", "value": "Gold" }
  ]
}
```

## Development

### Server Development

```bash
cd server
npm run dev    # Start with hot reload
npm run build  # Build TypeScript
npm test       # Run tests
```

### Client Development

```bash
cd client
npm run dev     # Start Vite dev server
npm run build   # Build for production
npm run preview # Preview production build
```

### Solana Program Development

```bash
cd solana-program
anchor build      # Build program
anchor test       # Run tests
anchor deploy     # Deploy to devnet
```

## Deployment

### Server (Render/Railway)

1. Push code to GitHub
2. Connect repository to Render/Railway
3. Configure:
   - **Root:** `./server`
   - **Build:** `npm run build`
   - **Start:** `npm run start`
4. Set environment variables

### Client (Vercel)

```bash
cd client
npm install -g vercel
vercel --prod
```

Or via Vercel dashboard:
1. Import GitHub repository
2. Configure:
   - **Root:** `./client`
   - **Build:** `npm run build`
   - **Output:** `./dist`

### Solana Program

```bash
# Configure for devnet
solana config set --url devnet

# Deploy
anchor deploy

# Save program ID
export PROGRAM_ID=$(anchor keys list)
```

## APK Build

### Prerequisites

```bash
# Install Bubblewrap
npm install -g @bubblewrap/cli

# Install Java JDK 11+
java -version
```

### Build Steps

```bash
# Make script executable
chmod +x scripts/bubblewrap-build.sh

# Build APK (requires client running on localhost:5173)
./scripts/bubblewrap-build.sh
```

### Solana Seeker Integration

The APK includes:
- Deep-linking support for wallet connection
- Related application declaration
- Mobile-optimized UI

## Environment Variables

### Server (.env)

```bash
PORT=3001

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=[base58 encoded key]
SOLANA_NETWORK=devnet

# Program Configuration
PROGRAM_ID=[your program ID]
MERKLE_TREE=[merkle tree address]

# Game Configuration
MAX_PLAYERS=4
DEFAULT_BOT_DIFFICULTY=normal
GAME_TIMEOUT=300000
```

### Client (.env)

```bash
VITE_SERVER_URL=ws://localhost:3001
VITE_SOLANA_NETWORK=devnet
VITE_PROGRAM_ID=[your program ID]
VITE_DEFAULT_BOT_DIFFICULTY=normal
VITE_DEFAULT_BOT_COUNT=3
```

## Testing

### Unit Tests

```bash
# Server tests
cd server && npm test

# Solana program tests
cd solana-program && anchor test
```

### Manual Testing

1. **Local Multiplayer:** Open 4 browser tabs
2. **Bot Games:** 1 human + 3 bots
3. **cNFT Minting:** Test on devnet
4. **APK Testing:** Install on Android device

### Test Checklist

- [ ] Wallet connection (Phantom, Solana Seeker)
- [ ] Matchmaking with bots
- [ ] Bidding phase
- [ ] Card play validation
- [ ] Scoring calculation
- [ ] cNFT minting
- [ ] APK installation
- [ ] Deep-linking

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/your-username/batak/issues)
- Discord: [Join our Discord](https://discord.gg/batak)

---

**Built with ❤️ for the Solana ecosystem**
