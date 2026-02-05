// This is your Solana program's entry point
// Batak Tournament Program with cNFT Rewards

use anchor_lang::prelude::*;

mod error;
mod instructions;
mod state;

use instructions::*;

declare_id!("5ZdgoyBDknoZ8tDYMDXf8zCUQ7FxuaDbK4QffAgSfA9h");

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
        instructions::create_tournament::handler(ctx, tournament_id, reward_tier, max_players)
    }

    /// Register a player for a tournament
    pub fn register_player(
        ctx: Context<RegisterPlayer>,
        tournament_id: u64,
    ) -> Result<()> {
        instructions::register_player::handler(ctx, tournament_id)
    }

    /// Submit match result (server-signed only)
    pub fn submit_match_result(
        ctx: Context<SubmitMatchResult>,
        tournament_id: u64,
        winner: Pubkey,
        server_signature: [u8; 64],
    ) -> Result<()> {
        instructions::submit_match_result::handler(ctx, tournament_id, winner, server_signature)
    }

    /// Mint compressed NFT reward to winner
    pub fn mint_compressed_nft_reward(
        ctx: Context<MintCompressedNftReward>,
        tournament_id: u64,
        winner: Pubkey,
        metadata_uri: String,
    ) -> Result<()> {
        instructions::mint_compressed_nft_reward::handler(ctx, tournament_id, winner, metadata_uri)
    }
}
