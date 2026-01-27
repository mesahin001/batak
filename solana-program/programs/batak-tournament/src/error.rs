use anchor_lang::prelude::*;

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
