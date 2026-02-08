/**
 * Oyun odası bileşeni — Mobil-first yeniden tasarım.
 * Masa düzeni: üst/sol/sağ rakipler, ortada trick alanı, altta yatay kart şeridi.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../socket/SocketContext';
import { useAuth } from '../auth/AuthContext';
import { GameClientState, RoundCompleteData, GameCompleteData } from '../types/game';
import './GameRoom.css';

interface GameRoomProps {
  gameState: GameClientState;
  onRoundEnd: (data: RoundCompleteData) => void;
  onGameEnd: (data: GameCompleteData) => void;
  onLeave: () => void;
}

const GameRoom: React.FC<GameRoomProps> = ({ gameState, onRoundEnd, onGameEnd, onLeave }) => {
  const { socket } = useSocket();
  const { playerId } = useAuth();
  const [currentGameState, setCurrentGameState] = useState<GameClientState>(gameState);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [roundCompleteData, setRoundCompleteData] = useState<RoundCompleteData | null>(null);
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [isPlayingCard, setIsPlayingCard] = useState(false);
  const [isCollectingTrick, setIsCollectingTrick] = useState(false);
  const [scorePopups, setScorePopups] = useState<Record<string, number>>({});

  const isPlayingCardRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScoresRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!socket) return;

    const clearPlayingState = () => {
      setSelectedCard(null);
      setIsPlayingCard(false);
      isPlayingCardRef.current = false;
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
    };

    const handleGameStateUpdate = (state: GameClientState) => {
      setCurrentGameState(prev => {
        if (prev && prev.currentTrick?.cards?.length === 4 && state.currentTrick?.cards?.length === 0) {
          setIsCollectingTrick(true);
          setTimeout(() => setIsCollectingTrick(false), 800);
        }
        return state;
      });

      if (state.players) {
        const newPopups: Record<string, number> = {};
        for (const player of state.players) {
          const prevScore = prevScoresRef.current[player.id];
          if (prevScore !== undefined && player.totalScore !== prevScore) {
            newPopups[player.id] = player.totalScore - prevScore;
          }
          prevScoresRef.current[player.id] = player.totalScore ?? 0;
        }
        if (Object.keys(newPopups).length > 0) {
          setScorePopups(newPopups);
          setTimeout(() => setScorePopups({}), 1500);
        }
      }

      clearPlayingState();

      if (state.state === 'bidding') {
        if (state.gameMode === 'koz_maca') {
          setSelectedSuit('spades');
        } else {
          setSelectedSuit(null);
        }
      }
    };

    const handleCardPlayed = () => {
      clearPlayingState();
    };

    const handleTrickComplete = () => {
      clearPlayingState();
    };

    const handleRoundComplete = (data: RoundCompleteData) => {
      setRoundCompleteData(data);
      onRoundEnd(data);
    };

    const handleNextRoundStarting = () => {
      setRoundCompleteData(null);
      setSelectedSuit(null);
    };

    const handleGameComplete = (data: GameCompleteData) => {
      onGameEnd(data);
    };

    const handleError = (error: any) => {
      clearPlayingState();
      const errorMessage = error?.message || 'Kart oynatılamadı. Lütfen yeniden dene.';
      alert(errorMessage);
    };

    socket.on('game_state_update', handleGameStateUpdate);
    socket.on('card_played', handleCardPlayed);
    socket.on('trick_complete', handleTrickComplete);
    socket.on('round_complete', handleRoundComplete);
    socket.on('next_round_starting', handleNextRoundStarting);
    socket.on('game_complete', handleGameComplete);
    socket.on('game_error', handleError);
    socket.on('player_replaced', () => {});

    return () => {
      socket.off('game_state_update', handleGameStateUpdate);
      socket.off('card_played', handleCardPlayed);
      socket.off('trick_complete', handleTrickComplete);
      socket.off('round_complete', handleRoundComplete);
      socket.off('next_round_starting', handleNextRoundStarting);
      socket.off('game_complete', handleGameComplete);
      socket.off('game_error', handleError);
      socket.off('player_replaced');
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, [socket, onRoundEnd, onGameEnd]);

  // --- Handlers ---

  const handleLeaveGame = () => {
    if (confirm('Oyundan ayrılmak istediğine emin misin?')) {
      onLeave();
    }
  };

  const handleRequestNextRound = () => {
    if (socket) {
      socket.emit('request_next_round');
    }
  };

  const handleCardClick = (cardId: string) => {
    if (isBidding) return;
    if (!currentGameState || !socket) return;
    if (isPlayingCardRef.current) return;
    if (isPlayingCard || selectedCard !== null) return;

    const myIdx = getMyPlayerIndex();
    if (myIdx === undefined || myIdx === -1) return;
    if (currentGameState.currentPlayerIndex !== myIdx) return;

    isPlayingCardRef.current = true;
    setIsPlayingCard(true);
    setSelectedCard(cardId);

    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
    }
    fallbackTimeoutRef.current = setTimeout(() => {
      setSelectedCard(null);
      setIsPlayingCard(false);
      isPlayingCardRef.current = false;
      fallbackTimeoutRef.current = null;
    }, 2000);

    socket.emit('play_card', { cardId });
  };

  const handleBid = (suit: string, amount: number) => {
    if (!socket) return;
    socket.emit('bid_trump', { suit, amount });
  };

  const handleSuitSelect = (suit: string) => {
    setSelectedSuit(suit);
  };

  // --- Helpers ---

  const getMyPlayerIndex = (): number => {
    if (!currentGameState?.players) return -1;
    if (playerId) {
      return currentGameState.players.findIndex((p) => p.id === playerId);
    }
    return currentGameState.players.findIndex((p) => p.type === 'human');
  };

  const getOpponentPositions = () => {
    const myIdx = getMyPlayerIndex();
    if (myIdx === -1 || !currentGameState?.players) return { left: null, top: null, right: null };
    const players = currentGameState.players;
    return {
      left:  players[(myIdx + 1) % 4] || null,
      top:   players[(myIdx + 2) % 4] || null,
      right: players[(myIdx + 3) % 4] || null,
    };
  };

  /** Map playerId to trick slot position */
  const getTrickSlotForPlayer = (trickPlayerId: string): string => {
    const myIdx = getMyPlayerIndex();
    if (myIdx === -1 || !currentGameState?.players) return 'bottom';
    const playerIdx = currentGameState.players.findIndex(p => p.id === trickPlayerId);
    if (playerIdx === -1) return 'bottom';
    const relative = (playerIdx - myIdx + 4) % 4;
    const slots = ['bottom', 'left', 'top', 'right'];
    return slots[relative];
  };

  const isValidBid = (amount: number): boolean => {
    if (amount === 0) return true;
    if (currentGameState.gameMode === 'koz_maca') {
      return amount >= 1 && amount <= 13;
    }
    const suit = selectedSuit;
    const highestBid = suit ? getHighestBidForSuit(suit) : getHighestBid();
    return amount > highestBid;
  };

  const getHighestBid = (): number => {
    if (!currentGameState.bids || currentGameState.bids.length === 0) return 0;
    return Math.max(...currentGameState.bids.map((b) => b.amount));
  };

  const getHighestBidForSuit = (suit: string): number => {
    if (!currentGameState.bids || currentGameState.bids.length === 0) return 0;
    const suitBids = currentGameState.bids.filter((b) => b.suit === suit);
    if (suitBids.length === 0) return 0;
    return Math.max(...suitBids.map((b) => b.amount));
  };

  const getSuitSymbol = (suit: string) => {
    const symbols: Record<string, string> = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' };
    return symbols[suit] || suit;
  };

  const getSuitColor = (suit: string) => {
    const colors: Record<string, string> = { spades: '#1e40af', hearts: '#dc2626', diamonds: '#b45309', clubs: '#15803d' };
    return colors[suit] || '#000000';
  };

  const getRankSymbol = (rank: number | undefined) => {
    if (rank === undefined) return '?';
    const symbols: Record<number, string> = {
      2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
      11: 'J', 12: 'Q', 13: 'K', 14: 'A'
    };
    return symbols[rank] || rank.toString();
  };

  const getPlayerBid = (pid: string) => {
    if (!currentGameState.bids) return null;
    return currentGameState.bids.find((b: any) => b.playerId === pid);
  };

  const formatPlayerBid = (pid: string) => {
    const bid = getPlayerBid(pid);
    if (!bid) return null;
    if (bid.amount === 0) return 'Pas';
    if (currentGameState.gameMode === 'ihaleli_batak' && bid.suit && bid.suit !== 'spades') {
      return `${bid.amount}${getSuitSymbol(bid.suit)}`;
    }
    return `${bid.amount}`;
  };

  const sortCards = (cards: any[]) => {
    if (!cards) return [];
    const suitOrder: Record<string, number> = { clubs: 0, diamonds: 1, spades: 2, hearts: 3 };
    return [...cards].sort((a, b) => {
      const suitDiff = (suitOrder[a.suit] || 0) - (suitOrder[b.suit] || 0);
      if (suitDiff !== 0) return suitDiff;
      return b.rank - a.rank;
    });
  };

  // --- Derived state ---

  if (!currentGameState) {
    return (
      <div className="game-room">
        <div className="loading-screen">
          <div className="spinner"></div>
          <p>Oyun yükleniyor...</p>
        </div>
      </div>
    );
  }

  const myPlayerIndex = getMyPlayerIndex();
  const myPlayer = currentGameState.players?.[myPlayerIndex];
  const isMyTurn = currentGameState.currentPlayerIndex === myPlayerIndex;
  const isBidding = currentGameState.state === 'bidding';
  const isScoring = currentGameState.state === 'scoring' || currentGameState.state === 'finished';
  const currentRound = currentGameState.currentRound ?? 1;
  const totalRounds = currentGameState.totalRounds ?? 5;
  const myHand = myPlayer?.hand ? sortCards(myPlayer.hand) : [];
  const opponents = getOpponentPositions();
  const trickCards = currentGameState.currentTrick?.cards || [];

  // --- Render helpers ---

  const renderOpponentSlot = (player: any) => {
    if (!player) return null;
    const playerIndex = currentGameState.players?.findIndex(p => p.id === player.id) ?? -1;
    const isActive = currentGameState.currentPlayerIndex === playerIndex;
    return (
      <div className={`opponent-slot ${isActive ? 'active' : ''}`}>
        <span className="opp-icon">{player.type === 'bot' ? '🤖' : '👤'}</span>
        <span className="opp-name">{player.name}</span>
        <span className="opp-tricks">{player.tricksWon} el</span>
        {formatPlayerBid(player.id) && (
          <span className="opp-bid">{formatPlayerBid(player.id)}</span>
        )}
        {scorePopups[player.id] !== undefined && (
          <div className={`score-popup ${scorePopups[player.id] >= 0 ? 'positive' : 'negative'}`}>
            {scorePopups[player.id] >= 0 ? '+' : ''}{scorePopups[player.id]}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="game-room">
      {/* ===== Mini Header (32px) ===== */}
      <div className="game-header-mini">
        <div className="header-left">
          <span className="header-round">R{currentRound}/{totalRounds}</span>
          {currentGameState.trumpSuit && (
            <span className="header-trump">
              <span className="trump-sym" style={{ color: getSuitColor(currentGameState.trumpSuit) }}>
                {getSuitSymbol(currentGameState.trumpSuit)}
              </span>
              Koz
            </span>
          )}
          <span className="header-trick-count">{currentGameState.tricks ?? 0}.el</span>
          <span className="header-state">{currentGameState.state}</span>
        </div>
        <button className="btn-hamburger" onClick={() => setShowScoreboard(true)}>☰</button>
      </div>

      {/* ===== Game Table (CSS Grid 3x3) ===== */}
      <div className="game-table">
        {/* Top opponent */}
        <div className="opponent-top">
          {renderOpponentSlot(opponents.top)}
        </div>

        {/* Left opponent */}
        <div className="opponent-left">
          {renderOpponentSlot(opponents.left)}
        </div>

        {/* Center: Trick area (also hosts bidding overlay) */}
        <div className="trick-area">
          {isScoring ? (
            <div className="trick-scoring">
              <div className="spinner"></div>
              <p>Skor hesaplanıyor...</p>
            </div>
          ) : isBidding ? (
            <div className="bidding-overlay">
              <div className="bid-header">İhale - Kaç El?</div>
              <div className="bid-info">
                {currentGameState.gameMode === 'koz_maca'
                  ? 'Koz Maça: ♠ koz, sadece el sayısı'
                  : selectedSuit
                    ? `${getSuitSymbol(selectedSuit)} koz — Min: ${getHighestBidForSuit(selectedSuit) + 1}`
                    : 'Önce koz rengi seç'
                }
              </div>

              {/* Suit selection (İhaleli Batak only) */}
              {currentGameState.gameMode === 'ihaleli_batak' && !selectedSuit && (
                <div className="suit-selection">
                  {['spades', 'hearts', 'diamonds', 'clubs'].map((suit) => (
                    <button
                      key={suit}
                      className="suit-btn"
                      onClick={() => handleSuitSelect(suit)}
                      disabled={!isMyTurn}
                    >
                      <span className="suit-symbol" style={{ color: getSuitColor(suit) }}>
                        {getSuitSymbol(suit)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Bid numbers */}
              {(currentGameState.gameMode === 'koz_maca' || selectedSuit) && (
                <>
                  <div className="bid-numbers">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((amount) => (
                      <button
                        key={amount}
                        className="bid-num-btn"
                        onClick={() => handleBid(selectedSuit || 'spades', amount)}
                        disabled={!isMyTurn || !isValidBid(amount)}
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                  <div className="bid-actions-row">
                    <button className="btn-pass" onClick={() => handleBid(selectedSuit || 'spades', 0)} disabled={!isMyTurn}>
                      Pas Geç
                    </button>
                    {currentGameState.gameMode === 'ihaleli_batak' && selectedSuit && (
                      <button className="btn-change-suit" onClick={() => setSelectedSuit(null)} disabled={!isMyTurn}>
                        Rengi Değiştir
                      </button>
                    )}
                  </div>
                  {currentGameState.bids && currentGameState.bids.length > 0 && getHighestBid() > 0 && (
                    <div className="current-highest-bid">
                      En Yüksek: {getHighestBid()}{selectedSuit ? getSuitSymbol(selectedSuit) : '♠'}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : trickCards.length > 0 ? (
            <div className={`trick-slots ${isCollectingTrick ? 'collecting' : ''}`}>
              {trickCards.map((play, i) => {
                const slot = getTrickSlotForPlayer(play.playerId);
                return (
                  <div key={i} className={`trick-slot trick-slot-${slot}`}>
                    <div className="trick-card">
                      <span className="tc-rank">{getRankSymbol(play.card.rank)}</span>
                      <span className="tc-suit" style={{ color: getSuitColor(play.card.suit) }}>
                        {getSuitSymbol(play.card.suit)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`trick-status ${isMyTurn ? 'my-turn' : ''}`}>
              {isMyTurn ? (
                <span>Sıra sende</span>
              ) : (
                <span>
                  <span className="waiting-name">
                    {currentGameState.players?.[currentGameState.currentPlayerIndex]?.name || 'Rakip'}
                  </span> oynuyor
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right opponent */}
        <div className="opponent-right">
          {renderOpponentSlot(opponents.right)}
        </div>

        {/* My info bar */}
        <div className="my-info-bar">
          <div className="info-item">
            <span className="info-value name">{myPlayer?.name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">El:</span>
            <span className="info-value tricks">{myPlayer?.tricksWon ?? 0}</span>
          </div>
          {formatPlayerBid(myPlayer?.id || '') && (
            <div className="info-item">
              <span className="info-label">İhale:</span>
              <span className="info-value bid">{formatPlayerBid(myPlayer?.id || '')}</span>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">S:</span>
            <span className="info-value score">{myPlayer?.totalScore ?? 0}</span>
          </div>
        </div>
      </div>

      {/* ===== My Hand Strip (horizontal scroll, overlapping cards) ===== */}
      {!isScoring && (
        <div className={`my-hand-strip ${isMyTurn && !isBidding ? 'my-turn' : ''}`}>
          {myHand.map((card, cardIndex) => (
            <div
              key={card.id}
              className={`hand-card ${selectedCard === card.id ? 'selected' : ''} ${(!isMyTurn && !isBidding) || isPlayingCard ? 'disabled' : isBidding ? 'viewing' : ''}`}
              onClick={() => handleCardClick(card.id)}
              style={{ '--card-i': cardIndex } as React.CSSProperties}
            >
              <span className="hc-rank">{getRankSymbol(card.rank)}</span>
              <span className="hc-suit" style={{ color: getSuitColor(card.suit) }}>
                {getSuitSymbol(card.suit)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ===== Scoreboard Overlay (hamburger toggle) ===== */}
      {showScoreboard && (
        <>
          <div className="scoreboard-backdrop" onClick={() => setShowScoreboard(false)} />
          <div className="scoreboard-panel">
            <h3>Skorlar</h3>
            {currentGameState.players?.map((player) => (
              <div key={player.id} className="sb-player">
                <span className={`sb-name ${player.id === playerId ? 'me' : ''}`}>{player.name}</span>
                <div className="sb-scores">
                  <span className="sb-round">Round: {player.score ?? 0}</span>
                  {player.totalScore !== undefined && (
                    <span className="sb-total">Total: {player.totalScore}</span>
                  )}
                </div>
                <span className="sb-tricks">{player.tricksWon} el kazandı</span>
              </div>
            ))}
            <button className="btn-leave" onClick={handleLeaveGame}>
              Oyundan Çık
            </button>
          </div>
        </>
      )}

      {/* ===== Round Complete Modal (compact) ===== */}
      {roundCompleteData && (
        <div className="round-complete-modal">
          <div className="round-complete-content">
            <h2>Round {roundCompleteData.roundNumber} Bitti!</h2>
            <p className="round-sub">Round {roundCompleteData.roundNumber} / {roundCompleteData.totalRounds}</p>

            <div className="round-scores">
              <h3>Skorlar</h3>
              {roundCompleteData.players.map((player) => (
                <div key={player.id} className="round-score-item">
                  <span className="rs-name">{player.name}</span>
                  <span className="rs-score">+{player.score} (T: {player.totalScore})</span>
                </div>
              ))}
            </div>

            {currentRound < totalRounds ? (
              <button className="btn-primary" onClick={handleRequestNextRound}>
                Round {currentRound + 1} Başlat
              </button>
            ) : (
              <div className="round-final-message">
                <p>Oyun bitti — Skorlar hesaplanıyor...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
