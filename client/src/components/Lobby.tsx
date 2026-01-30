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

interface QueueStatus {
  status: 'waiting' | 'matched_with_bots';
  playersInQueue: number;
  playersNeeded: number;
  gameMode: string;
  message: string;
}

const Lobby: React.FC<LobbyProps> = ({ onJoinGame }) => {
  const { socket, isConnected } = useSocket();
  const { publicKey } = useWallet();
  const [inQueue, setInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [botCount, setBotCount] = useState(3);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.KOZ_MACA);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!socket) return;

    const handleQueueStatus = (data: QueueStatus) => {
      console.log('[Lobby] Queue status:', data);
      setQueueStatus(data);
    };

    const handleMatchFound = (data: any) => {
      console.log('Match found:', data);
      setInQueue(false);
      setQueueStatus(null);
      // Pass the full gameState to start the game
      onJoinGame(data.gameState);
    };

    const handleError = (data: any) => {
      setError(data.message);
      setInQueue(false);
      setQueueStatus(null);
    };

    socket.on('queue_status', handleQueueStatus);
    socket.on('match_found', handleMatchFound);
    socket.on('error', handleError);

    return () => {
      socket.off('queue_status', handleQueueStatus);
      socket.off('match_found', handleMatchFound);
      socket.off('error', handleError);
    };
  }, [socket, onJoinGame]);

  const handleJoinQueue = () => {
    if (!socket || !publicKey) {
      setError('Lütfen önce cüzdanınızı bağlayın');
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
    setQueueStatus(null);
  };

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1>🃏 Batak Tournament</h1>
        <p>Find a match and compete for NFT rewards!</p>
      </div>

      <div className="lobby-content">
        <div className="lobby-card">
          <h2>Oyun Ayarları</h2>

          <div className="setting-group">
            <label>Oyun Modu</label>
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
            <label>Oyuncu Sayısı</label>
            <div className="bot-selector">
              {[0, 1, 2, 3].map((count) => (
                <button
                  key={count}
                  className={`bot-btn ${botCount === count ? 'active' : ''}`}
                  onClick={() => setBotCount(count)}
                  disabled={inQueue}
                >
                  {count === 0 ? 'PvP (4 Oyuncu)' : `${count} Bot`}
                </button>
              ))}
            </div>
            {botCount === 0 && (
              <small className="text-yellow">⚠️ 4 gerçek oyuncu bulunmazsa 30 sn bot ile oynanır</small>
            )}
          </div>

          {botCount > 0 && (
            <div className="setting-group">
              <label>Bot Zorluğu</label>
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
              <p>🎮 {botCount === 0 ? '4 Gerçek Oyuncu' : `1 Gerçek + ${botCount} Bot`}</p>
              <p>🏆 Kazanan cNFT ödül kazanır</p>
              <p>⏱️ Oyun süresi: ~15 dakika</p>
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
              {isConnected ? 'Oyun Bul' : 'Bağlanıyor...'}
            </button>
          ) : (
            <div className="queue-status">
              {queueStatus ? (
                <>
                  <div className="queue-info">
                    {queueStatus.status === 'matched_with_bots' ? (
                      <>
                        <p>⚡ Botlarla eşleşildi!</p>
                        <p className="queue-subtext">{queueStatus.message}</p>
                      </>
                    ) : (
                      <>
                        <p>⏳ Oyuncu Bekleniyor...</p>
                        <p className="queue-subtext">{queueStatus.message}</p>
                      </>
                    )}
                  </div>
                  <button className="btn-secondary" onClick={handleLeaveQueue}>
                    İptal
                  </button>
                </>
              ) : (
                <>
                  <div className="spinner"></div>
                  <p>Eşleşme aranıyor...</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="lobby-info">
          <h3>Nasıl Oynanır</h3>
          <ul>
            <li>İhale: Kaç trick alacağını söyle</li>
            <li>Koz rengi (İhaleli Batak) veya Maça (Koz Maça)</li>
            <li>Sıra sende kart at</li>
            <li>En düşük skor kazanır!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
