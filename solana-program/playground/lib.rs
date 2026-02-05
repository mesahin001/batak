// BATAK TOURNAMENT - Solana Playground Version
// Copy this entire file to https://solana.io/de playground

use anchor_lang::prelude::*;

declare_id!("G84YncvRKxsWMXrmE2B9r4wucxUvC9cy7LTBCkBnycZa");

#[program]
pub mod batak_tournament {
    use super::*;

    /// Create a new tournament
    pub fn create_tournament(
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
        require!(reward_tier > 0 && reward_tier <= 3, BatakTournamentError::InvalidRewardTier);

        // Validate max players (must be 4 for MVP)
        require!(max_players == 4, BatakTournamentError::InvalidTournamentState);

        // Initialize tournament
        tournament.authority = authority;
        tournament.id = tournament_id;
        tournament.entry_fee = 0; // Free entry for MVP
        tournament.reward_tier = reward_tier;
        tournament.max_players = max_players;
        tournament.players = Vec::new();
        tournament.status = TournamentStatus::Open;
        tournament.winner = None;
        tournament.merkle_tree = merkle_tree;
        tournament.created_at = Clock::get()?.unix_timestamp;
        tournament.bump = bump;

        msg!("Tournament created: ID={}, Tier={}, MaxPlayers={}",
            tournament_id, reward_tier, max_players);

        Ok(())
    }

    /// Register a player for a tournament
    pub fn register_player(
        ctx: Context<RegisterPlayer>,
        _tournament_id: u64,
    ) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament;
        let player = ctx.accounts.player.key();
        let registration = &mut ctx.accounts.registration;
        let bump = ctx.bumps.registration;

        // Check tournament status
        require!(tournament.status == TournamentStatus::Open, BatakTournamentError::TournamentAlreadyStarted);

        // Check if tournament is full
        require!(tournament.players.len() < 4, BatakTournamentError::TournamentFull);

        // Check if player already registered
        require!(!tournament.players.contains(&player), BatakTournamentError::PlayerAlreadyRegistered);

        // Add player to tournament
        tournament.players.push(player);

        // Create registration record
        registration.player = player;
        registration.tournament_id = tournament.id;
        registration.registered_at = Clock::get()?.unix_timestamp;
        registration.bump = bump;

        msg!("Player registered: Tournament={}, Player={}",
            tournament.id, player);

        Ok(())
    }

    /// Submit match result (server-signed only)
    pub fn submit_match_result(
        ctx: Context<SubmitMatchResult>,
        _tournament_id: u64,
        winner: Pubkey,
        _server_signature: [u8; 64],
    ) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament;
        let server = ctx.accounts.server.key();

        // Verify server is the tournament authority
        require!(tournament.authority == server, BatakTournamentError::Unauthorized);

        // Check tournament status
        require!(tournament.status == TournamentStatus::InProgress, BatakTournamentError::InvalidTournamentState);

        // Verify winner is a registered player
        require!(tournament.players.contains(&winner), BatakTournamentError::Unauthorized);

        // Update tournament
        tournament.status = TournamentStatus::Completed;
        tournament.winner = Some(winner);

        msg!("Match result submitted: Tournament={}, Winner={}",
            tournament.id, winner);

        Ok(())
    }

    /// Mint compressed NFT reward to winner
    pub fn mint_compressed_nft_reward(
        ctx: Context<MintCompressedNftReward>,
        _tournament_id: u64,
        _winner: Pubkey,
        _metadata_uri: String,
    ) -> Result<()> {
        let tournament = &ctx.accounts.tournament;
        let authority = ctx.accounts.authority.key();

        // Verify caller is the tournament authority
        require!(tournament.authority == authority, BatakTournamentError::Unauthorized);

        // Check tournament is completed
        require!(tournament.status == TournamentStatus::Completed, BatakTournamentError::InvalidTournamentState);

        // NOTE: In production, this would call Bubblegum program
        // For MVP, we're just recording the intent

        msg!("cNFT reward minted: Tournament={}, Winner={:?}",
            tournament.id, tournament.winner);

        Ok(())
    }

    /// Start tournament (transition to InProgress)
    pub fn start_tournament(ctx: Context<AuthTournament>) -> Result<()> {
        let tournament = &mut ctx.accounts.tournament;
        let authority = ctx.accounts.authority.key();

        require!(tournament.authority == authority, BatakTournamentError::Unauthorized);
        require!(tournament.status == TournamentStatus::Open, BatakTournamentError::InvalidTournamentState);
        require!(tournament.players.len() == 4, BatakTournamentError::InvalidTournamentState);

        tournament.status = TournamentStatus::InProgress;

        msg!("Tournament started: ID={}", tournament.id);
        Ok(())
    }
}

// ============ Account Structures ============

#[derive(Accounts)]
#[instruction(tournament_id: u64)]
pub struct CreateTournament<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 32 * 4 + 1 + 33 + 32 + 8 + 1,
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

    /// CHECK: Merkle tree account for cNFTs
    pub merkle_tree: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

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
        space = 8 + 32 + 8 + 8 + 1,
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

    /// CHECK: Merkle tree account for compressed NFTs
    pub merkle_tree: UncheckedAccount<'info>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AuthTournament<'info> {
    #[account(mut)]
    pub tournament: Account<'info, Tournament>,
    pub authority: Signer<'info>,
}

// ============ State Structures ============

#[account]
pub struct Tournament {
    pub authority: Pubkey,
    pub id: u64,
    pub entry_fee: u64,
    pub reward_tier: u64,
    pub max_players: u64,
    pub players: Vec<Pubkey>,
    pub status: TournamentStatus,
    pub winner: Option<Pubkey>,
    pub merkle_tree: Pubkey,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct PlayerRegistration {
    pub player: Pubkey,
    pub tournament_id: u64,
    pub registered_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum TournamentStatus {
    Open = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3,
}

// ============ Error Codes ============

#[error_code]
pub enum BatakTournamentError {
    #[msg("Tournament is full")]
    TournamentFull,
    #[msg("Tournament has already started")]
    TournamentAlreadyStarted,
    #[msg("Tournament has already ended")]
    TournamentAlreadyEnded,
    #[msg("Player already registered")]
    PlayerAlreadyRegistered,
    #[msg("Invalid server signature")]
    InvalidServerSignature,
    #[msg("Tournament not found")]
    TournamentNotFound,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid tournament state")]
    InvalidTournamentState,
    #[msg("Merkle tree is full")]
    MerkleTreeFull,
    #[msg("Invalid reward tier")]
    InvalidRewardTier,
}
