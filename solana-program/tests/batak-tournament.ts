import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BatakTournament } from "../target/types/batak_tournament";
import { assert } from "chai";

describe("batak-tournament", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BatakTournament as Program<BatakTournament>;
  const authority = provider.wallet as anchor.Wallet;

  let tournamentId = 1;
  let tournamentPda: anchor.web3.PublicKey;
  let merkleTree: anchor.web3.Keypair;

  before(() => {
    // Derive tournament PDA
    [tournamentPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("tournament"),
        authority.publicKey.toBuffer(),
        Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]), // tournament_id as le_bytes
      ],
      program.programId
    );

    // Create mock merkle tree keypair
    merkleTree = anchor.web3.Keypair.generate();
  });

  it("Creates a tournament", async () => {
    const tx = await program.methods
      .createTournament(
        new anchor.BN(tournamentId),
        new anchor.BN(1), // reward tier (bronze)
        new anchor.BN(4)  // max players
      )
      .accounts({
        tournament: tournamentPda,
        authority: authority.publicKey,
        merkleTree: merkleTree.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Create tournament transaction:", tx);

    const tournamentAccount = await program.account.tournament.fetch(tournamentPda);
    assert.equal(tournamentAccount.id.toNumber(), tournamentId);
    assert.equal(tournamentAccount.rewardTier.toNumber(), 1);
    assert.equal(tournamentAccount.maxPlayers.toNumber(), 4);
    assert.equal(tournamentAccount.players.length, 0);
  });

  it("Registers a player", async () => {
    const player = anchor.web3.Keypair.generate();

    // Derive registration PDA
    const [registrationPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("registration"),
        tournamentPda.toBuffer(),
        player.publicKey.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .registerPlayer(new anchor.BN(tournamentId))
      .accounts({
        tournament: tournamentPda,
        registration: registrationPda,
        player: player.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    console.log("Register player transaction:", tx);

    const tournamentAccount = await program.account.tournament.fetch(tournamentPda);
    assert.equal(tournamentAccount.players.length, 1);
    assert.equal(tournamentAccount.players[0].toBase58(), player.publicKey.toBase58());
  });

  it("Submits match result", async () => {
    const winner = anchor.web3.Keypair.generate().publicKey;
    const serverSignature = new Array(64).fill(0);

    const tx = await program.methods
      .submitMatchResult(
        new anchor.BN(tournamentId),
        winner,
        serverSignature
      )
      .accounts({
        tournament: tournamentPda,
        server: authority.publicKey,
      })
      .rpc();

    console.log("Submit match result transaction:", tx);

    const tournamentAccount = await program.account.tournament.fetch(tournamentPda);
    assert.ok(tournamentAccount.winner);
    assert.equal(tournamentAccount.winner.toBase58(), winner.toBase58());
  });

  it("Fails to create tournament with invalid reward tier", async () => {
    const invalidId = 999;
    const [invalidPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("tournament"),
        authority.publicKey.toBuffer(),
        Buffer.from([999, 0, 0, 0, 0, 0, 0, 0]),
      ],
      program.programId
    );

    try {
      await program.methods
        .createTournament(
          new anchor.BN(invalidId),
          new anchor.BN(5), // invalid tier (> 3)
          new anchor.BN(4)
        )
        .accounts({
          tournament: invalidPda,
          authority: authority.publicKey,
          merkleTree: merkleTree.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      assert.fail("Should have thrown error");
    } catch (err) {
      assert.include(err.toString(), "InvalidRewardTier");
    }
  });
});
