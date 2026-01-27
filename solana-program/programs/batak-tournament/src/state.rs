use anchor_lang::prelude::*;

/// Tournament account
#[account]
pub struct Tournament {
    /// Authority (server wallet)
    pub authority: Pubkey,
    /// Unique tournament identifier
    pub id: u64,
    /// Entry fee in lamports (0 for MVP)
    pub entry_fee: u64,
    /// Reward tier (1=Bronze, 2=Silver, 3=Gold)
    pub reward_tier: u64,
    /// Maximum number of players
    pub max_players: u64,
    /// Registered players
    pub players: Vec<Pubkey>,
    /// Tournament status
    pub status: TournamentStatus,
    /// Winner's public key
    pub winner: Option<Pubkey>,
    /// Bubblegum Merkle tree address
    pub merkle_tree: Pubkey,
    /// Creation timestamp
    pub created_at: i64,
    /// Bump seed for PDA
    pub bump: u8,
}

impl Tournament {
    /// Maximum tournament size
    pub const MAX_SIZE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 32 * 4 + 1 + 33 + 32 + 8 + 1;

    /// Create new tournament
    pub fn new(
        authority: Pubkey,
        id: u64,
        entry_fee: u64,
        reward_tier: u64,
        max_players: u64,
        merkle_tree: Pubkey,
        bump: u8,
    ) -> Self {
        Self {
            authority,
            id,
            entry_fee,
            reward_tier,
            max_players,
            players: Vec::new(),
            status: TournamentStatus::Open,
            winner: None,
            merkle_tree,
            created_at: Clock::get()?.unix_timestamp,
            bump,
        }
    }
}

/// Tournament status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum TournamentStatus {
    Open = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3,
}

/// Player registration account
#[account]
pub struct PlayerRegistration {
    /// Player's public key
    pub player: Pubkey,
    /// Tournament ID
    pub tournament_id: u64,
    /// Registration timestamp
    pub registered_at: i64,
    /// Bump seed
    pub bump: u8,
}

impl PlayerRegistration {
    pub const MAX_SIZE: usize = 32 + 8 + 8 + 1;
}
