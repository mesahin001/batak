/**
 * Skor tablosu bileşeni.
 * En iyi oyuncuları listeler, oyuncu profiline yönlendirir.
 */

import React, { useState, useEffect } from 'react';
import { useSocket } from '../socket/SocketContext';
import { LeaderboardEntry } from '../types/game';
import './Leaderboard.css';

interface LeaderboardProps {
  onSelectPlayer: (publicKey: string) => void;
  onBack: () => void;
}

const RANK_LABELS: Record<number, { label: string; className: string }> = {
  1: { label: 'Gold', className: 'rank-gold' },
  2: { label: 'Silver', className: 'rank-silver' },
  3: { label: 'Bronze', className: 'rank-bronze' },
};

const Leaderboard: React.FC<LeaderboardProps> = ({ onSelectPlayer, onBack }) => {
  const { socket } = useSocket();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('get_leaderboard', { limit: 100 }, (data: any) => {
      setLoading(false);
      if (data.error) {
        setError(data.error);
      } else {
        setEntries(data.leaderboard || []);
      }
    });
  }, [socket]);

  const getWinRate = (entry: LeaderboardEntry): string => {
    if (entry.gamesPlayed === 0) return '0';
    return ((entry.gamesWon / entry.gamesPlayed) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="leaderboard">
        <div className="leaderboard-header">
          <button className="btn-back" onClick={onBack}>Back</button>
          <h1>Leaderboard</h1>
        </div>
        <div className="leaderboard-loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <button className="btn-back" onClick={onBack}>Geri</button>
        <h1>Skor Tablosu</h1>
      </div>

      <div className="leaderboard-content">
        {error && <div className="error-message">{error}</div>}

        {entries.length === 0 && !error ? (
          <div className="leaderboard-empty">
            <p>Henuz yeterli oyun oynanmadi.</p>
            <p>En az 3 oyun oynayan oyuncular burada gorunur.</p>
          </div>
        ) : (
          <div className="leaderboard-list">
            <div className="leaderboard-list-header">
              <span className="col-rank">#</span>
              <span className="col-name">Player</span>
              <span className="col-wins">Wins</span>
              <span className="col-rate">Win Rate</span>
              <span className="col-score">Points</span>
            </div>
            {entries.map((entry, index) => {
              const rank = RANK_LABELS[entry.rankTier] || RANK_LABELS[3];
              return (
                <div
                  key={entry.publicKey}
                  className={`leaderboard-item ${rank.className}`}
                  onClick={() => onSelectPlayer(entry.publicKey)}
                >
                  <span className="col-rank">
                    <span className={`rank-badge ${rank.className}`}>{index + 1}</span>
                  </span>
                  <span className="col-name">
                    <span className="player-name">{entry.username}</span>
                    {entry.nftsEarned > 0 && (
                      <span className="nft-count">{entry.nftsEarned} NFT</span>
                    )}
                  </span>
                  <span className="col-wins">{entry.gamesWon}/{entry.gamesPlayed}</span>
                  <span className="col-rate">%{getWinRate(entry)}</span>
                  <span className="col-score">{entry.currentSeasonPoints}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
