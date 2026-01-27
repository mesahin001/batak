use anchor_lang::prelude::*;

use crate::state::{Tournament, TournamentStatus};
use crate::error::BatakTournamentError;

#[derive(Accounts)]
#[instruction(tournament_id: u64)]
pub struct SubmitMatchResult<'info> {
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

    pub server: Signer<'info>,
}

pub fn handler(
    ctx: Context<SubmitMatchResult>,
    tournament_id: u64,
    winner: Pubkey,
    _server_signature: [u8; 64],
) -> Result<()> {
    let tournament = &mut ctx.accounts.tournament;
    let server = ctx.accounts.server.key();

    // Verify server is the tournament authority
    if tournament.authority != server {
        return Err(BatakTournamentError::Unauthorized.into());
    }

    // Check tournament status
    if tournament.status != TournamentStatus::InProgress {
        return Err(BatakTournamentError::InvalidTournamentState.into());
    }

    // Verify winner is a registered player
    if !tournament.players.contains(&winner) {
        return Err(BatakTournamentError::Unauthorized.into());
    }

    // Update tournament
    tournament.status = TournamentStatus::Completed;
    tournament.winner = Some(winner);

    msg!("Match result submitted: Tournament={}, Winner={}",
        tournament_id, winner);

    Ok(())
}
