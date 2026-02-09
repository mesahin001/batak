/**
 * Game Room Screen - React Native implementation
 * Migrated from web GameRoom.tsx with landscape orientation lock
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { GameClientState, RoundCompleteData, GameState } from '../../types/game';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TrickCard {
  playerId: string;
  card: {
    suit: string;
    rank: number;
    id: string;
  };
}

export const GameRoomScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { socket } = useSocket();
  const { playerId } = useAuth();
  const roomId = (route.params as any)?.roomId as string;

  // State
  const [currentGameState, setCurrentGameState] = useState<GameClientState | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [roundCompleteData, setRoundCompleteData] = useState<RoundCompleteData | null>(null);
  const [selectedSuit, setSelectedSuit] = useState<string | null>(null);
  const [isPlayingCard, setIsPlayingCard] = useState(false);
  const [isCollectingTrick, setIsCollectingTrick] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const isPlayingCardRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScoresRef = useRef<Record<string, number>>({});

  // Lock orientation to landscape on mount
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        if (Platform.OS === 'ios') {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
        } else {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        }
        console.log('[GameRoom] Orientation locked to landscape');
      } catch (err) {
        console.log('[GameRoom] Could not lock orientation:', err);
      }
    };

    lockOrientation();

    return () => {
      // Unlock orientation when unmounting
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Initialize game state from socket
  useEffect(() => {
    if (!socket || !roomId || !playerId) return;

    setIsLoading(true);
    setConnectionError(null);

    // Check if gameState was passed in route params (from match_found)
    const initialGameState = (route.params as any)?.gameState;
    if (initialGameState) {
      console.log('[GameRoom] Using gameState from route params');
      setCurrentGameState(initialGameState);
      setIsLoading(false);

      // Set default suit for Koz Maça
      if (initialGameState.state === 'bidding' && initialGameState.gameMode === 'koz_maca') {
        setSelectedSuit('spades');
      }
    } else {
      // Rejoin existing game using publicKey
      console.log('[GameRoom] Rejoining game with publicKey');
      socket.emit('rejoin_game', { publicKey: playerId });

      // Set a timeout to show error if no game_state_update received
      const timeout = setTimeout(() => {
        setConnectionError('Unable to load game. Please try again.');
        setIsLoading(false);
      }, 5000);

      // Clean up timeout when we receive game state
      return () => clearTimeout(timeout);
    }

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

      // Clear loading state on first game state update
      setIsLoading(false);
      setConnectionError(null);

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
      clearPlayingState();
    };

    const handleNextRoundStarting = () => {
      setRoundCompleteData(null);
      setSelectedSuit(null);
    };

    const handleGameComplete = (data: any) => {
      clearPlayingState();
      // Navigate to result screen
      navigation.navigate('GameResult' as never, { roomId } as never);
    };

    const handleError = (error: any) => {
      clearPlayingState();
      const errorMessage = error?.message || 'Kart oynatılamadı. Lütfen yeniden dene.';
      Alert.alert('Hata', errorMessage);
    };

    socket.on('game_state_update', handleGameStateUpdate);
    socket.on('card_played', handleCardPlayed);
    socket.on('trick_complete', handleTrickComplete);
    socket.on('round_complete', handleRoundComplete);
    socket.on('next_round_starting', handleNextRoundStarting);
    socket.on('game_complete', handleGameComplete);
    socket.on('game_error', handleError);

    return () => {
      socket.off('game_state_update', handleGameStateUpdate);
      socket.off('card_played', handleCardPlayed);
      socket.off('trick_complete', handleTrickComplete);
      socket.off('round_complete', handleRoundComplete);
      socket.off('next_round_starting', handleNextRoundStarting);
      socket.off('game_complete', handleGameComplete);
      socket.off('game_error', handleError);
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
      }
    };
  }, [socket, roomId]);

  // --- Handlers ---

  const handleCardClick = (cardId: string) => {
    if (!currentGameState || !socket) return;
    if (isBidding) return;
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

  const handleLeaveGame = () => {
    Alert.alert(
      'Oyundan Ayrıl',
      'Oyundan ayrılmak istediğine emin misin?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ayrıl',
          style: 'destructive',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleRequestNextRound = () => {
    if (socket) {
      socket.emit('request_next_round');
    }
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
      left: players[(myIdx + 1) % 4] || null,
      top: players[(myIdx + 2) % 4] || null,
      right: players[(myIdx + 3) % 4] || null,
    };
  };

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={styles.loadingText}>Oyun yükleniyor...</Text>
      </View>
    );
  }

  if (connectionError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{connectionError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentGameState) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Oyun durumu yükleniyor...</Text>
      </View>
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

  const renderOpponentSlot = (player: any, position: 'left' | 'top' | 'right') => {
    const getOpponentPositionStyle = () => {
      switch (position) {
        case 'left':
          return styles.opponentLeft;
        case 'top':
          return styles.opponentTop;
        case 'right':
          return styles.opponentRight;
        default:
          return {};
      }
    };

    if (!player) {
      return <View style={[styles.opponentSlot, getOpponentPositionStyle()]} />;
    }

    const playerIndex = currentGameState.players?.findIndex(p => p.id === player.id) ?? -1;
    const isActive = currentGameState.currentPlayerIndex === playerIndex;

    return (
      <View style={[styles.opponentSlot, getOpponentPositionStyle(), isActive && styles.opponentActive]}>
        <Text style={styles.oppIcon}>{player.type === 'bot' ? '🤖' : '👤'}</Text>
        <Text style={styles.oppName} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.oppTricks}>{player.tricksWon} el</Text>
        {formatPlayerBid(player.id) && (
          <Text style={styles.oppBid}>{formatPlayerBid(player.id)}</Text>
        )}
      </View>
    );
  };

  const renderTrickCard = (play: TrickCard, index: number) => {
    const slot = getTrickSlotForPlayer(play.playerId);
    const getTrickSlotStyle = () => {
      switch (slot) {
        case 'left':
          return styles.trickCardLeft;
        case 'top':
          return styles.trickCardTop;
        case 'right':
          return styles.trickCardRight;
        default:
          return styles.trickCardBottom;
      }
    };

    return (
      <View key={index} style={[styles.trickCard, getTrickSlotStyle()]}>
        <View style={styles.trickCardInner}>
          <Text style={[styles.trickRank, { color: '#fff' }]}>{getRankSymbol(play.card.rank)}</Text>
          <Text style={[styles.trickSuit, { color: getSuitColor(play.card.suit) }]}>
            {getSuitSymbol(play.card.suit)}
          </Text>
        </View>
      </View>
    );
  };

  const renderHandCard = (card: any, index: number) => {
    const isSelected = selectedCard === card.id;
    const isDisabled = (!isMyTurn && !isBidding) || isPlayingCard;
    const isViewing = isBidding;

    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.handCard,
          isSelected && styles.handCardSelected,
          isDisabled && styles.handCardDisabled,
          isViewing && styles.handCardViewing,
          { marginLeft: index === 0 ? 0 : -20 },
        ]}
        onPress={() => handleCardClick(card.id)}
        disabled={isDisabled}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.cardRank, { color: getSuitColor(card.suit) }]}>{getRankSymbol(card.rank)}</Text>
        <Text style={[styles.cardSuit, { color: getSuitColor(card.suit) }]}>{getSuitSymbol(card.suit)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ===== Mini Header ===== */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerRound}>R{currentRound}/{totalRounds}</Text>
          {currentGameState.trumpSuit && (
            <Text style={styles.headerTrump}>
              <Text style={{ color: getSuitColor(currentGameState.trumpSuit) }}>
                {getSuitSymbol(currentGameState.trumpSuit)}
              </Text>
              {' '}Koz
            </Text>
          )}
          <Text style={styles.headerTrickCount}>{currentGameState.tricks ?? 0}.el</Text>
          <Text style={styles.headerState}>{currentGameState.state}</Text>
        </View>
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={() => setShowScoreboard(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.hamburgerText}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* ===== Game Table ===== */}
      <View style={styles.gameTable}>
        {/* Top opponent */}
        {renderOpponentSlot(opponents.top, 'top')}

        {/* Left opponent */}
        {renderOpponentSlot(opponents.left, 'left')}

        {/* Center: Trick area / Bidding overlay */}
        <View style={styles.trickArea}>
          {isScoring ? (
            <View style={styles.scoringOverlay}>
              <ActivityIndicator size="large" color="#4ade80" />
              <Text style={styles.scoringText}>Skor hesaplanıyor...</Text>
            </View>
          ) : isBidding ? (
            <View style={styles.biddingOverlay}>
              <Text style={styles.bidHeader}>İhale - Kaç El?</Text>
              <Text style={styles.bidInfo}>
                {currentGameState.gameMode === 'koz_maca'
                  ? 'Koz Maça: ♠ koz, sadece el sayısı'
                  : selectedSuit
                    ? `${getSuitSymbol(selectedSuit)} koz — Min: ${getHighestBidForSuit(selectedSuit) + 1}`
                    : 'Önce koz rengi seç'
                }
              </Text>

              {/* Suit selection (İhaleli Batak only) */}
              {currentGameState.gameMode === 'ihaleli_batak' && !selectedSuit && (
                <View style={styles.suitSelection}>
                  {['spades', 'hearts', 'diamonds', 'clubs'].map((suit) => (
                    <TouchableOpacity
                      key={suit}
                      style={[styles.suitButton, !isMyTurn && styles.buttonDisabled]}
                      onPress={() => handleSuitSelect(suit)}
                      disabled={!isMyTurn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <Text style={[styles.suitSymbol, { color: getSuitColor(suit) }]}>
                        {getSuitSymbol(suit)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Bid numbers */}
              {(currentGameState.gameMode === 'koz_maca' || selectedSuit) && (
                <>
                  <ScrollView horizontal style={styles.bidNumbers} showsHorizontalScrollIndicator={false}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((amount) => (
                      <TouchableOpacity
                        key={amount}
                        style={[
                          styles.bidNumButton,
                          (!isMyTurn || !isValidBid(amount)) && styles.buttonDisabled,
                        ]}
                        onPress={() => handleBid(selectedSuit || 'spades', amount)}
                        disabled={!isMyTurn || !isValidBid(amount)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Text style={styles.bidNumText}>{amount}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={styles.bidActionsRow}>
                    <TouchableOpacity
                      style={[styles.passButton, !isMyTurn && styles.buttonDisabled]}
                      onPress={() => handleBid(selectedSuit || 'spades', 0)}
                      disabled={!isMyTurn}
                      activeOpacity={0.6}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.passButtonText}>Pas Geç</Text>
                    </TouchableOpacity>
                    {currentGameState.gameMode === 'ihaleli_batak' && selectedSuit && (
                      <TouchableOpacity
                        style={[styles.changeSuitButton, !isMyTurn && styles.buttonDisabled]}
                        onPress={() => setSelectedSuit(null)}
                        disabled={!isMyTurn}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Text style={styles.changeSuitButtonText}>Rengi Değiştir</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {currentGameState.bids && currentGameState.bids.length > 0 && getHighestBid() > 0 && (
                    <Text style={styles.highestBidText}>
                      En Yüksek: {getHighestBid()}{selectedSuit ? getSuitSymbol(selectedSuit) : '♠'}
                    </Text>
                  )}
                </>
              )}
            </View>
          ) : trickCards.length > 0 ? (
            <View style={[styles.trickSlots, isCollectingTrick && styles.trickCollecting]}>
              {trickCards.map((play, i) => renderTrickCard(play, i))}
            </View>
          ) : (
            <View style={[styles.trickStatus, isMyTurn && styles.myTurn]}>
              <Text style={styles.trickStatusText}>
                {isMyTurn ? 'Sıra sende' : `${currentGameState.players?.[currentGameState.currentPlayerIndex]?.name || 'Rakip'} oynuyor`}
              </Text>
            </View>
          )}
        </View>

        {/* Right opponent */}
        {renderOpponentSlot(opponents.right, 'right')}

        {/* My info bar */}
        <View style={styles.myInfoBar}>
          <View style={styles.infoItem}>
            <Text style={styles.infoValueName} numberOfLines={1}>{myPlayer?.name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>El:</Text>
            <Text style={styles.infoValue}>{myPlayer?.tricksWon ?? 0}</Text>
          </View>
          {formatPlayerBid(myPlayer?.id || '') && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>İhale:</Text>
              <Text style={styles.infoValue}>{formatPlayerBid(myPlayer?.id || '')}</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>S:</Text>
            <Text style={styles.infoValue}>{myPlayer?.totalScore ?? 0}</Text>
          </View>
        </View>

        {/* My Hand Strip */}
        {!isScoring && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.myHandStrip,
              isMyTurn && !isBidding && styles.myHandTurn,
            ]}
          >
            {myHand.map((card, index) => renderHandCard(card, index))}
          </ScrollView>
        )}
      </View>

      {/* ===== Scoreboard Modal ===== */}
      <Modal
        visible={showScoreboard}
        transparent
        animationType="slide"
        onRequestClose={() => setShowScoreboard(false)}
      >
        <View style={styles.scoreboardBackdrop}>
          <TouchableOpacity
            style={styles.scoreboardBackdropTouchable}
            activeOpacity={1}
            onPress={() => setShowScoreboard(false)}
          />
          <View style={styles.scoreboardPanel}>
            <Text style={styles.scoreboardTitle}>Skorlar</Text>
            <ScrollView style={styles.scoreboardList}>
              {currentGameState.players?.map((player) => (
                <View key={player.id} style={styles.sbPlayer}>
                  <Text style={[styles.sbName, player.id === playerId && styles.sbNameMe]} numberOfLines={1}>
                    {player.name}
                  </Text>
                  <View style={styles.sbScores}>
                    <Text style={styles.sbRound}>Round: {player.score ?? 0}</Text>
                    {player.totalScore !== undefined && (
                      <Text style={styles.sbTotal}>Total: {player.totalScore}</Text>
                    )}
                  </View>
                  <Text style={styles.sbTricks}>{player.tricksWon} el kazandı</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleLeaveGame}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.leaveButtonText}>Oyundan Çık</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== Round Complete Modal ===== */}
      <Modal
        visible={!!roundCompleteData}
        transparent
        animationType="fade"
        onRequestClose={() => setRoundCompleteData(null)}
      >
        <View style={styles.roundCompleteBackdrop}>
          <View style={styles.roundCompleteContent}>
            <Text style={styles.roundCompleteTitle}>Round {roundCompleteData?.roundNumber} Bitti!</Text>
            <Text style={styles.roundSubTitle}>
              Round {roundCompleteData?.roundNumber} / {roundCompleteData?.totalRounds}
            </Text>

            <View style={styles.roundScores}>
              <Text style={styles.roundScoresTitle}>Skorlar</Text>
              <ScrollView style={styles.roundScoresList}>
                {roundCompleteData?.players.map((player) => (
                  <View key={player.id} style={styles.roundScoreItem}>
                    <Text style={styles.rsName} numberOfLines={1}>{player.name}</Text>
                    <Text style={styles.rsScore}>+{player.score} (T: {player.totalScore})</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {currentRound < totalRounds ? (
              <TouchableOpacity
                style={styles.nextRoundButton}
                onPress={handleRequestNextRound}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.nextRoundButtonText}>Round {currentRound + 1} Başlat</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.roundFinalMessage}>
                <Text style={styles.roundFinalText}>Oyun bitti — Skorlar hesaplanıyor...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f1e',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
    height: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRound: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  headerTrump: {
    color: '#fff',
    fontSize: 12,
  },
  headerTrickCount: {
    color: '#fff',
    fontSize: 12,
  },
  headerState: {
    color: '#888',
    fontSize: 10,
    textTransform: 'capitalize',
  },
  hamburgerButton: {
    padding: 4,
  },
  hamburgerText: {
    color: '#fff',
    fontSize: 20,
  },

  // Game Table
  gameTable: {
    flex: 1,
    padding: 8,
  },

  // Opponent slots
  opponentSlot: {
    position: 'absolute',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  opponentActive: {
    borderColor: '#4ade80',
  },
  opponentTop: {
    top: 8,
    left: '50%',
    transform: [{ translateX: -60 }],
    width: 120,
  },
  opponentLeft: {
    left: 8,
    top: '50%',
    transform: [{ translateY: -40 }],
    width: 100,
  },
  opponentRight: {
    right: 8,
    top: '50%',
    transform: [{ translateY: -40 }],
    width: 100,
  },
  oppIcon: {
    fontSize: 16,
  },
  oppName: {
    color: '#fff',
    fontSize: 11,
    marginTop: 2,
  },
  oppTricks: {
    color: '#888',
    fontSize: 10,
    marginTop: 2,
  },
  oppBid: {
    color: '#fbbf24',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },

  // Trick area
  trickArea: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -80 }],
    width: 200,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trickSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: 200,
    height: 160,
  },
  trickCollecting: {
    opacity: 0.5,
  },
  trickCard: {
    position: 'absolute',
    width: 50,
    height: 70,
    backgroundColor: '#fff',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  trickCardBottom: {
    bottom: 10,
  },
  trickCardLeft: {
    left: 10,
  },
  trickCardTop: {
    top: 10,
  },
  trickCardRight: {
    right: 10,
  },
  trickCardInner: {
    alignItems: 'center',
  },
  trickRank: {
    fontSize: 18,
    fontWeight: '700',
  },
  trickSuit: {
    fontSize: 20,
    marginTop: -4,
  },

  // Trick status
  trickStatus: {
    padding: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
  },
  myTurn: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  trickStatusText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },

  // Bidding overlay
  biddingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 15, 30, 0.95)',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bidHeader: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  bidInfo: {
    color: '#888',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  suitSelection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  suitButton: {
    width: 50,
    height: 50,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2a2a4e',
  },
  suitSymbol: {
    fontSize: 24,
  },
  bidNumbers: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  bidNumButton: {
    width: 36,
    height: 36,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#2a2a4e',
  },
  bidNumText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bidActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  passButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  passButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  changeSuitButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changeSuitButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  highestBidText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Scoring overlay
  scoringOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoringText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },

  // My info bar
  myInfoBar: {
    position: 'absolute',
    bottom: 90,
    left: 8,
    right: 8,
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'space-around',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    color: '#888',
    fontSize: 11,
  },
  infoValue: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoValueName: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 80,
  },

  // My hand strip
  myHandStrip: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    minHeight: 80,
  },
  myHandTurn: {
    borderWidth: 2,
    borderColor: '#4ade80',
  },
  handCard: {
    width: 60,
    height: 84,
    backgroundColor: '#fff',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  handCardSelected: {
    transform: [{ translateY: -10 }],
    borderWidth: 2,
    borderColor: '#4ade80',
  },
  handCardDisabled: {
    opacity: 0.5,
  },
  handCardViewing: {
    opacity: 0.8,
  },
  cardRank: {
    fontSize: 18,
    fontWeight: '700',
  },
  cardSuit: {
    fontSize: 20,
    marginTop: -2,
  },

  // Scoreboard modal
  scoreboardBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  scoreboardBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  scoreboardPanel: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  scoreboardTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  scoreboardList: {
    marginBottom: 16,
  },
  sbPlayer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  sbName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  sbNameMe: {
    color: '#4ade80',
    fontWeight: '600',
  },
  sbScores: {
    alignItems: 'flex-end',
  },
  sbRound: {
    color: '#888',
    fontSize: 12,
  },
  sbTotal: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  sbTricks: {
    color: '#fbbf24',
    fontSize: 11,
  },
  leaveButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Round complete modal
  roundCompleteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundCompleteContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  roundCompleteTitle: {
    color: '#4ade80',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  roundSubTitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  roundScores: {
    marginBottom: 20,
  },
  roundScoresTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  roundScoresList: {
    maxHeight: 150,
  },
  roundScoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4e',
  },
  rsName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  rsScore: {
    color: '#4ade80',
    fontSize: 14,
    fontWeight: '600',
  },
  nextRoundButton: {
    backgroundColor: '#4ade80',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextRoundButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  roundFinalMessage: {
    padding: 12,
    backgroundColor: '#2a2a4e',
    borderRadius: 8,
    alignItems: 'center',
  },
  roundFinalText: {
    color: '#888',
    fontSize: 14,
  },
});
