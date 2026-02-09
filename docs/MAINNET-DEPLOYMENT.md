# Mainnet Deployment Guide

This guide covers deploying the Batak Tournament game to Solana Mainnet.

## Pre-Mainnet Checklist

### Security & Preparation
- [ ] Complete security audit of smart contract
- [ ] Complete penetration testing of server
- [ ] Create new mainnet keypair (NEVER reuse devnet keys!)
- [ ] Set up separate mainnet infrastructure (staging environment)
- [ ] Document all environment variables
- [ ] Create mainnet deployment runbook
- [ ] Prepare rollback plan

### Financial Preparation
- [ ] Fund mainnet wallet with 2-5 SOL for:
  - Program deployment (~1-2 SOL)
  - Merkle tree creation (~0.01 SOL)
  - Transaction fees during testing (~0.5 SOL)
  - Buffer for unexpected costs (~1-2 SOL)

---

## Step 1: Create Mainnet Keypair

**IMPORTANT:** Never reuse your devnet keypair for mainnet!

```bash
# Create new mainnet keypair
solana-keygen new -o mainnet-keypair.json

# Set as default keypair
solana config set --keypair mainnet-keypair.json

# Fund the wallet (send 2-5 SOL from your exchange or existing wallet)
# Check balance
solana balance
```

**Security Best Practices:**
- Store the keypair securely (hardware wallet recommended for production)
- Keep backups in multiple secure locations
- Never commit keypairs to git
- Add `mainnet-keypair.json` to `.gitignore`

---

## Step 2: Deploy Anchor Program to Mainnet

### 2.1 Update Anchor.toml

Add a mainnet section to your `solana-program/Anchor.toml`:

```toml
[toolchain]

[features]
seeds = false
skip-lint = false

[programs.localnet]
batak_tournament = "5ZdgoyBDknoZ8tDYMDXf8zCUQ7FxuaDbK4QffAgSfA9h"

[programs.devnet]
batak_tournament = "5ZdgoyBDknoZ8tDYMDXf8zCUQ7FxuaDbK4QffAgSfA9h"

[programs.mainnet]
batak_tournament = "YOUR_NEW_PROGRAM_ID_HERE"  # Will be set after deployment

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Devnet"
wallet = "test-keypair.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

### 2.2 Deploy to Mainnet

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Verify configuration
solana config get

# Deploy program (this will cost real SOL!)
anchor deploy --provider.cluster mainnet

# Save the new program ID
# Example output: Program ID: YOUR_NEW_PROGRAM_ID_HERE
```

### 2.3 Verify Deployment

```bash
# Verify on Solana Explorer
# Open: https://explorer.solana.com/address/YOUR_NEW_PROGRAM_ID_HERE

# Check program is deployed
solana program show YOUR_NEW_PROGRAM_ID_HERE
```

---

## Step 3: Create Merkle Tree on Mainnet

### 3.1 Switch to Mainnet

```bash
solana config set --url mainnet-beta
```

### 3.2 Create Bubblegum Merkle Tree

Using Metaplex CLI (if available):

```bash
# Install Metaplex CLI if needed
npm install -g @metaplex-foundation/cli

# Create the tree
# depth=14 (supports up to 16,384 cNFTs)
# canopyDepth=14 (allows proof verification without storing all changelogs)
metaplex bubblegum create-tree \
  --depth 14 \
  --canopy-depth 14 \
  --fee-payer mainnet-keypair.json
```

Or use a custom script (create `/server/src/solana/createTree.ts`):

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { TreeConfig } from '@metaplex-foundation/mpl-bubblegum';

async function createMainnetTree() {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const payer = Keypair.fromSecretKey(
    // Load your mainnet keypair
  );

  // Create tree
  const tree = await TreeConfig.create(connection, payer, {
    depth: 14,
    canopyDepth: 14,
  });

  console.log('Tree address:', tree.address.toBase58());
}

