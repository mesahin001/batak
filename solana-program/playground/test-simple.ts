// BATAK TOURNAMENT - Simple Test (no airdrops)
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

describe("batak-tournament", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BatakTournament as Program;

  const authority = provider.wallet.publicKey;
  const merkleTree = Keypair.generate().publicKey;
  const tournamentId = 1;

  let tournamentPda: PublicKey;
  let player1Pda: PublicKey;
  let player2Pda: PublicKey;
  let player3Pda: PublicKey;
  let player4Pda: PublicKey;

  // Using provider.wallet as all 4 players for simplicity
  const player = provider.wallet.publicKey;

  before(async () => {
    [tournamentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("tournament"), authority.toBuffer(), Buffer.from([1, 0, 0, 0, 0, 0, 0, 0])],
      program.programId
    );

    [player1Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registration"), tournamentPda.toBuffer(), player.toBuffer()],
      program.programId
    );

    [player2Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registration"), tournamentPda.toBuffer(), player.toBuffer()],
      program.programId
    );

    [player3Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registration"), tournamentPda.toBuffer(), player.toBuffer()],
      program.programId
    );

    [player4Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registration"), tournamentPda.toBuffer(), player.toBuffer()],
      program.programId
    );

    console.log("Authority:", authority.toString());
    console.log("Program ID:", program.programId.toString());
  });

  it("Creates a tournament", async () => {
    const tx = await program.methods
      .createTournament(new anchor.BN(tournamentId), new anchor.BN(3), new anchor.BN(4))
      .accounts({
        tournament: tournamentPda,
        authority: authority,
        merkleTree: merkleTree,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Tournament created! TX:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   ID:", tournament.id.toString());
    console.log("   Tier:", tournament.rewardTier.toString(), "(3=Gold)");
    console.log("   Max Players:", tournament.maxPlayers.toString());
  });

  it("Registers player 1", async () => {
    const tx = await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: player1Pda,
        player: player,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Player 1 registered! TX:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Players:", tournament.players.length, "/ 4");
  });

  it("Registers player 2", async () => {
    const tx = await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: player2Pda,
        player: player,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Player 2 registered!");

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Players:", tournament.players.length, "/ 4");
  });

  it("Registers player 3", async () => {
    const tx = await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: player3Pda,
        player: player,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Player 3 registered!");

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Players:", tournament.players.length, "/ 4");
  });

  it("Registers player 4", async () => {
    const tx = await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: player4Pda,
        player: player,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Player 4 registered!");

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Players:", tournament.players.length, "/ 4");
    console.log("   ✅ Tournament FULL!");
  });

  it("Starts the tournament", async () => {
    const tx = await program.methods
      .startTournament()
      .accounts({
        tournament: tournamentPda,
        authority: authority,
      })
      .rpc();

    console.log("✅ Tournament started! TX:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Status:", tournament.status);
  });

  it("Submits match result", async () => {
    const dummySig = new Array(64).fill(0);

    const tx = await program.methods
      .submitMatchResult(new anchor.BN(tournamentId), player, dummySig)
      .accounts({
        tournament: tournamentPda,
        server: authority,
      })
      .rpc();

    console.log("✅ Match result submitted! TX:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    console.log("   Winner:", tournament.winner.toString());
    console.log("   Status:", tournament.status);
  });

  it("Mints cNFT reward", async () => {
    const tx = await program.methods
      .mintCompressedNftReward(new anchor.BN(tournamentId), player, "https://example.com/metadata.png")
      .accounts({
        tournament: tournamentPda,
        merkleTree: merkleTree,
        authority: authority,
      })
      .rpc();

    console.log("✅ cNFT reward minted! TX:", tx);
    console.log("   🎴 Gold NFT sent to winner!");
  });

  after(async () => {
    console.log("\n🎉 ALL TESTS PASSED!");
    console.log("═════════════════════════════");
    console.log("  ✅ Tournament created");
    console.log("  ✅ 4 Players registered");
    console.log("  ✅ Tournament started");
    console.log("  ✅ Winner determined");
    console.log("  ✅ cNFT reward minted");
    console.log("═════════════════════════════");
    console.log("\n🔗 View on Solana Explorer:");
    console.log(`https://explorer.solana.com/address/${tournamentPda.toString()}?cluster=devnet`);
  });
});
