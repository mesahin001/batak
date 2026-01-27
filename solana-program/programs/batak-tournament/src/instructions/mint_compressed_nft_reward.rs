use anchor_lang::prelude::*;

use crate::state::{Tournament, TournamentStatus};
use crate::error::BatakTournamentError;

#[derive(Accounts)]
#[instruction(tournament_id: u64)]
pub struct MintCompressedNftReward<'info> {
    #[account(
        mut,
        seeds = [
            b"tournament",
            tournament.authority.key().as_ref(),
            &tournament_id.to_le_bytes()
        ],
        bump = tournament.bump
    )]
    pub tournament: Account<'info, Tournament>,

    /// Merkle tree account for compressed NFTs
    /// This would be a Bubblegum tree account
    pub merkle_tree: UncheckedAccount<'info>,

    pub authority: Signer<'info>,
}

pub fn handler(
    ctx: Context<MintCompressedNftReward>,
    tournament_id: u64,
    winner: Pubkey,
    _metadata_uri: String,
) -> Result<()> {
    let tournament = &ctx.accounts.tournament;
    let authority = ctx.accounts.authority.key();

    // Verify caller is the tournament authority
    if tournament.authority != authority {
        return Err(BatakTournamentError::Unauthorized.into());
    }

    // Check tournament is completed
    if tournament.status != TournamentStatus::Completed {
        return Err(BatakTournamentError::InvalidTournamentState.into());
    }

    // Verify winner
    if tournament.winner != Some(winner) {
        return Err(BatakTournamentError::Unauthorized.into());
    }

    // NOTE: In production, this would call the Bubblegum program
    // to mint the compressed NFT. For MVP, we're just recording
    // the intent. The actual minting happens server-side using
    // the Bubblegum SDK.

    msg!("cNFT reward minted: Tournament={}, Winner={}",
        tournament_id, winner);

    Ok(())
}
