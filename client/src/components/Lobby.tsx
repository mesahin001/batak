/**
 * Lobi bileşeni.
 * Oyun modu, bot ayarları seçimi ve matchmaking kuyruğuna katılma arayüzü.
 */

import React, { useState } from 'react';
import { useSocket } from '../socket/SocketContext';
import { useWallet } from '../solana/WalletContext';
import { GameMode } from '../types/game';
import './Lobby.css';

interface LobbyProps {
  onJoinGame: (data: any) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onJoinGame }) => {
  const { socket, isConnected } = useSocket();
  const { publicKey } = useWallet();
  const [inQueue, setInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [botCount, setBotCount] = useState(3);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.KOZ_MACA);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!socket) return;

    const handleQueueUpdate = (data: any) => {
      setQueuePosition(data.position);
    };

    const handleMatchFound = (data: any) => {
      console.log('Match found:', data);
      setInQueue(false);
      // Pass the full gameState to start the game
      onJoinGame(data.gameState);
    };

    const handleError = (data: any) => {
      setError(data.message);
      setInQueue(false);
    };

    socket.on('queue_update', handleQueueUpdate);
    socket.on('match_found', handleMatchFound);
    socket.on('error', handleError);

    return () => {
      socket.off('queue_update', handleQueueUpdate);
      socket.off('match_found', handleMatchFound);
      socket.off('error', handleError);
    };
  }, [socket, onJoinGame]);

  const handleJoinQueue = () => {
    if (!socket || !publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);
    setInQueue(true);

    socket.emit('join_queue', {
      publicKey: publicKey.toString(),
      botCount,
      botDifficulty,
      gameMode
    });
  };

  const handleLeaveQueue = () => {
    if (!socket) return;

    socket.emit('leave_queue');
    setInQueue(false);
    setQueuePosition(0);
  };

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1>🃏 Batak Tournament</h1>
        <p>Find a match and compete for NFT rewards!</p>
      </div>

      <div className="lobby-content">
        <div className="lobby-card">
          <h2>Game Settings</h2>

          <div className="setting-group">
            <label>Game Mode</label>
            <div className="gamemode-selector">
              <button
                className={`gamemode-btn ${gameMode === GameMode.KOZ_MACA ? 'active' : ''}`}
                onClick={() => setGameMode(GameMode.KOZ_MACA)}
                disabled={inQueue}
              >
                Koz Maça
                <span className="gamemode-desc">Maça koz, sadece el sayısı ihale</span>
              </button>
              <button
                className={`gamemode-btn ${gameMode === GameMode.IHALELI_BATAK ? 'active' : ''}`}
                onClick={() => setGameMode(GameMode.IHALELI_BATAK)}
                disabled={inQueue}
              >
                İhaleli Batak
                <span className="gamemode-desc">Koz rengi ve el sayısı ihale</span>
              </button>
            </div>
          </div>

          <div className="setting-group">
            <label>Bot Players</label>
            <div className="bot-selector">
              {[0, 1, 2, 3].map((count) => (
                <button
                  key={count}
                  className={`bot-btn ${botCount === count ? 'active' : ''}`}
                  onClick={() => setBotCount(count)}
                  disabled={inQueue}
                >
                  {count === 0 ? 'PvP' : `${count} Bot${count > 1 ? 's' : ''}`}
                </button>
              ))}
            </div>
          </div>

          {botCount > 0 && (
            <div className="setting-group">
              <label>Bot Difficulty</label>
              <div className="difficulty-selector">
                {(['easy', 'normal', 'hard'] as const).map((difficulty) => (
                  <button
                    key={difficulty}
                    className={`difficulty-btn ${botDifficulty === difficulty ? 'active' : ''}`}
                    onClick={() => setBotDifficulty(difficulty)}
                    disabled={inQueue}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="setting-group">
            <div className="info-box">
              <p>🎮 {botCount === 0 ? '4 Players' : `1 Human + ${botCount} Bots`}</p>
              <p>🏆 Winner receives cNFT reward</p>
              <p>⏱️ Game duration: ~15 minutes</p>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {!inQueue ? (
            <button
              className="btn-primary w-full"
              onClick={handleJoinQueue}
              disabled={!isConnected}
            >
              {isConnected ? 'Find Match' : 'Connecting...'}
            </button>
          ) : (
            <div className="queue-status">
              <div className="spinner"></div>
              <p>Finding match...</p>
            </div>
          )}
        </div>

        <div className="lobby-info">
          <h3>How to Play</h3>
          <ul>
            <li>Bid the number of tricks you'll win with your trump suit</li>
            <li>Must follow suit if possible</li>
            <li>Trump cards beat non-trump cards</li>
            <li>Highest score wins the tournament</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
