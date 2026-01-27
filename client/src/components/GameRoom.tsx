/**
 * Oyun odası bileşeni.
 * Kart gösterimi, ihale arayüzü, trik görüntüleme ve tur sonu modallarını yönetir.
 */

import React, { useEffect, useState } from 'react';
import { useSocket } from '../socket/SocketContext';
import { Suit, GameClientState, RoundCompleteData, GameCompleteData, NextRoundStartingData } from '../types/game';
import './GameRoom.css';

interface GameRoomProps {
  gameState: GameClientState;
  onRoundEnd: (data: RoundCompleteData) => void;
  onGameEnd: (data: GameCompleteData) => void;
  onLeave: () => void;
}

type SortOption = 'none' | 'suit' | 'rank';

const GameRoom: React.FC<GameRoomProps> = ({ gameState, onRoundEnd, onGameEnd, onLeave }) => {
  const { socket } = useSocket();
  const [currentGameState, setCurrentGameState] = useState<GameClientState>(gameState);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('suit');
  const [roundCompleteData, setRoundCompleteData] = useState<RoundCompleteData | null>(null);
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [isPlayingCard, setIsPlayingCard] = useState(false); // NEW: Prevent double-clicks

  useEffect(() => {
    if (!socket) return;

    const handleGameStateUpdate = (state: GameClientState) => {
      console.log('Game state update:', state);
      setCurrentGameState(state);
      // Clear selected card and playing state when state updates
      setSelectedCard(null);
      setIsPlayingCard(false);
    };

    const handleTrickComplete = (data: any) => {
      console.log('Trick complete:', data);
    };

    const handleRoundComplete = (data: RoundCompleteData) => {
      console.log('Round complete:', data);
      setRoundCompleteData(data);
      onRoundEnd(data);
    };

    const handleNextRoundStarting = (data: NextRoundStartingData) => {
      console.log('Next round starting:', data);
      setRoundCompleteData(null); // Clear the round complete modal
    };

    const handleGameComplete = (data: GameCompleteData) => {
      console.log('Game complete:', data);
      onGameEnd(data);
    };

    const handleError = (error: any) => {
      console.log('[Socket Error]', error);
      // Clear playing state when error occurs
      setSelectedCard(null);
      setIsPlayingCard(false);
      // Show error message to user
      const errorMessage = error?.message || 'Kart oynatılamadı. Lütfen yeniden dene.';
      alert(errorMessage);
    };

    socket.on('game_state_update', handleGameStateUpdate);
    socket.on('trick_complete', handleTrickComplete);
    socket.on('round_complete', handleRoundComplete);
    socket.on('next_round_starting', handleNextRoundStarting);
    socket.on('game_complete', handleGameComplete);
    socket.on('game_error', handleError);

    return () => {
      socket.off('game_state_update', handleGameStateUpdate);
      socket.off('trick_complete', handleTrickComplete);
      socket.off('round_complete', handleRoundComplete);
      socket.off('next_round_starting', handleNextRoundStarting);
      socket.off('game_complete', handleGameComplete);
      socket.off('game_error', handleError);
    };
  }, [socket, onRoundEnd, onGameEnd]);

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
    // During bidding, cards are just for viewing - don't play them
    if (isBidding) return;

    if (!currentGameState || !socket) return;

    // Prevent double-clicking - if a card is already being played, ignore
    if (isPlayingCard) {
      console.log('[handleCardClick] Already playing a card, ignoring double-click');
      return;
    }

    // Prevent clicking if a card is selected (visual feedback)
    if (selectedCard !== null) {
      console.log('[handleCardClick] Card already selected, waiting for server response');
      return;
    }

    const myPlayerIndex = currentGameState.players?.findIndex(
      (p) => p.type === 'human'
    );

    // Check if it's player's turn before doing anything
    if (myPlayerIndex === undefined || myPlayerIndex === -1) {
      return;
    }

    if (currentGameState.currentPlayerIndex !== myPlayerIndex) {
      // Don't show alert, just silently ignore - UI shows disabled state
      return;
    }

    // Mark that we're playing a card (prevents double-clicks)
    setIsPlayingCard(true);
    setSelectedCard(cardId);
    socket.emit('play_card', { cardId });
  };

  const handleBid = (suit: string, amount: number) => {
    if (!socket) return;
    socket.emit('bid_trump', { suit, amount });
  };

  const handleSuitSelect = (suit: string) => {
    console.log('[handleSuitSelect] Selected suit:', suit);
    setSelectedSuit(suit);
    // Force a small delay to ensure state update
    setTimeout(() => {
      console.log('[handleSuitSelect] selectedSuit state:', suit);
    }, 100);
  };

  // Check if bid is valid
  // Koz Maça: Independent bidding (can bid any amount 1-13)
  // İhaleli Batak: Must bid higher than current highest for selected suit
  const isValidBid = (amount: number): boolean => {
    // Pass (0) is always valid
    if (amount === 0) return true;

    // Koz Maça: Free bidding 1-13
    if (currentGameState.gameMode === 'koz_maca') {
      return amount >= 1 && amount <= 13;
    }

    // İhaleli Batak with suit selection
    // Must bid higher than current highest for the selected suit
    const suit = selectedSuit; // Capture in local variable
    const highestBid = suit
      ? getHighestBidForSuit(suit)
      : getHighestBid();

    const isValid = amount > highestBid;

    console.log('[isValidBid]', {
      amount,
      selectedSuit: suit,
      highestBid,
      gameMode: currentGameState.gameMode,
      isMyTurn,
      allBids: currentGameState.bids,
      result: isValid
    });

    return isValid;
  };

  // Get current highest bid amount
  const getHighestBid = (): number => {
    if (!currentGameState.bids || currentGameState.bids.length === 0) return 0;
    return Math.max(...currentGameState.bids.map((b) => b.amount));
  };

  // Get current highest bid for a specific suit
  const getHighestBidForSuit = (suit: string): number => {
    if (!currentGameState.bids || currentGameState.bids.length === 0) return 0;
    const suitBids = currentGameState.bids.filter((b) => b.suit === suit);
    if (suitBids.length === 0) return 0;
    return Math.max(...suitBids.map((b) => b.amount));
  };

  const getSuitSymbol = (suit: string) => {
    const symbols: Record<string, string> = {
      spades: '♠',
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣'
    };
    return symbols[suit] || suit;
  };

  // Get the bid for a specific player
  const getPlayerBid = (playerId: string) => {
    if (!currentGameState.bids) return null;
    return currentGameState.bids.find((b: any) => b.playerId === playerId);
  };

  // Format bid display for a player
  const formatPlayerBid = (playerId: string) => {
    const bid = getPlayerBid(playerId);
    if (!bid) return null;
    if (bid.amount === 0) return 'Pas';
    // In İhaleli Batak, show suit symbol (unless it's spades which is default for Koz Maça)
    if (currentGameState.gameMode === 'ihaleli_batak' && bid.suit && bid.suit !== 'spades') {
      return `${bid.amount}${getSuitSymbol(bid.suit)}`;
    }
    return `${bid.amount}`;
  };

  const getSuitColor = (suit: string) => {
    const colors: Record<string, string> = {
      spades: '#1e40af',
      hearts: '#dc2626',
      diamonds: '#b45309',
      clubs: '#15803d'
    };
    return colors[suit] || '#000000';
  };

  const getRankSymbol = (rank: number) => {
    const symbols: Record<number, string> = {
      2: '2', 3: '3', 4: '4', 5: '5', 6: '6',
      7: '7', 8: '8', 9: '9', 10: '10',
      11: 'J', 12: 'Q', 13: 'K', 14: 'A'
    };
    return symbols[rank] || rank.toString();
  };

  // Sort cards
  const sortCards = (cards: any[]) => {
    if (!cards) return [];

    const suitOrder = { clubs: 0, diamonds: 1, spades: 2, hearts: 3 };

    const sorted = [...cards].sort((a, b) => {
      if (sortBy === 'suit') {
        // Sort by suit first, then by rank descending
        const suitDiff = (suitOrder[a.suit] || 0) - (suitOrder[b.suit] || 0);
        if (suitDiff !== 0) return suitDiff;
        return b.rank - a.rank; // Descending rank
      } else if (sortBy === 'rank') {
        // Sort by rank descending, then by suit
        if (b.rank !== a.rank) return b.rank - a.rank;
        return (suitOrder[a.suit] || 0) - (suitOrder[b.suit] || 0);
      }
      // No sorting - keep original order
      return 0;
    });

    return sorted;
  };

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

  const myPlayerIndex = currentGameState.players?.findIndex((p) => p.type === 'human');
  const myPlayer = currentGameState.players?.[myPlayerIndex ?? -1];
  const isMyTurn = currentGameState.currentPlayerIndex === myPlayerIndex;
  const isBidding = currentGameState.state === 'bidding';
  const currentRound = currentGameState.currentRound ?? 1;
  const totalRounds = currentGameState.totalRounds ?? 5;

  // Debug logging for bidding
  console.log('[Bidding Debug]', {
    myPlayerIndex,
    currentPlayerIndex: currentGameState.currentPlayerIndex,
    isMyTurn,
    isBidding,
    bids: currentGameState.bids,
    highestBid: getHighestBid(),
    gameMode: currentGameState.gameMode
  });

  // Get and sort my hand
  const myHand = myPlayer?.hand ? sortCards(myPlayer.hand) : [];

  return (
    <div className="game-room">
      {/* Header */}
      <div className="game-header">
        <h2>🃏 Batak</h2>
        <div className="game-info">
          {currentGameState.currentRound && currentGameState.totalRounds && (
            <span className="round-indicator">
              Round {currentRound} / {totalRounds}
            </span>
          )}
          {currentGameState.trumpSuit && (
            <span className="trump-indicator">
              Trump: <span className={`suit-${currentGameState.trumpSuit}`}>
                {getSuitSymbol(currentGameState.trumpSuit)}
              </span>
            </span>
          )}
          <span className="state-indicator">
            {currentGameState.state?.toUpperCase()}
          </span>
        </div>
        <button className="btn-secondary" onClick={handleLeaveGame}>
          Çıkış
        </button>
      </div>

      {/* Game Table */}
      <div className={`game-table ${isBidding ? 'has-bidding' : ''}`}>
        {/* Other Players */}
        <div className="other-players">
          {currentGameState.players?.map((player, index) => {
            if (index === myPlayerIndex) return null;
            return (
              <div
                key={player.id}
                className={`player-area ${currentGameState.currentPlayerIndex === index ? 'active' : ''}`}
              >
                <div className="player-avatar">
                  {player.type === 'bot' ? '🤖' : '👤'}
                </div>
                <div className="player-info">
                  <span className="player-name">{player.name}</span>
                  <span className="player-stats">{player.tricksWon} tricks</span>
                  {formatPlayerBid(player.id) && (
                    <span className="player-bid">İhale: {formatPlayerBid(player.id)}</span>
                  )}
                  {player.totalScore !== undefined && (
                    <span className="player-total-score">Total: {player.totalScore}</span>
                  )}
                </div>
                <div className="player-cards">{player.handSize} cards</div>
              </div>
            );
          })}
        </div>

        {/* Center Play Area */}
        <div className="play-area">
          {currentGameState.state === 'scoring' || currentGameState.state === 'finished' ? (
            <div className="play-area-placeholder">
              <div className="game-ending">
                <div className="spinner"></div>
                <p>Skor hesaplanıyor...</p>
              </div>
            </div>
          ) : currentGameState.currentTrick?.cards?.length > 0 ? (
            <div className="trick-cards">
              {currentGameState.currentTrick.cards.map((play, i) => (
                <div key={i} className="played-card">
                  <div className="card">
                    <span className="card-rank">{getRankSymbol(play.card.rank)}</span>
                    <span className="card-suit" style={{ color: getSuitColor(play.card.suit) }}>
                      {getSuitSymbol(play.card.suit)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="play-area-placeholder">
              {isMyTurn ? (
                <span>Sıra sende - Kart seç</span>
              ) : (
                <span className="waiting-text">
                  {currentGameState.players?.[currentGameState.currentPlayerIndex]?.name || 'Rakip'} oynuyor...
                </span>
              )}
            </div>
          )}
        </div>

        {/* My Hand - Show in both BIDDING and PLAYING, hide when game over */}
        {currentGameState.state !== 'scoring' && currentGameState.state !== 'finished' && (
          <div className={`my-hand ${isBidding ? 'scroll-hint' : ''}`}>
            <div className="hand-info">
              <span>{myPlayer?.name}</span>
              <span>{myPlayer?.tricksWon} tricks</span>
              {formatPlayerBid(myPlayer?.id || '') && (
                <span>İhale: {formatPlayerBid(myPlayer?.id || '')}</span>
              )}
              <span>Round: {myPlayer?.score ?? 0}</span>
              {myPlayer?.totalScore !== undefined && (
                <span>Total: {myPlayer.totalScore}</span>
              )}
              {!isBidding && (
                <div className="sort-controls">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="sort-select"
                  >
                    <option value="suit">Sırala: Tür</option>
                    <option value="rank">Sırala: Değer</option>
                    <option value="none">Sırala: Yok</option>
                  </select>
                </div>
              )}
            </div>
            <div className="cards">
              {myHand.map((card, cardIndex) => (
                <div
                  key={card.id}
                  className={`card ${selectedCard === card.id ? 'selected' : ''} ${(!isMyTurn && !isBidding) || isPlayingCard ? 'disabled' : isBidding ? 'viewing' : ''}`}
                  onClick={() => handleCardClick(card.id)}
                  title={`${getRankSymbol(card.rank)} ${getSuitSymbol(card.suit)}`}
                  style={{ '--card-index': cardIndex } as React.CSSProperties}
                >
                  <span className="card-rank">{getRankSymbol(card.rank)}</span>
                  <span className="card-suit" style={{ color: getSuitColor(card.suit) }}>
                    {getSuitSymbol(card.suit)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bidding Panel */}
      {isBidding && (
        <div className="bidding-panel">
          <h3>İhale - Kaç Trick Alacaksın?</h3>
          <div className="bid-info">
            {currentGameState.gameMode === 'koz_maca'
              ? 'Koz Maça: Maça koz, sadece el sayısı'
              : selectedSuit
                ? `${getSuitSymbol(selectedSuit)} koz - Kaç el? (Min: ${getHighestBidForSuit(selectedSuit) + 1})`
                : 'Önce koz rengi seçin'
            }
          </div>

          {/* İhaleli Batak - Suit Selection */}
          {currentGameState.gameMode === 'ihaleli_batak' && !selectedSuit && (
            <div className="suit-selection">
              {['spades', 'hearts', 'diamonds', 'clubs'].map((suit) => (
                <button
                  key={suit}
                  className={`suit-btn ${!isMyTurn ? 'disabled' : ''}`}
                  onClick={() => handleSuitSelect(suit)}
                  disabled={!isMyTurn}
                  title={`${getSuitSymbol(suit)} koz`}
                >
                  <span className="suit-symbol" style={{ color: getSuitColor(suit) }}>
                    {getSuitSymbol(suit)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Trick Count Selection - Show when suit is selected OR Koz Maça */}
          {(currentGameState.gameMode === 'koz_maca' || selectedSuit) && (
            <>
              <div className="bid-amounts-single">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((amount) => (
                  <button
                    key={amount}
                    className="bid-btn-large"
                    onClick={() => handleBid(selectedSuit || 'spades', amount)}
                    disabled={!isMyTurn || !isValidBid(amount)}
                    title={!isValidBid(amount) ? 'Geçersiz ihale' : `${amount} el`}
                  >
                    {amount}
                  </button>
                ))}
              </div>
              <button className="btn-pass" onClick={() => handleBid(selectedSuit || 'spades', 0)} disabled={!isMyTurn}>
                Pas Geç
              </button>
              {currentGameState.bids && currentGameState.bids.length > 0 && getHighestBid() > 0 && (
                <div className="current-highest-bid">
                  En Yüksek İhale: {getHighestBid()}/{selectedSuit ? getSuitSymbol(selectedSuit) : '♠'}
                </div>
              )}
            </>
          )}

          {/* Change suit selection (İhaleli Batak) */}
          {currentGameState.gameMode === 'ihaleli_batak' && selectedSuit && (
            <button
              className="btn-change-suit"
              onClick={() => setSelectedSuit(null)}
              disabled={!isMyTurn}
            >
              ← Rengi Değiştir
            </button>
          )}
        </div>
      )}

      {/* Score Board - Enhanced with round and total scores */}
      <div className="score-board">
        <h3>Skorlar</h3>
        {currentGameState.players?.map((player, index) => (
          <div key={player.id} className="score-item">
            <div className="score-name">{player.name}</div>
            <div className="score-values">
              <span className="score-round">Round: {player.score ?? 0}</span>
              {player.totalScore !== undefined && (
                <span className="score-total">Total: {player.totalScore}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Round Complete Modal */}
      {roundCompleteData && (
        <div className="round-complete-modal">
          <div className="round-complete-content">
            <h2>Round {roundCompleteData.roundNumber} Complete!</h2>
            <p>Round {roundCompleteData.roundNumber} of {roundCompleteData.totalRounds}</p>

            <div className="round-scores">
              <h3>Round Scores</h3>
              {roundCompleteData.players.map((player) => (
                <div key={player.id} className="round-score-item">
                  <span>{player.name}</span>
                  <span>+{player.score} (Total: {player.totalScore})</span>
                </div>
              ))}
            </div>

            {currentRound < totalRounds ? (
              <button className="btn-primary" onClick={handleRequestNextRound}>
                Start Round {currentRound + 1}
              </button>
            ) : (
              <div className="round-final-message">
                <p>Game Over - Final scores being calculated...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
