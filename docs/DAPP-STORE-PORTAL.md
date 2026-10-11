# dApp Store portal: new app "Batak Tournament" (xyz.batakci.tournament)

Resubmission as a NEW app, as Solana Mobile support instructed (the archived listing keeps
com.bataktournament.mobile; same publisher profile, no new KYC). Prepared 2026-10-11.

## Release files
| Field | Value |
|---|---|
| Package name | `xyz.batakci.tournament` (checked free in the portal) |
| Version name / code | 1.0.9 / 10 |
| APK to upload | `~/toolchain/work/dist/batak-1.0.9-dappstore.apk` (store update channel) |
| SHA-256 | `93926f6236e9ea31eb8bd1288a3f90f58e2bd0ba33ccb78a3f25c1fa92fe5143` |
| Signing cert SHA-256 | `da218ee3ad4e6ff99171bf727c86f4b2fcdd06fd43454994f70f91334c3368da` |
| Publisher wallet | `CxXwpFuPiMDnB3TrdCNVvRu5UZ9m94LokESeBTAf2HHs` |
| Cost | about 0.2 SOL in the publisher wallet (fee + ArDrive upload) |

Do not upload `batak-1.0.9-sideload.apk`; it offers its own APK as an update.
Keep the same keystore for every later release of this package.

## App fields
**App name:** Batak Tournament

**Short description (80 chars max):**
> Turkey's favorite card game with wallet login and cNFT trophies.

**Long description:**
> Batak Tournament brings Turkey's most popular trick-taking card game to Solana Mobile. Play 4-player Batak against real players or smart bots in two classic modes: Koz Maça and İhaleli Batak.
>
> • Wallet login: sign in with a Mobile Wallet Adapter wallet such as Seeker. Your wallet is your player identity, with no password to remember. Email sign-up is also available.
> • cNFT trophies: win a full game and a compressed NFT trophy is minted to your wallet on Solana mainnet. Trophy mints are limited per wallet and per day.
> • Bots on three difficulty levels, so a table is never empty.
> • Private rooms: invite friends with a room code.
> • Leaderboards and player profiles.
> • SKR tournament rooms (experimental): read your SKR balance and approve a stake in your wallet. On-chain escrow and automatic payout are not built yet.
> • 11 languages, including Turkish and English.
>
> Gameplay is server-authoritative: hands stay hidden and every move is validated on the server. Game and sign-in run on Solana devnet; trophies and the SKR balance use mainnet.

**What's new (release notes):**
> First release. Wallet login with Mobile Wallet Adapter, 4-player Batak against bots or players, and compressed-NFT trophies.
(also in `mobile/config.yaml` as `new_in_version`)

**Testing instructions for reviewers:**
> 1. Install the APK and open the app. Tap "Connect wallet" and approve the request in a Mobile Wallet Adapter wallet (Seeker or any MWA wallet). No funds are needed to sign in. Email sign-up is an alternative.
> 2. From the lobby tap "Play" to join the queue. A match against bots starts after the matchmaking wait.
> 3. Play a full game (Koz Maça or İhaleli Batak). Rules are in the in-app help.
> 4. Winning a complete game mints a compressed NFT trophy to the connected wallet (Solana mainnet). To protect the server wallet, trophies are capped at 2 per wallet per day and 8 per day overall; if the cap is hit, the game still completes normally.
> 5. The SKR tournament button opens a stake dialog. It is optional, needs SKR in the wallet, and is a prototype (no escrow).
> The server is https://batakci.xyz (health: /health). No test account is needed.

**Category / tags:** Games (card). Tags: card game, multiplayer, turkish, nft, solana.

## URLs
| Field | Value |
|---|---|
| Website | https://batakci.xyz |
| Privacy policy | https://batakci.xyz/privacy.html |
| License | https://batakci.xyz/legal/license/ |
| Copyright | https://batakci.xyz/legal/copyright/ |
| Contact | info@batakci.xyz |

## Images (in `demo/`)
| Slot | File | Size |
|---|---|---|
| Icon | `icon_512.png` | 512x512 |
| Banner | `dapp_store_banner.png` | 1200x600 |
| Featured graphic | `editors_choice_graphic.png` | 1200x1200 |
| Screenshots | `lobby.png`, `nft.png`, `gameplay.png`, `skr.png` | portrait 1200x2670, `gameplay` landscape |

These screenshots date from March 2026. Replace them with fresh phone screenshots of v1.0.9
(login, lobby, a hand in play, trophy) if the UI changed. `skr.png` shows the experimental SKR
stake; drop it if it looks like a finished feature.

## Before pressing Submit
- Install `batak-1.0.9-sideload.apk` on the phone first: wallet login, one bot game, a mint.
  The store APK differs only in the update channel.
- Check the listing says "experimental" for SKR and does not claim escrow or payouts.
- Review takes 3-5 business days; it will not finish before the hackathon deadline (13.10.2026 01:59).
  Say "dApp Store submission in progress" in the hackathon form only after submitting.
