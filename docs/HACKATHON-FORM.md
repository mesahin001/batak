# CLOCK IN hackathon: submission form answers

Portal deadline: 13.10.2026 01:59. Facts below were checked on 2026-10-11.

## Simple fields
| Field | Answer |
|---|---|
| Project title | Batak Tournament |
| Prior VC/angel funding | NO (confirm) |
| Built in the last 3 months? | NO. First commit 27 Jan 2026 (mobile client 9 Feb 2026; 27 of 145 commits are from the last 3 months). Fill in the porting answer below. |
| Won a previous hackathon with this project? | N/A (write it if Monolith applies) |
| Android APK URL | https://batakci.xyz/downloads/batak.apk (v1.0.9, package xyz.batakci.tournament, signed release; https://batakci.xyz/download serves the same file) |
| Repository URL | https://github.com/mesahin001/batak |
| Demo video URL | https://youtu.be/G3VXIUEaQgU (must be Unlisted or Public) |
| Deck URL | Upload `demo/batak_pitch_deck.pptx` to Drive, share "anyone with the link" |

## Porting question: major features / new mobile development
> Batak Tournament started in January 2026 as a server-authoritative web game. Since then we built a dedicated native Android client with React Native/Expo for Solana Mobile. Mobile-specific work: Mobile Wallet Adapter integration (one-tap wallet login with an Ed25519-signed challenge, so the wallet public key is the player's permanent identity), on-device signing for tournament actions, a touch-first portrait game UI with haptics, an 11-language interface (Turkish, English, Arabic, Japanese and more), reconnect-safe sessions for flaky mobile networks, an in-app update check, and a signed release APK distributed through our own site and prepared for the Solana dApp Store. We tested the full flow on a Seeker: wallet login, a complete game against bots, and an automatically minted compressed-NFT trophy on mainnet. For production we also added signed wallet handshakes, strict socket payload validation, per-wallet rate limiting, an ownership test suite, and a mint budget that protects the server wallet and the Merkle tree.

"If no..." field: **See previous answer (ported app).**

## SKR integration
> Yes. Players can create SKR-staked private tournament rooms. The app reads the player's SKR balance on mainnet, lets them pick a stake, and has the wallet approve it through Mobile Wallet Adapter. The winner receives a compressed-NFT trophy minted to their wallet via Metaplex Bubblegum on mainnet. The SKR stake flow is at prototype stage: the stake approval is signed in the wallet, while on-chain escrow and automatic payout of the pot are on our roadmap.

Only keep "reads the player's SKR balance" if the balance shows correctly on the phone (fixed in 1.0.8, not yet confirmed by the developer).

## Pitch (if the form asks)
> Batak is Turkey's most beloved trick-taking card game, played by tens of millions. Batak Tournament brings it to Solana Mobile: real-time 4-player matches (humans plus smart bots so a table is never empty), a wallet-as-identity login with no account creation, and compressed-NFT trophies minted to winners. Your wallet is your profile, your history and your trophy case.

## Be careful
- Do not write "live in the dApp Store". The listing is archived and waiting on Solana Mobile support. Say "submission to the dApp Store in progress" only if a request is actually pending.
- Networks: game and auth run on devnet, cNFT minting and the SKR balance on mainnet. Say so if asked.
- Trophy mints are capped (2 per wallet, 8 per day) because the Merkle tree has 32 leaves. Judges can still mint one.
- The demo video was recorded on a Seeker with v1.0.7/1.0.8. Mention the version only if the form asks.
