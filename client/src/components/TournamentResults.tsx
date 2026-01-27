/**
 * Turnuva sonuçları bileşeni.
 * Final skorları, tur geçmişi ve cNFT ödül claim arayüzünü gösterir.
 */

import React from 'react';
import { useWallet } from '../solana/WalletContext';
import { GameCompleteData } from '../types/game';
import './TournamentResults.css';

interface TournamentResultsProps {
  results: GameCompleteData;
  onBackToLobby: () => void;
}

const TournamentResults: React.FC<TournamentResultsProps> = ({ results, onBackToLobby }) => {
  const { publicKey } = useWallet();
  const [claimingReward, setClaimingReward] = React.useState(false);
  const [rewardClaimed, setRewardClaimed] = React.useState(false);

  // In Batak, the winner is the player with the LOWEST score (≤1 wins immediately)
  const winner = results.players.find(p => p.id === results.winner);
  const isWinner = results?.winner?.toLowerCase() === publicKey?.toString().toLowerCase();

  const handleClaimReward = async () => {
    setClaimingReward(true);
    try {
      // In production, would call Solana program to mint cNFT
      await new Promise(resolve => setTimeout(resolve, 2000));
      setRewardClaimed(true);
    } catch (error) {
      console.error('Failed to claim reward:', error);
    }
    setClaimingReward(false);
  };

  // Sort players by total score (lowest first - Batak rules)
  const sortedPlayers = [...results.players].sort((a, b) => a.totalScore - b.totalScore);

  return (
    <div className="tournament-results">
      <div className="results-container">
        <div className="results-header">
          <h1>
            {isWinner ? '🏆 Victory!' : 'Game Over'}
          </h1>
          <p className="winner-name">
            {results.winnerName} wins!
          </p>
          <p className="winner-score">
            Final Score: {winner?.totalScore ?? 0}
          </p>
        </div>

        <div className="results-content">
          {/* Final Rankings */}
          <div className="score-card">
            <h2>Final Rankings</h2>
            <p className="ranking-note">Lowest score wins in Batak!</p>
            <div className="scores-list">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`score-item ${player.id === results?.winner ? 'winner' : ''}`}
                >
                  <div className="score-rank">#{index + 1}</div>
                  <div className="score-info">
                    <span className="player-name">{player.name}</span>
                    <span className="player-type">
                      {player.type === 'bot' ? '🤖' : '👤'}
                    </span>
                  </div>
                  <div className="score-value">
                    <span className="total-score">{player.totalScore}</span>
                    <span className="score-breakdown">
                      {player.roundScores.map((s, i) => (
                        <span key={i} className={`round-score ${s < 0 ? 'negative' : ''}`}>
                          R{i + 1}: {s}
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Round History */}
          {results.roundHistory && results.roundHistory.length > 0 && (
            <div className="round-history-card">
              <h2>Round History</h2>
              <div className="round-history-list">
                {results.roundHistory.map((round) => (
                  <div key={round.roundNumber} className="round-history-item">
                    <h4>Round {round.roundNumber}</h4>
                    <div className="round-scores">
                      {round.scores.map((score, i) => {
                        const player = results.players.find(p => {
                          // Match player by comparing round scores array
                          return p.roundScores[round.roundNumber - 1] === score;
                        });
                        return (
                          <div key={i} className="round-score-entry">
                            <span className="player-name">{player?.name || `Player ${i + 1}`}</span>
                            <span className={`score ${score < 0 ? 'negative' : ''}`}>{score}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NFT Reward */}
          {isWinner && !rewardClaimed && (
            <div className="reward-card">
              <div className="reward-icon">🎁</div>
              <h3>Claim Your Reward</h3>
              <p>You've won a Compressed NFT!</p>
              <button
                className="btn-primary w-full"
                onClick={handleClaimReward}
                disabled={claimingReward}
              >
                {claimingReward ? (
                  <>
                    <div className="spinner"></div>
                    Minting NFT...
                  </>
                ) : (
                  'Claim cNFT Reward'
                )}
              </button>
            </div>
          )}

          {rewardClaimed && (
            <div className="reward-card success">
              <div className="reward-icon">✅</div>
              <h3>Reward Claimed!</h3>
              <p>Your NFT has been minted to your wallet.</p>
            </div>
          )}
        </div>

        <div className="results-actions">
          <button className="btn-primary w-full" onClick={onBackToLobby}>
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default TournamentResults;
