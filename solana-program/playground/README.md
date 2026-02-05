# Solana Playground Deployment Guide

## 🎮 Batak Tournament - Solana Devnet Deployment

### Step 1: Open Solana Playground

Go to: **https://solana.io/de**

### Step 2: Create New Project

1. Click **"Create"** → **"Blank Project"**
2. Name it: `batak-tournament`

### Step 3: Copy Program Code

1. Open the `lib.rs` file from this folder
2. Replace the entire content in `programs/batak-tournament/src/lib.rs` with our code
3. The program ID should be: `G84YncvRKxsWMXrmE2B9r4wucxUvC9cy7LTBCkBnycZa`

### Step 4: Copy Test Code

1. Open the `test.ts` file from this folder
2. Replace the content in `tests/batak-tournament.ts` with our test code

### Step 5: Build & Deploy

1. Click **"Build"** button (or press `Ctrl+B` / `Cmd+B`)
2. Wait for compilation to complete
3. Click **"Deploy"** button to deploy to Devnet
4. Copy the **Program ID** from deployment success message

### Step 6: Run Tests

1. Click **"Test"** button
2. All tests should pass ✅

### Step 7: Update Configuration

Update your server `.env` file with the deployed program ID:

```bash
PROGRAM_ID=<deployed_program_id_from_playground>
```

---

## 📋 Program Instructions

| Instruction | Description |
|-------------|-------------|
| `create_tournament` | Create new tournament (authority only) |
| `register_player` | Player joins tournament |
| `start_tournament` | Start tournament when 4 players ready |
| `submit_match_result` | Server submits winner (authority only) |
| `mint_compressed_nft_reward` | Mint cNFT to winner (authority only) |

---

## 🧪 Test Flow

```
1. Create Tournament (ID=1, Tier=Gold)
2. Register Player 1 ✅
3. Register Player 2 ✅
4. Register Player 3 ✅
5. Register Player 4 ✅
6. Register Player 5 ❌ (TournamentFull error)
7. Start Tournament ✅
8. Submit Match Result (Player 1 wins) ✅
9. Mint cNFT Reward ✅
10. Submit from non-authority ❌ (Unauthorized error)
```

---

## 🔗 Useful Links

- **Solana Explorer:** https://explorer.solana.com/?cluster=devnet
- **Solana Docs:** https://docs.solana.com/
- **Anchor Docs:** https://www.anchor-lang.com/docs

---

## 📝 Post-Deployment Checklist

- [ ] Program deployed to Devnet
- [ ] All tests passing
- [ ] Program ID saved to `.env`
- [ ] Server code updated with new Program ID
- [ ] Client code updated with new Program ID

---

## 🚀 Next Steps

1. Update server `TournamentManager.ts` with deployed Program ID
2. Test integration with game server
3. Create actual Merkle tree for cNFT minting
4. Upload NFT metadata to Arweave/Irys
