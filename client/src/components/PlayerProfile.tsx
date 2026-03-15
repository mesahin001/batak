/**
 * Oyuncu profili bileşeni.
 * Oyuncu istatistiklerini, son oyunlarını ve NFT ödüllerini gösterir.
 */

import React, { useState, useEffect } from 'react';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { LeaderboardEntry, GameHistoryEntry, NftRewardEntry } from '../types/game';
import './PlayerProfile.css';

interface PlayerProfileProps {
  publicKey: string;
  onBack: () => void;
}

const RANK_LABELS: Record<number, string> = {
  1: 'Gold',
  2: 'Silver',
  3: 'Bronze',
};

const RANK_CLASSES: Record<number, string> = {
  1: 'rank-gold',
  2: 'rank-silver',
  3: 'rank-bronze',
};

const TIER_LABELS: Record<number, string> = {
  1: 'Bronze',
  2: 'Silver',
  3: 'Gold',
};

const PlayerProfile: React.FC<PlayerProfileProps> = ({ publicKey, onBack }) => {
  const { socket } = useSocket();
  const { playerId: myPlayerId } = useAuth();
  const [player, setPlayer] = useState<LeaderboardEntry | null>(null);
  const [games, setGames] = useState<GameHistoryEntry[]>([]);
  const [nfts, setNfts] = useState<NftRewardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const isMyProfile = myPlayerId === publicKey;

  useEffect(() => {
    if (!socket) return;

    let loaded = 0;
    const checkDone = () => { if (++loaded >= 2) setLoading(false); };

    socket.emit('get_player_stats', { publicKey }, (data: any) => {
      if (data.player) setPlayer(data.player);
      if (data.nfts) setNfts(data.nfts);
      checkDone();
    });

    socket.emit('get_player_games', { publicKey, limit: 10 }, (data: any) => {
      if (data.games) setGames(data.games);
      checkDone();
    });
  }, [socket, publicKey]);

  const getWinRate = (): string => {
    if (!player || player.gamesPlayed === 0) return '0';
    return ((player.gamesWon / player.gamesPlayed) * 100).toFixed(1);
  };

  const getBidSuccessRate = (): string => {
    if (!player || player.totalBidsMade === 0) return '0';
    return ((player.bidsSuccessful / player.totalBidsMade) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="player-profile">
        <div className="profile-header">
          <button className="btn-back" onClick={onBack}>Back</button>
          <h1>Player Profile</h1>
        </div>
        <div className="profile-loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="player-profile">
        <div className="profile-header">
          <button className="btn-back" onClick={onBack}>Back</button>
          <h1>Player Profile</h1>
        </div>
        <div className="profile-loading">
          <p>Player not found.</p>
        </div>
      </div>
    );
  }

  const rankClass = RANK_CLASSES[player.rankTier] || 'rank-bronze';
  const rankLabel = RANK_LABELS[player.rankTier] || 'Bronze';

  return (
    <div className="player-profile">
      <div className="profile-header">
        <button className="btn-back" onClick={onBack}>Geri</button>
        <h1>{isMyProfile ? 'My Profile' : 'Player Profile'}</h1>
      </div>

      <div className="profile-content">
        {/* Player Info */}
        <div className="profile-card profile-info-card">
          <div className={`profile-rank-badge ${rankClass}`}>{rankLabel}</div>
          <h2 className="profile-name">{player.username}</h2>
          <p className="profile-pk">{publicKey.slice(0, 8)}...{publicKey.slice(-4)}</p>
          <p className="profile-season-points">{player.currentSeasonPoints} Season Points</p>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-value">{player.gamesPlayed}</span>
            <span className="stat-label">Games</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{player.gamesWon}</span>
            <span className="stat-label">Wins</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">%{getWinRate()}</span>
            <span className="stat-label">Win Rate</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{player.nftsEarned}</span>
            <span className="stat-label">NFT</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{player.totalTricksWon}</span>
            <span className="stat-label">Trick</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">%{getBidSuccessRate()}</span>
            <span className="stat-label">Bid Success</span>
          </div>
        </div>

        {/* Score Range */}
        <div className="profile-card">
          <h3>Score Range</h3>
          <div className="score-range">
            <div className="score-range-item">
              <span className="score-range-label">Best</span>
              <span className="score-range-value good">{player.bestScore}</span>
            </div>
            <div className="score-range-item">
              <span className="score-range-label">Total</span>
              <span className="score-range-value">{player.totalScore}</span>
            </div>
            <div className="score-range-item">
              <span className="score-range-label">Worst</span>
              <span className="score-range-value bad">{player.worstScore}</span>
            </div>
          </div>
        </div>

        {/* Recent Games */}
        {games.length > 0 && (
          <div className="profile-card">
            <h3>Recent Games</h3>
            <div className="games-list">
              {games.map((game) => {
                const isWinner = game.winnerPk === publicKey;
                return (
                  <div key={game.id} className={`game-item ${isWinner ? 'win' : 'loss'}`}>
                    <span className="game-result">{isWinner ? 'W' : 'L'}</span>
                    <span className="game-mode">{game.gameMode === 'koz_maca' ? 'Koz Maca' : 'Ihaleli'}</span>
                    <span className="game-rounds">{game.totalRounds} rounds</span>
                    {game.completedAt && (
                      <span className="game-date">
                        {new Date(game.completedAt).toLocaleDateString('en-US')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* NFT Rewards */}
        {nfts.length > 0 && (
          <div className="profile-card">
            <h3>NFT Rewards</h3>
            <div className="nft-list">
              {nfts.map((nft, index) => (
                <div key={index} className="nft-item">
                  <span className={`nft-tier tier-${nft.tier}`}>
                    {TIER_LABELS[nft.tier] || 'Bronze'}
                  </span>
                  <span className="nft-status">
                    {nft.onChainMinted ? 'Minted' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProfile;