createMainnetTree();
```

### 3.3 Save Tree Address

Save the tree address to your environment variables:

```bash
MERKLE_TREE=YOUR_TREE_ADDRESS_HERE
```

---

## Step 4: Update Server Configuration

### 4.1 Update .env.production

Create or update `.env.production`:

```bash
# Server Configuration
NODE_ENV=production
PORT=3001

# Solana Mainnet Configuration
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Or use a paid RPC for better reliability:
# SOLANA_RPC_URL=https://your-quicknode-endpoint.solana-mainnet.quiknode.pro/KEY/

# Program Configuration
PROGRAM_ID=YOUR_NEW_MAINNET_PROGRAM_ID
MERKLE_TREE=YOUR_TREE_ADDRESS_HERE

# Security
JWT_SECRET=your-strong-random-secret-here-use-openssl-rand-base64-32

# Bot Configuration
DEFAULT_BOT_DIFFICULTY=normal
DEFAULT_BOT_COUNT=3
```

### 4.2 Remove Devnet-Only Code

Search your codebase for and remove:

```typescript
// ❌ REMOVE: Devnet airdrops
await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);

// ❌ REMOVE: Devnet-specific test code
if (network === 'devnet') {
  // devnet-only logic
}
```

### 4.3 Add Mainnet Guards

Create `/server/src/solana/MainnetGuard.ts`:

```typescript
export class MainnetGuard {
  static validateTransaction(costLamports: number, walletBalance: number): boolean {
    // Ensure wallet has sufficient balance
    return walletBalance > costLamports * 2; // 2x safety margin
  }

  static async trackCost(playerId: string, costLamports: number): Promise<void> {
    // Track per-player transaction costs
    // Implement rate limiting
  }

  static isMainnet(network: string): boolean {
    return network === 'mainnet-beta';
  }
}
```

---

## Step 5: Testing on Mainnet

### 5.1 Deploy to Staging

```bash
# Deploy with mainnet config to staging environment
docker-compose -f docker-compose.staging.yml up -d
```

### 5.2 Test with Small Amounts

1. Create test tournaments
2. Verify cNFT minting (real SOL cost!)
3. Test wallet connections
4. Verify all game flows work
5. Test leaderboard updates
6. Test auth flows

### 5.3 Load Testing

```bash
# Test with 50+ concurrent games
# Monitor RPC usage
# Monitor transaction costs
# Check for rate limits
```

---

## Step 6: Production Deployment

### 6.1 Schedule Deployment

- Choose low-traffic hours
- Announce maintenance window to users
- Prepare rollback plan

### 6.2 Deploy

```bash
# Build and deploy
docker-compose up -d

# Or using traditional deployment:
npm run build
pm2 restart batak-server
```

### 6.3 Monitor Closely

```bash
# Check health endpoint
curl https://s.batakci.xyz/health

# Monitor logs
docker logs -f batak-server

# Or PM2 logs
pm2 logs batak-server
```

### 6.4 Rollback Plan (if needed)

```bash
# Roll back to devnet
docker-compose down
# Update .env to use devnet
docker-compose up -d
```

---

## Step 7: Post-Launch Monitoring

### 7.1 Monitor Transaction Costs

Track these metrics:
- Average cost per cNFT mint
- Total daily transaction costs
- RPC usage (requests per day)
- Failed transactions

### 7.2 Optimize RPC Usage

If you hit rate limits:

```bash
# Upgrade to paid RPC provider
# Options:
# - QuickNode: https://www.quicknode.com
# - Alchemy: https://www.alchemy.com
# - Helius: https://helius.xyz
# - Triton: https://triton.one
```

### 7.3 Monitor cNFT Minting

Track:
- Success rate
- Failed mints (and reason)
- Average mint time
- Tree capacity (14-depth = ~16,384 cNFTs)

### 7.4 Gather User Feedback

- Create feedback channels
- Monitor social media
- Track bug reports
- Update documentation

---

## Environment Variables Reference

### Required for Mainnet

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `SOLANA_NETWORK` | Solana network | `mainnet-beta` |
| `SOLANA_RPC_URL` | RPC endpoint | `https://api.mainnet-beta.solana.com` |
| `PROGRAM_ID` | Anchor program ID | `YourProgramIdHere` |
| `MERKLE_TREE` | Bubblegum tree address | `YourTreeAddressHere` |
| `JWT_SECRET` | JWT signing secret | `Use-openssl-rand-base64-32` |

