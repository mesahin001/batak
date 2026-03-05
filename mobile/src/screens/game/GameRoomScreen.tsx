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
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { GameClientState, RoundCompleteData, GameState } from '../../types/game';
import { COLORS, SHADOWS, RADIUS } from '../../styles/tokens';
import { soundManager } from '../../utils/SoundManager';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
  const [showTrickWinner, setShowTrickWinner] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  const isPlayingCardRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevScoresRef = useRef<Record<string, number>>({});

  // Animation refs (visual only, doesn't affect gameplay)
  const turnGlowAnim = useRef(new Animated.Value(8)).current;
  const winnerTextOpacity = useRef(new Animated.Value(0)).current;
  const winnerTextY = useRef(new Animated.Value(0)).current;

  // Particle animations (12 particles)
  const particleAnims = useRef(
    Array.from({ length: 12 }, () => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

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
        // Trick complete → play trick-win sound (haptic feedback) + particle burst
        if (prev && prev.currentTrick?.cards?.length === 4 && state.currentTrick?.cards?.length === 0) {
          setIsCollectingTrick(true);
          setShowParticles(true);
          soundManager.play('trick-win');

          // Start particle animation
          triggerParticleBurst();

          setTimeout(() => setIsCollectingTrick(false), 800);
          setTimeout(() => setShowParticles(false), 2000);
        }

        // New round started → play card-shuffle sound (haptic feedback)
        if (prev && prev.state !== 'bidding' && state.state === 'bidding') {
          soundManager.play('card-shuffle');
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

      // Show +1 animation (visual only, doesn't affect gameplay)
      setShowTrickWinner(true);
      winnerTextOpacity.setValue(1);
      winnerTextY.setValue(0);

      Animated.parallel([
        Animated.timing(winnerTextOpacity, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(winnerTextY, {
          toValue: -40,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowTrickWinner(false);
      });
    };

    const handleRoundComplete = (data: RoundCompleteData) => {
      setRoundCompleteData(data);
      soundManager.play('round-complete'); // Sound effect (haptic feedback)
      clearPlayingState();
    };

    const handleNextRoundStarting = () => {
      setRoundCompleteData(null);
      setSelectedSuit(null);
    };

    const handleGameComplete = (data: any) => {
      clearPlayingState();
      soundManager.play('game-complete'); // Sound effect (haptic feedback)
      // Navigate to result screen with game completion data
      navigation.navigate('GameResult' as never, { roomId, gameData: data } as never);
    };

    const handleError = (error: any) => {
      clearPlayingState();
      const errorMessage = error?.message || t('game.cardPlayError');
      Alert.alert(t('common.error'), errorMessage);
    };

    socket.on('game_state_update', handleGameStateUpdate);
    socket.on('card_played', handleCardPlayed);
    socket.on('trick_complete', handleTrickComplete);
    socket.on('round_complete', handleRoundComplete);
    socket.on('next_round_starting', handleNextRoundStarting);
    socket.on('game_complete', handleGameComplete);
    socket.on('game_error', handleError);

    return () => {
      // Notify server that player is leaving when component unmounts
      if (playerId) {
        socket.emit('leave_game', { publicKey: playerId });
      }

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
  }, [socket, roomId, playerId]);

  // Turn glow animation (visual only - doesn't affect gameplay)
  useEffect(() => {
    if (isMyTurn && !isBidding) {
      // Pulse the glow between 8 and 12 shadowRadius
      Animated.loop(
        Animated.sequence([
          Animated.timing(turnGlowAnim, {
            toValue: 12,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false, // shadowRadius doesn't support native driver
          }),
          Animated.timing(turnGlowAnim, {
            toValue: 8,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      // Reset when not my turn
      turnGlowAnim.setValue(8);
    }
  }, [isMyTurn, isBidding, turnGlowAnim]);

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
    soundManager.play('card-play'); // Sound effect (haptic feedback)
  };

  const handleBid = (suit: string, amount: number) => {
    if (!socket) return;
    socket.emit('bid_trump', { suit, amount });
    soundManager.play('bid-placed'); // Sound effect (haptic feedback)
  };

  const handleSuitSelect = (suit: string) => {
    setSelectedSuit(suit);
  };

  const handleLeaveGame = () => {
    Alert.alert(
      t('game.leaveGame'),
      t('game.leaveConfirm'),
      [
        { text: t('app.cancel'), style: 'cancel' },
        {
          text: t('game.leave'),
          style: 'destructive',
          onPress: () => {
            // Notify server that player is leaving
            if (socket && playerId) {
              socket.emit('leave_game', { publicKey: playerId });
            }
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

  /**
   * Trigger particle burst animation (visual only)
   */
  const triggerParticleBurst = () => {
    // Reset all particles to initial state
    particleAnims.forEach(anim => {
      anim.opacity.setValue(1);
      anim.translateX.setValue(0);
      anim.translateY.setValue(0);
      anim.rotate.setValue(0);
    });

    // Animate all particles simultaneously
    const animations = particleAnims.map((anim, i) => {
      const angle = (Math.PI * 2 * i) / 12; // Evenly distribute around circle
      const distance = 100 + Math.random() * 100; // Random distance 100-200
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;

      return Animated.parallel([
        Animated.timing(anim.opacity, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateX, {
          toValue: targetX,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: targetY,
          duration: 1500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(anim.rotate, {
          toValue: Math.random() * 360,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]);
    });

    Animated.parallel(animations).start();
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
    if (bid.amount === 0) return t('game.pass');
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
        <StatusBar hidden={true} />
        <ActivityIndicator size="large" color="#4ade80" />
        <Text style={styles.loadingText}>{t('game.loadingGame')}</Text>
      </View>
    );
  }

  if (connectionError) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden={true} />
        <Text style={styles.errorText}>{connectionError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryButtonText}>{t('game.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentGameState) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden={true} />
        <Text style={styles.loadingText}>{t('game.loadingState')}</Text>
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

    const bidText = formatPlayerBid(player.id);

    return (
      <View style={[styles.opponentSlot, getOpponentPositionStyle(), isActive && styles.opponentActive]}>
        <Text style={styles.oppIcon}>{player.type === 'bot' ? '🤖' : '👤'}</Text>
        <Text style={styles.oppName} numberOfLines={1}>{player.name}</Text>
        <View style={styles.oppStats}>
          <Text style={styles.oppTricks}>{player.tricksWon ?? 0}{t('game.trickAbbr')}</Text>
          {bidText && (
            <>
              <Text style={styles.oppStatsSeparator}> • </Text>
              <Text style={styles.oppBid}>{bidText}</Text>
            </>
          )}
        </View>
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
          <Text style={[styles.trickRank, { color: getSuitColor(play.card.suit) }]}>{getRankSymbol(play.card.rank)}</Text>
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
          { marginLeft: index === 0 ? 0 : -10 },
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
      <StatusBar hidden={true} />
      {/* ===== Mini Header ===== */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerRound}>R{currentRound}/{totalRounds}</Text>
          {currentGameState.trumpSuit && (
            <Text style={styles.headerTrump}>
              <Text style={{ color: getSuitColor(currentGameState.trumpSuit) }}>
                {getSuitSymbol(currentGameState.trumpSuit)}
              </Text>
              {' '}{t('game.trump')}
            </Text>
          )}
          <Text style={styles.headerTrickCount}>{currentGameState.tricks ?? 0}{t('game.trickAbbr')}</Text>
          <Text style={styles.headerState}>{t('game.' + currentGameState.state, { defaultValue: currentGameState.state })}</Text>
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

        {/* Center: Trick area */}
        <View style={styles.trickArea}>
          {/* ===== Particle Effects (trick collection) ===== */}
          {showParticles && (
            <View style={styles.particlesContainer} pointerEvents="none">
              {particleAnims.map((anim, i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.particle,
                    {
                      opacity: anim.opacity,
                      transform: [
                        { translateX: anim.translateX },
                        { translateY: anim.translateY },
                        {
                          rotate: anim.rotate.interpolate({
                            inputRange: [0, 360],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {isScoring ? (
            <View style={styles.scoringOverlay}>
              <ActivityIndicator size="large" color="#4ade80" />
              <Text style={styles.scoringText}>{t('game.calculating')}</Text>
            </View>
          ) : isBidding ? (
            <View style={[styles.trickStatus, isMyTurn && styles.myTurn]}>
              <Text style={styles.trickStatusText}>{t('game.biddingInProgress')}</Text>
            </View>
          ) : trickCards.length > 0 ? (
            <View style={[styles.trickSlots, isCollectingTrick && styles.trickCollecting]}>
              {trickCards.map((play, i) => renderTrickCard(play, i))}
            </View>
          ) : (
            <View style={[styles.trickStatus, isMyTurn && styles.myTurn]}>
              <Text style={styles.trickStatusText}>
                {isMyTurn ? t('game.yourTurn') : t('game.playerPlaying', { name: currentGameState.players?.[currentGameState.currentPlayerIndex]?.name || '' })}
              </Text>
            </View>
          )}

          {/* Trick winner +1 animation (visual only) */}
          {showTrickWinner && (
            <Animated.View
              style={[
                styles.winnerTextContainer,
                {
                  opacity: winnerTextOpacity,
                  transform: [{ translateY: winnerTextY }],
                },
              ]}
              pointerEvents="none"
            >
              <Text style={styles.winnerText}>+1</Text>
            </Animated.View>
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
            <Text style={styles.infoLabel}>{t('game.tricksLabel')}</Text>
            <Text style={styles.infoValue}>{myPlayer?.tricksWon ?? 0}</Text>
          </View>
          {formatPlayerBid(myPlayer?.id || '') && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>{t('game.bidLabel')}</Text>
              <Text style={styles.infoValue}>{formatPlayerBid(myPlayer?.id || '')}</Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>{t('game.scoreLabel')}</Text>
            <Text style={styles.infoValue}>{myPlayer?.totalScore ?? 0}</Text>
          </View>
        </View>

        {/* My Hand Strip */}
        {!isScoring && (
          <Animated.View
            style={[
              styles.myHandStripWrapper,
              isMyTurn && !isBidding && {
                shadowColor: '#FFD700',
                shadowRadius: turnGlowAnim,
                shadowOpacity: 0.6,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          >
            <View style={[styles.myHandContainer, isMyTurn && !isBidding && styles.myHandTurn]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.myHandStrip}
              >
                {myHand.map((card, index) => renderHandCard(card, index))}
              </ScrollView>
            </View>
          </Animated.View>
        )}
      </View>

      {/* ===== Bidding Overlay (Above all) ===== */}
      {isBidding && (
        <View style={styles.biddingOverlay}>
          <Text style={styles.bidHeader}>{t('game.biddingTitle')}</Text>
          <Text style={styles.bidInfo}>
            {currentGameState.gameMode === 'koz_maca'
              ? t('game.kozMacaBidHint')
              : selectedSuit
                ? t('game.minBidHint', { suit: getSuitSymbol(selectedSuit), min: getHighestBidForSuit(selectedSuit) + 1 })
                : t('game.selectTrumpSuit')
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
              <View style={styles.bidNumbers}>
                <View style={styles.bidNumbersContent}>
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
                </View>
              </View>
              <View style={styles.bidActionsRow}>
                <TouchableOpacity
                  style={[styles.passButton, !isMyTurn && styles.buttonDisabled]}
                  onPress={() => handleBid(selectedSuit || 'spades', 0)}
                  disabled={!isMyTurn}
                  activeOpacity={0.6}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.passButtonText}>{t('game.passBid')}</Text>
                </TouchableOpacity>
              </View>
              {currentGameState.bids && currentGameState.bids.length > 0 && getHighestBid() > 0 && (
                <Text style={styles.highestBidText}>
                  {t('game.highestBid', { amount: getHighestBid(), suit: selectedSuit ? getSuitSymbol(selectedSuit) : '♠' })}
                </Text>
              )}
            </>
          )}
        </View>
      )}

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
            <Text style={styles.scoreboardTitle}>{t('game.scores')}</Text>
            <ScrollView style={styles.scoreboardList}>
              {currentGameState.players?.map((player) => (
                <View key={player.id} style={styles.sbPlayer}>
                  <Text style={[styles.sbName, player.id === playerId && styles.sbNameMe]} numberOfLines={1}>
                    {player.name}
                  </Text>
                  <View style={styles.sbScores}>
                    <Text style={styles.sbRound}>{t('game.roundScore')} {player.score ?? 0}</Text>
                    {player.totalScore !== undefined && (
                      <Text style={styles.sbTotal}>{t('game.totalScore')}: {player.totalScore}</Text>
                    )}
                  </View>
                  <Text style={styles.sbTricks}>{t('game.tricksWonLabel', { count: player.tricksWon })}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleLeaveGame}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.leaveButtonText}>{t('game.leaveGame')}</Text>
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
            <Text style={styles.roundCompleteTitle}>{t('game.roundComplete', { number: roundCompleteData?.roundNumber })}</Text>
            <Text style={styles.roundSubTitle}>
              {t('game.roundProgress', { number: roundCompleteData?.roundNumber, total: roundCompleteData?.totalRounds })}
            </Text>

            <View style={styles.roundScores}>
              <Text style={styles.roundScoresTitle}>{t('game.scores')}</Text>
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
                <Text style={styles.nextRoundButtonText}>{t('game.startRound', { number: currentRound + 1 })}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.roundFinalMessage}>
                <Text style={styles.roundFinalText}>{t('game.gameFinishing')}</Text>
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
    backgroundColor: COLORS.feltDark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.feltDark,
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
    backgroundColor: COLORS.feltDark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.goldPrimary,
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
    backgroundColor: COLORS.feltLight,
    borderRadius: RADIUS.md,
    padding: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.feltLight,
    minHeight: 80,
    ...SHADOWS.sm,
  },
  opponentActive: {
    borderColor: COLORS.goldPrimary,
    ...SHADOWS.glowSm,
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
  oppStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  oppTricks: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '700',
  },
  oppStatsSeparator: {
    color: '#666',
    fontSize: 12,
    marginHorizontal: 2,
  },
  oppBid: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },

  // Trick area
  trickArea: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -100 }, { translateY: -100 }],
    width: 200,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Particle effects
  particlesContainer: {
    position: 'absolute',
    top: 80, // Center of trick area
    left: 100,
    width: 0,
    height: 0,
    zIndex: 9999,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.goldPrimary,
    shadowColor: COLORS.goldPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    shadowOpacity: 0.8,
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
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
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
  winnerTextContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -20 }],
  },
  winnerText: {
    color: '#4ade80',
    fontSize: 48,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Bidding overlay
  biddingOverlay: {
    position: 'absolute',
    top: 40,
    left: 8,
    right: 8,
    bottom: 140,
    backgroundColor: 'rgba(13, 40, 24, 0.98)',
    borderRadius: RADIUS.lg,
    borderTopWidth: 2,
    borderTopColor: COLORS.goldPrimary,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
    ...SHADOWS.lg,
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
    backgroundColor: COLORS.feltBase,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.feltLight,
  },
  suitSymbol: {
    fontSize: 24,
  },
  bidNumbers: {
    marginBottom: 12,
    height: 60,
    padding: 4,
    width: '100%',
  },
  bidNumbersContent: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  bidNumButton: {
    width: 32,
    height: 44,
    backgroundColor: COLORS.goldPrimary,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.goldLight,
    marginHorizontal: 2,
    marginRight: 6,
    ...SHADOWS.sm,
  },
  bidNumText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
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
    bottom: 100,
    left: 8,
    right: 8,
    flexDirection: 'row',
    backgroundColor: COLORS.feltDark,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.goldPrimary,
    padding: 8,
    justifyContent: 'space-around',
    zIndex: 9999,
    elevation: 9999,
    ...SHADOWS.md,
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

  // My hand strip wrapper (for glow animation)
  myHandStripWrapper: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    zIndex: 9998,
    elevation: 9998,
  },
  // My hand container (background and border)
  myHandContainer: {
    backgroundColor: COLORS.feltDark,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.feltLight,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  // My hand strip (scroll content)
  myHandStrip: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myHandTurn: {
    borderWidth: 2,
    borderColor: COLORS.goldPrimary,
    ...SHADOWS.glowSm,
  },
  handCard: {
    width: 60,
    height: 84,
    backgroundColor: COLORS.cardBg,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.md,
  },
  handCardSelected: {
    transform: [{ translateY: -10 }],
    borderWidth: 2,
    borderColor: COLORS.goldPrimary,
    ...SHADOWS.glow,
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
    backgroundColor: COLORS.feltDark,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderTopWidth: 2,
    borderTopColor: COLORS.goldPrimary,
    padding: 20,
    maxHeight: '70%',
    ...SHADOWS.lg,
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
    backgroundColor: COLORS.feltDark,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.goldPrimary,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...SHADOWS.lg,
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
