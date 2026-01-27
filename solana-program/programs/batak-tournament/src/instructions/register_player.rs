use anchor_lang::prelude::*;

use crate::state::{Tournament, TournamentStatus, PlayerRegistration};
use crate::error::BatakTournamentError;

#[derive(Accounts)]
#[instruction(tournament_id: u64)]
pub struct RegisterPlayer<'info> {
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

    #[account(
        init,
        payer = player,
        space = PlayerRegistration::MAX_SIZE,
        seeds = [
            b"registration",
            tournament.key().as_ref(),
            player.key().as_ref()
        ],
        bump
    )]
    pub registration: Account<'info, PlayerRegistration>,

    #[account(mut)]
    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RegisterPlayer>,
    tournament_id: u64,
) -> Result<()> {
    let tournament = &mut ctx.accounts.tournament;
    let player = ctx.accounts.player.key();
    let registration = &mut ctx.accounts.registration;
    let bump = ctx.bumps.registration;

    // Check tournament status
    if tournament.status != TournamentStatus::Open {
        return Err(BatakTournamentError::TournamentAlreadyStarted.into());
    }

    // Check if tournament is full
    if tournament.players.len() as u64 >= tournament.max_players {
        return Err(BatakTournamentError::TournamentFull.into());
    }

    // Check if player already registered
    if tournament.players.contains(&player) {
        return Err(BatakTournamentError::PlayerAlreadyRegistered.into());
    }

    // Add player to tournament
    tournament.players.push(player);

    // Create registration record
    *registration = PlayerRegistration {
        player,
        tournament_id,
        registered_at: Clock::get()?.unix_timestamp,
        bump,
    };

    msg!("Player registered: Tournament={}, Player={}",
        tournament_id, player);

    Ok(())
}