### Optional but Recommended

| Variable | Description | Example |
|----------|-------------|---------|
| `DEFAULT_BOT_DIFFICULTY` | Default bot level | `normal` |
| `DEFAULT_BOT_COUNT` | Default bot count | `3` |
| `COST_TRACKING_ENABLED` | Enable cost tracking | `true` |
| `RATE_LIMIT_ENABLED` | Enable rate limiting | `true` |

---

## Mainnet vs Devnet Differences

| Feature | Devnet | Mainnet |
|---------|--------|---------|
| SOL Cost | Free (airdrops) | Real SOL |
| Transaction Finality | ~1 second | ~1 second |
| RPC Reliability | Good (public) | Varies (consider paid) |
| Airdrops | Available | Not available |
| Program Deployment | Free | ~1-2 SOL |
| cNFT Minting | Free | ~$0.00001 each |

---

## Common Issues & Solutions

### Issue 1: Insufficient Funds

**Error:** `Attempt to debit an account but found no record of a credit`

**Solution:**
```bash
# Check balance
solana balance

# Fund wallet if needed
# Send SOL from exchange or existing wallet
```

### Issue 2: RPC Rate Limits

**Error:** `429 Too Many Requests`

**Solution:**
- Upgrade to paid RPC provider
- Implement request caching
- Reduce polling frequency

### Issue 3: Tree Capacity Full

**Error:** `Tree is full`

**Solution:**
- Create new merkle tree
- Update `MERKLE_TREE` environment variable
- Restart server

### Issue 4: Program ID Mismatch

**Error:** `Program account not found`

**Solution:**
- Verify `PROGRAM_ID` in .env matches deployed program
- Check program is deployed to correct network
- Run `solana program show YOUR_PROGRAM_ID`

---

## Security Checklist

### Pre-Launch
- [ ] New mainnet keypair created (not reused from devnet)
- [ ] Keypair stored securely (hardware wallet recommended)
- [ ] JWT_SECRET is strong and unique
- [ ] No test code or debug endpoints exposed
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (CSP headers)

### Post-Launch
- [ ] Monitor for unusual activity
- [ ] Track transaction costs daily
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Have incident response plan

---

## Cost Estimation

### One-Time Costs
- Program deployment: ~1-2 SOL
- Merkle tree creation: ~0.01 SOL

### Per-Transaction Costs
- cNFT mint: ~$0.00001 (varies with network congestion)
- Tournament creation: ~$0.0005
- Game result submission: ~$0.0001

### Monthly Costs (Estimated)
- RPC (free tier): $0
- RPC (paid): $50-200/month
- VPS: €5-50/month
- Database: $0-50/month (SQLite vs managed)
- Total: €5-300/month

---

## Support & Resources

- Solana Docs: https://docs.solana.com/
- Anchor Framework: https://www.anchor-lang.com/
- Metaplex Docs: https://docs.metaplex.com/
- Solana Cookbook: https://solanacookbook.com/

---

## Appendix: Quick Reference

### Useful Commands

```bash
# Check Solana version
solana --version

# Check configuration
solana config get

# Get balance
solana balance

# Get program info
solana program show PROGRAM_ID

# Monitor logs
docker logs -f batak-server

# Health check
curl https://s.batakci.xyz/health

# Switch networks
solana config set --url mainnet-beta
solana config set --url devnet
```

### Important Addresses

- Mainnet Explorer: https://explorer.solana.com/
- Devnet Explorer: https://explorer.solana.com/?cluster=devnet
- Solana Beach: https://solanabeach.io/

---

**Last Updated:** February 2026
**Version:** 1.0.0
