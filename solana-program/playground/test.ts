// BATAK TOURNAMENT - Test Suite for Solana Playground
// Copy this to tests.ts in playground

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BatakTournament } from "../target/types/batak_tournament";
import { assert } from "chai";

describe("batak-tournament", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BatakTournament as Program<BatakTournament>;

  // Test accounts
  let authority: anchor.web3.Keypair;
  let merkleTree: anchor.web3.PublicKey;
  let tournamentId = 1;

  // Players
  let player1: anchor.web3.Keypair;
  let player2: anchor.web3.Keypair;
  let player3: anchor.web3.Keypair;
  let player4: anchor.web3.Keypair;

  // PDAs
  let tournamentPda: anchor.web3.PublicKey;
  let registrationPda1: anchor.web3.PublicKey;
  let registrationPda2: anchor.web3.PublicKey;
  let registrationPda3: anchor.web3.PublicKey;
  let registrationPda4: anchor.web3.PublicKey;

  before(async () => {
    // Generate test accounts
    authority = anchor.web3.Keypair.generate();
    player1 = anchor.web3.Keypair.generate();
    player2 = anchor.web3.Keypair.generate();
    player3 = anchor.web3.Keypair.generate();
    player4 = anchor.web3.Keypair.generate();

    // Create fake merkle tree account (not used in MVP)
    merkleTree = anchor.web3.Keypair.generate().publicKey;

    // Airdrop SOL to test accounts
    await Promise.all([
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(authority.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(player1.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(player2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(player3.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
      ),
      provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(player4.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
      ),
    ]);

    // Derive PDAs
    [tournamentPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("tournament"),
        authority.publicKey.toBuffer(),
        Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]), // tournament_id = 1
      ],
      program.programId
    );

    [registrationPda1] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("registration"),
        tournamentPda.toBuffer(),
        player1.publicKey.toBuffer(),
      ],
      program.programId
    );

    [registrationPda2] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("registration"),
        tournamentPda.toBuffer(),
        player2.publicKey.toBuffer(),
      ],
      program.programId
    );

    [registrationPda3] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("registration"),
        tournamentPda.toBuffer(),
        player3.publicKey.toBuffer(),
      ],
      program.programId
    );

    [registrationPda4] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("registration"),
        tournamentPda.toBuffer(),
        player4.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  it("Creates a tournament", async () => {
    const tx = await program.methods
      .createTournament(
        new anchor.BN(tournamentId),
        new anchor.BN(3), // Gold tier
        new anchor.BN(4)  // 4 players
      )
      .accounts({
        tournament: tournamentPda,
        authority: authority.publicKey,
        merkleTree: merkleTree,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    console.log("Create tournament tx:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    assert.equal(tournament.id.toNumber(), tournamentId);
    assert.equal(tournament.rewardTier.toNumber(), 3);
    assert.equal(tournament.maxPlayers.toNumber(), 4);
    assert.equal(tournament.players.length, 0);
  });

  it("Registers player 1", async () => {
    const tx = await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: registrationPda1,
        player: player1.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player1])
      .rpc();

    console.log("Register player 1 tx:", tx);

    const tournament = await program.account.tournament.fetch(tournamentPda);
    assert.equal(tournament.players.length, 1);
    assert.equal(tournament.players[0].toString(), player1.publicKey.toString());
  });

  it("Registers player 2", async () => {
    await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: registrationPda2,
        player: player2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player2])
      .rpc();

    const tournament = await program.account.tournament.fetch(tournamentPda);
    assert.equal(tournament.players.length, 2);
  });

  it("Registers player 3", async () => {
    await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: registrationPda3,
        player: player3.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player3])
      .rpc();

    const tournament = await program.account.tournament.fetch(tournamentPda);
    assert.equal(tournament.players.length, 3);
  });

  it("Registers player 4", async () => {
    await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: registrationPda4,
        player: player4.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player4])
      .rpc();

    const tournament = await program.account.tournament.fetch(tournamentPda);
    assert.equal(tournament.players.length, 4);
  });

  it("Fails to register when tournament is full", async () => {
    const extraPlayer = anchor.web3.Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(extraPlayer.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
    );

    const [extraRegistration] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("registration"),
        tournamentPda.toBuffer(),
        extraPlayer.publicKey.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .registerPlayer(new anchor.BN(tournamentId))
        .accounts({
          tournament: tournamentPda,
          registration: extraRegistration,
          player: extraPlayer.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([extraPlayer])
        .rpc();
      assert.fail("Should have failed");
    } catch (err) {
      assert.include(err.toString(), "TournamentFull");
    }
  });

  it("Starts the tournament", async () => {
    await program.methods
      .startTournament()
      .accounts({
        tournament: tournamentPda,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();

    const tournament = await program.account.tournament.fetch(tournamentPda);
    assert.equal(tournament.status, {}); // InProgress enum
  });

  it("Submits match result", async () => {
    const dummySignature = new Array(64).fill(0);

    await program.methods
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

    const tournament = await program.account.tournament.fetch(tournamentPda);
    assert.equal(tournament.winner.toString(), player1.publicKey.toString());
  });

  it("Mints cNFT reward", async () => {
    await program.methods
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

    console.log("cNFT reward minted successfully!");
  });

  it("Fails to submit result from non-authority", async () => {
    const dummySignature = new Array(64).fill(0);

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
      assert.fail("Should have failed");
    } catch (err) {
      assert.include(err.toString(), "Unauthorized");
    }
  });
});
