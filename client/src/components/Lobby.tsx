/**
 * Lobi bileşeni.
 * Oyun modu, bot ayarları seçimi, matchmaking kuyruğu ve özel oda arayüzü.
 */

import React, { useState } from 'react';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { GameMode } from '../types/game';
import './Lobby.css';

interface LobbyProps {
  username?: string;
  onJoinGame: (data: any) => void;
  onViewLeaderboard?: () => void;
}

interface QueueStatus {
  status: 'waiting' | 'matched_with_bots';
  playersInQueue: number;
  playersNeeded: number;
  gameMode: string;
  message: string;
}

interface PrivateRoomPlayer {
  publicKey: string;
  username?: string;
}

const Lobby: React.FC<LobbyProps> = ({ username, onJoinGame, onViewLeaderboard }) => {
  const { socket, isConnected } = useSocket();
  const { playerId } = useAuth();
  const [inQueue, setInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [queueStartTime, setQueueStartTime] = useState<number | null>(null);
  const [selectedBotCount, setSelectedBotCount] = useState<number>(0); // Track selected bot count
  const [botCount, setBotCount] = useState(parseInt(import.meta.env.VITE_DEFAULT_BOT_COUNT || '0'));
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.KOZ_MACA);
  const [error, setError] = useState<string | null>(null);

  // Private room state
  const [showPrivateRoom, setShowPrivateRoom] = useState(false);
  const [privateRoomCode, setPrivateRoomCode] = useState<string | null>(null);
  const [privateRoomPlayers, setPrivateRoomPlayers] = useState<PrivateRoomPlayer[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

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
      setPrivateRoomCode(null);
      setShowPrivateRoom(false);
      onJoinGame(data.gameState);
    };

    const handleError = (data: any) => {
      setError(data.message);
      setInQueue(false);
      setQueueStatus(null);
    };

    const handlePrivateRoomUpdate = (data: any) => {
      setPrivateRoomPlayers(data.players);
      if (data.code) setPrivateRoomCode(data.code);
    };

    const handlePrivateRoomClosed = () => {
      setShowPrivateRoom(false);
      setPrivateRoomCode(null);
      setPrivateRoomPlayers([]);
      setIsHost(false);
      setError('Oda kapatildi');
    };

    socket.on('queue_status', handleQueueStatus);
    socket.on('match_found', handleMatchFound);
    socket.on('error', handleError);
    socket.on('private_room_update', handlePrivateRoomUpdate);
    socket.on('private_room_closed', handlePrivateRoomClosed);

    return () => {
      socket.off('queue_status', handleQueueStatus);
      socket.off('match_found', handleMatchFound);
      socket.off('error', handleError);
      socket.off('private_room_update', handlePrivateRoomUpdate);
      socket.off('private_room_closed', handlePrivateRoomClosed);
    };
  }, [socket, onJoinGame]);

  const handleJoinQueue = () => {
    if (!socket || !playerId) {
      setError('Lutfen once giris yapiniz');
      return;
    }

    setError(null);
    setInQueue(true);
    setQueueStartTime(Date.now());
    setSelectedBotCount(botCount);

    socket.emit('join_queue', {
      publicKey: playerId,
      username,
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
    setQueueStartTime(null);
  };

  const handleCreatePrivateRoom = () => {
    if (!socket || !playerId) return;
    setError(null);
    socket.emit('create_private_room', {
      publicKey: playerId,
      username,
      botDifficulty,
      gameMode
    }, (response: any) => {
      if (response.error) {
        setError(response.error);
        return;
      }
      setPrivateRoomCode(response.code);
      setPrivateRoomPlayers(response.players);
      setIsHost(true);
      setShowPrivateRoom(true);
    });
  };

  const handleJoinPrivateRoom = () => {
    if (!socket || !playerId || !joinCodeInput) return;
    setError(null);
    socket.emit('join_private_room', {
      code: joinCodeInput.toUpperCase(),
      publicKey: playerId,
      username
    }, (response: any) => {
      if (response.error) {
        setError(response.error);
        return;
      }
      setPrivateRoomCode(response.code);
      setPrivateRoomPlayers(response.players);
      setIsHost(response.hostPk === playerId);
      setShowPrivateRoom(true);
      setShowJoinInput(false);
      setJoinCodeInput('');
    });
  };

  const handleStartPrivateRoom = () => {
    if (!socket || !playerId || !privateRoomCode) return;
    socket.emit('start_private_room', {
      code: privateRoomCode,
      publicKey: playerId
    });
  };

  const handleLeavePrivateRoom = () => {
    if (!socket || !playerId || !privateRoomCode) return;
    socket.emit('leave_private_room', {
      code: privateRoomCode,
      publicKey: playerId
    });
    setShowPrivateRoom(false);
    setPrivateRoomCode(null);
    setPrivateRoomPlayers([]);
    setIsHost(false);
  };

  const copyRoomCode = () => {
    if (privateRoomCode) {
      navigator.clipboard.writeText(privateRoomCode);
    }
  };

  // Private room lobby view
  if (showPrivateRoom && privateRoomCode) {
    return (
      <div className="lobby">
        <div className="lobby-header">
          <h1>Private Room</h1>
          <p>Invite your friends!</p>
        </div>
        <div className="lobby-content">
          <div className="lobby-card private-room-card">
            <div className="room-code-display">
              <label>Room Code</label>
              <div className="room-code-value">
                <span>{privateRoomCode}</span>
                <button className="btn-copy" onClick={copyRoomCode} title="Copy">
                  Copy
                </button>
              </div>
            </div>

            <div className="room-players-list">
              <label>Players ({privateRoomPlayers.length}/4)</label>
              {privateRoomPlayers.map((p, i) => (
                <div key={p.publicKey} className="room-player-item">
                  <span className="room-player-icon">👤</span>
                  <span>{p.username || p.publicKey.slice(0, 12)}</span>
                  {i === 0 && <span className="host-badge">Host</span>}
                </div>
              ))}
              {Array.from({ length: 4 - privateRoomPlayers.length }).map((_, i) => (
                <div key={`empty-${i}`} className="room-player-item empty">
                  <span className="room-player-icon">🤖</span>
                  <span>Bot (empty slot)</span>
                </div>
              ))}
            </div>

            {isHost && (
              <button className="btn-primary w-full" onClick={handleStartPrivateRoom}>
                Start Game
              </button>
            )}
            {!isHost && (
              <p className="waiting-host">Waiting for host to start the game...</p>
            )}
            <button className="btn-secondary w-full" onClick={handleLeavePrivateRoom} style={{ marginTop: '0.5rem' }}>
              Leave Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby">
      <div className="lobby-header">
        <h1>Batak Tournament</h1>
        {username && <p className="welcome-text">Welcome, {username}!</p>}
        {!username && <p>Find a match and compete for NFT rewards!</p>}
      </div>

      <div className="lobby-content">
        {/* Left column: Settings */}
        <div className="lobby-col-left">
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
                  Koz Maca
                  <span className="gamemode-desc">Spades trump, bid only</span>
                </button>
                <button
                  className={`gamemode-btn ${gameMode === GameMode.IHALELI_BATAK ? 'active' : ''}`}
                  onClick={() => setGameMode(GameMode.IHALELI_BATAK)}
                  disabled={inQueue}
                >
                  Ihaleli Batak
                  <span className="gamemode-desc">Choose trump and bid</span>
                </button>
              </div>
            </div>

            <div className="setting-group">
              <label>Player Count</label>
              <div className="bot-selector">
                {[0, 1, 2, 3].map((count) => (
                  <button
                    key={count}
                    className={`bot-btn ${botCount === count ? 'active' : ''}`}
                    onClick={() => setBotCount(count)}
                    disabled={inQueue}
                  >
                    {count === 0 ? 'PvP' : `${count} Bot`}
                  </button>
                ))}
              </div>
              {botCount === 3 && (
                <small className="text-green">Starts immediately!</small>
              )}
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
                <p>{botCount === 0 ? '4 Real Players' : `1 Real + ${botCount} Bot`}</p>
                <p>Winner earns a cNFT reward</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Actions */}
        <div className="lobby-col-right">
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
              {isConnected ? 'Find Game' : 'Connecting...'}
            </button>
          ) : (
            <div className="queue-status">
              {queueStatus ? (
                <>
                  <div className="queue-info">
                    {queueStatus.status === 'matched_with_bots' ? (
                      <>
                        <p>Matched with bots!</p>
                        <p className="queue-subtext">{queueStatus.message}</p>
                      </>
                    ) : (
                      <>
                        <p>
                          {selectedBotCount === 0 ? '🎮 PvP Mode' : '🤖 Mixed Mode'}
                          {' - '}
                          Waiting for Players...
                        </p>
                        <p className="queue-subtext">
                          {queueStatus.playersInQueue}/{queueStatus.playersNeeded} players
                          {selectedBotCount === 0 && queueStartTime && (
                            <> • Bots added in {Math.max(0, 60 - Math.floor((Date.now() - queueStartTime) / 1000))}s</>
                          )}
                          {selectedBotCount > 0 && selectedBotCount < 3 && queueStartTime && (
                            <> • {Math.max(0, 30 - Math.floor((Date.now() - queueStartTime) / 1000))}s left</>
                          )}
                        </p>
                      </>
                    )}
                  </div>
                  <button className="btn-secondary" onClick={handleLeaveQueue}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="spinner"></div>
                  <p>Searching for match...</p>
                </>
              )}
            </div>
          )}

          {/* Private Room Buttons */}
          <div className="private-room-actions">
            <button className="btn-private-room" onClick={handleCreatePrivateRoom} disabled={!isConnected || inQueue}>
              Create Room
            </button>
            {!showJoinInput ? (
              <button className="btn-private-room" onClick={() => setShowJoinInput(true)} disabled={!isConnected || inQueue}>
                Join Room
              </button>
            ) : (
              <div className="join-room-input">
                <input
                  type="text"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Room code..."
                  maxLength={6}
                  className="room-code-input"
                />
                <button className="btn-join" onClick={handleJoinPrivateRoom} disabled={joinCodeInput.length !== 6}>
                  Join
                </button>
                <button className="btn-cancel-join" onClick={() => { setShowJoinInput(false); setJoinCodeInput(''); }}>
                  X
                </button>
              </div>
            )}
          </div>

          {onViewLeaderboard && (
            <button
              className="btn-primary w-full leaderboard-btn"
              onClick={onViewLeaderboard}
            >
              Leaderboard
            </button>
          )}

          <div className="lobby-info">
            <h3>How to Play</h3>
            <ul>
              <li>Bid: Declare how many tricks you'll take</li>
              <li>Choose trump suit or Spades trump</li>
              <li>Play a card when it's your turn</li>
              <li>Lowest score wins!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
