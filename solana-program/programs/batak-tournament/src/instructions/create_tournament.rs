use anchor_lang::prelude::*;

use crate::state::{Tournament, TournamentStatus};
use crate::error::BatakTournamentError;

#[derive(Accounts)]
#[instruction(tournament_id: u64)]
pub struct CreateTournament<'info> {
    #[account(
        init,
        payer = authority,
        space = Tournament::MAX_SIZE,
        seeds = [
            b"tournament",
            authority.key().as_ref(),
            &tournament_id.to_le_bytes()
        ],
        bump
    )]
    pub tournament: Account<'info, Tournament>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub merkle_tree: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateTournament>,
    tournament_id: u64,
    reward_tier: u64,
    max_players: u64,
) -> Result<()> {
    let tournament = &mut ctx.accounts.tournament;
    let authority = ctx.accounts.authority.key();
    let merkle_tree = ctx.accounts.merkle_tree.key();
    let bump = ctx.bumps.tournament;

    // Validate reward tier (1=Bronze, 2=Silver, 3=Gold)
    if reward_tier == 0 || reward_tier > 3 {
        return Err(BatakTournamentError::InvalidRewardTier.into());
    }

    // Validate max players (must be 4 for MVP)
    if max_players != 4 {
        return Err(BatakTournamentError::InvalidTournamentState.into());
    }

    // Initialize tournament
    *tournament = Tournament::new(
        authority,
        tournament_id,
        0, // entry_fee (0 for MVP)
        reward_tier,
        max_players,
        merkle_tree,
        bump,
    );

    msg!("Tournament created: ID={}, Tier={}, MaxPlayers={}",
        tournament_id, reward_tier, max_players);

    Ok(())
}
