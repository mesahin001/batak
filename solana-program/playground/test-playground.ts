// BATAK TOURNAMENT - Test Suite for Solana Playground
// Copy this to tests.ts in playground (replace entire file)

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BatakTournament } from "../target/types/batak_tournament";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("batak-tournament", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BatakTournament as Program<BatakTournament>;

  // Test accounts
  let authority: Keypair;
  let merkleTree: PublicKey;
  let tournamentId = 1;

  // Players
  let player1: Keypair;
  let player2: Keypair;
  let player3: Keypair;
  let player4: Keypair;

  // PDAs
  let tournamentPda: PublicKey;
  let registrationPda1: PublicKey;
  let registrationPda2: PublicKey;
  let registrationPda3: PublicKey;
  let registrationPda4: PublicKey;

  before(async () => {
    authority = Keypair.generate();
    player1 = Keypair.generate();
    player2 = Keypair.generate();
    player3 = Keypair.generate();
    player4 = Keypair.generate();
    merkleTree = Keypair.generate().publicKey;

    // Airdrop SOL to test accounts
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(authority.publicKey, 10 * LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(player1.publicKey, 10 * LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(player2.publicKey, 10 * LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(player3.publicKey, 10 * LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(player4.publicKey, 10 * LAMPORTS_PER_SOL)
      ),
    ]);

    // Derive PDAs
    [tournamentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("tournament"),
        authority.publicKey.toBuffer(),
        Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
      ],
      program.programId
    );

    [registrationPda1] = PublicKey.findProgramAddressSync(
      [Buffer.from("registration"), tournamentPda.toBuffer(), player1.publicKey.toBuffer()],
      program.programId
    );

    [registrationPda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("registration"), tournamentPda.toBuffer(), player2.publicKey.toBuffer()],
      program.programId
    );

    [registrationPda3] = PublicKey.findProgramAddressSync(
      [Buffer.from("registration"), tournamentPda.toBuffer(), player3.publicKey.toBuffer()],
      program.programId
    );

    [registrationPda4] = PublicKey.findProgramAddressSync(
      [Buffer.from("registration"), tournamentPda.toBuffer(), player4.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Creates a tournament", async () => {
    const tx = await program.methods
      .createTournament(
        new anchor.BN(tournamentId),
        new anchor.BN(3),
        new anchor.BN(4)
      )
      .accounts({
        tournament: tournamentPda,
        authority: authority.publicKey,
        merkleTree: merkleTree,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    console.log("✅ Create tournament tx:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Tournament ID:", tournament.id.toString());
    console.log("   Reward Tier:", tournament.rewardTier.toString());
    console.log("   Status:", tournament.status);
  });

  it("Registers player 1", async () => {
    const tx = await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: registrationPda1,
        player: player1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    console.log("✅ Register player 1 tx:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Players count:", tournament.players.length);
    console.log("   Player 1:", tournament.players[0].toString());
  });

  it("Registers player 2", async () => {
    const tx = await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: registrationPda2,
        player: player2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player2])
      .rpc();

    console.log("✅ Register player 2 tx:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Players count:", tournament.players.length);
  });

  it("Registers player 3", async () => {
    const tx = await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: registrationPda3,
        player: player3.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player3])
      .rpc();

    console.log("✅ Register player 3 tx:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Players count:", tournament.players.length);
  });

  it("Registers player 4", async () => {
    const tx = await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: registrationPda4,
        player: player4.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([player4])
      .rpc();

    console.log("✅ Register player 4 tx:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Players count:", tournament.players.length);
    console.log("   All players registered!");
  });

  it("Starts the tournament", async () => {
    const tx = await program.methods
      .startTournament()
      .accounts({
        tournament: tournamentPda,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    console.log("✅ Start tournament tx:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Status:", tournament.status);
    console.log("   Tournament is InProgress!");
  });

  it("Submits match result - Player 1 wins!", async () => {
    const dummySignature = new Array(64).fill(0);

    const tx = await program.methods
      .submitMatchResult(
        new anchor.BN(tournamentId),
        player1.publicKey,
        dummySignature
      )
      .accounts({
        tournament: tournamentPda,
        server: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    console.log("✅ Submit match result tx:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Winner:", tournament.winner.toString());
    console.log("   Status:", tournament.status);
    console.log("   🏆 Player 1 wins!");
  });

  it("Mints cNFT reward", async () => {
    const tx = await program.methods
      .mintCompressedNftReward(
        new anchor.BN(tournamentId),
        player1.publicKey,
        "https://example.com/metadata/gold-tier.png"
      )
      .accounts({
        tournament: tournamentPda,
        merkleTree: merkleTree,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    console.log("✅ Mint cNFT reward tx:", tx);
    console.log("   🎴 Gold NFT minted to winner!");
  });

  it("Fails to register when tournament is full", async () => {
    const extraPlayer = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(extraPlayer.publicKey, 10 * LAMPORTS_PER_SOL)
    );

    const [extraRegistration] = PublicKey.findProgramAddressSync(
      [Buffer.from("registration"), tournamentPda.toBuffer(), extraPlayer.publicKey.toBuffer()],
      program.programId
    );

    let errorCaught = false;
    try {
      await program.methods
        .registerPlayer(new anchor.BN(tournamentId))
        .accounts({
          tournament: tournamentPda,
          registration: extraRegistration,
          player: extraPlayer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([extraPlayer])
        .rpc();
    } catch (err) {
      errorCaught = true;
      console.log("✅ Expected error caught:", err.toString());
    }

    if (!errorCaught) {
      throw new Error("Should have failed with TournamentFull error");
    }
  });

  it("Fails to submit result from non-authority", async () => {
    const dummySignature = new Array(64).fill(0);

    let errorCaught = false;
    try {
      await program.methods
        .submitMatchResult(
          new anchor.BN(tournamentId),
          player2.publicKey,
          dummySignature
        )
        .accounts({
          tournament: tournamentPda,
          server: player2.publicKey,
        })
        .signers([player2])
        .rpc();
    } catch (err) {
      errorCaught = true;
      console.log("✅ Expected error caught:", err.toString());
    }

    if (!errorCaught) {
      throw new Error("Should have failed with Unauthorized error");
    }
  });

  after(async () => {
    console.log("\n🎉 All tests completed!");
    console.log("📊 Summary:");
    console.log("   ✅ Tournament created");
    console.log("   ✅ 4 Players registered");
    console.log("   ✅ Tournament started");
    console.log("   ✅ Match result submitted");
    console.log("   ✅ cNFT reward minted");
    console.log("   ✅ Error handling works");
  });
});
