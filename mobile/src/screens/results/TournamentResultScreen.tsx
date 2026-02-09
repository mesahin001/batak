/**
 * Tournament Result Screen - Final tournament results with celebration
 * Shows winner, rankings, round history, and NFT claim button
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { GameCompleteData } from '../../types/game';

interface RouteParams {
  tournamentId: string;
}

interface PlayerWithRank {
  id: string;
  name: string;
  type: 'human' | 'bot';
  totalScore: number;
  roundScores: number[];
  tricksWon: number;
  rank: number;
}

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  rotation: Animated.Value;
  translateY: Animated.Value;
  translateX: Animated.Value;
  scale: Animated.Value;
}

const CONFETTI_EMOJIS = ['🎉', '🎊', '✨', '⭐', '🏆', '💫', '🌟', '💜', '💙', '💚'];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const TournamentResultScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { socket } = useSocket();
  const { playerId } = useAuth();

  const params = route.params as RouteParams;
  const { tournamentId } = params;

  const [gameData, setGameData] = useState<GameCompleteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingReward, setClaimingReward] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [showRoundHistory, setShowRoundHistory] = useState(false);

  // Confetti animation
  const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (!socket || !tournamentId) return;

    // Get tournament results from game state
    socket.emit('get_game_state', { roomId: tournamentId }, (response: any) => {
      if (response.gameState) {
        // Transform to GameCompleteData format
        const state = response.gameState;
        if (state.state === 'finished' && state.winner) {
          const completeData: GameCompleteData = {
            winner: state.winner,
            winnerName: state.players.find((p: any) => p.id === state.winner)?.name || 'Unknown',
            players: state.players.map((p: any) => ({
              id: p.id,
              name: p.name,
              type: p.type,
              score: p.score,
              totalScore: p.totalScore,
              roundScores: p.roundScores || [],
              tricksWon: p.tricksWon,
            })),
            roundHistory: state.roundHistory || [],
            totalRounds: state.totalRounds || 0,
            roundsPlayed: state.currentRound || 0,
          };
          setGameData(completeData);

          // Start confetti if player won
          if (state.winner === playerId) {
            startConfetti();
          }
        }
      }
      setLoading(false);
    });
  }, [socket, tournamentId, playerId]);

  /**
   * Start confetti animation
   */
  const startConfetti = () => {
    const particles: ConfettiParticle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: -50 - Math.random() * 200,
      emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
      rotation: new Animated.Value(0),
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      scale: new Animated.Value(1),
    }));

    setConfetti(particles);

    // Animate each particle
    particles.forEach((particle) => {
      const duration = 2000 + Math.random() * 2000;
      const delay = Math.random() * 500;

      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(particle.translateY, {
            toValue: SCREEN_HEIGHT + 100,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(particle.translateX, {
            toValue: (Math.random() - 0.5) * 200,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(particle.rotation, {
            toValue: 360,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 0,
            duration: duration * 0.3,
            delay: duration * 0.7,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

    // Clear confetti after animation
    setTimeout(() => {
      setConfetti([]);
    }, 4000);
  };

  /**
   * Get sorted players with ranks
   */
  const getSortedPlayers = (): PlayerWithRank[] => {
    if (!gameData?.players) return [];

    return [...gameData.players]
      .sort((a, b) => a.totalScore - b.totalScore)
      .map((player, index) => ({
        ...player,
        rank: index + 1,
      }));
  };

  /**
   * Get winner info
   */
  const getWinner = () => {
    const sorted = getSortedPlayers();
    return sorted[0];
  };

  /**
   * Check if current player is winner
   */
  const isPlayerWinner = (): boolean => {
    return gameData?.winner === playerId;
  };

  /**
   * Handle NFT claim
   */
  const handleClaimReward = () => {
    if (!socket || claimingReward || rewardClaimed) return;

    setClaimingReward(true);

    // Simulate claiming process
    setTimeout(() => {
      setClaimingReward(false);
      setRewardClaimed(true);
    }, 2000);
  };

  /**
   * Get medal emoji for rank
   */
  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  /**
   * Render player ranking item
   */
  const renderPlayerItem = (player: PlayerWithRank) => {
    const isWinner = player.rank === 1;
    const isCurrentUser = player.id === playerId;

    return (
      <View key={player.id} style={[
        styles.playerItem,
        isWinner && styles.playerItemWinner,
        isCurrentUser && styles.playerItemCurrentUser
      ]}>
        {/* Rank */}
        <View style={styles.rankContainer}>
          <Text style={styles.medalEmoji}>{getMedalEmoji(player.rank)}</Text>
        </View>

        {/* Player Info */}
        <View style={styles.playerInfo}>
          <View style={styles.playerNameRow}>
            <Text style={styles.playerName}>{player.name}</Text>
            {player.type === 'bot' && (
              <Text style={styles.botBadge}>🤖</Text>
            )}
          </View>
          <Text style={styles.totalScore}>{player.totalScore} pts</Text>
        </View>

        {/* Stats */}
        <View style={styles.playerStats}>
          <Text style={styles.tricksWon}>{player.tricksWon} tricks</Text>
        </View>
      </View>
    );
  };

  /**
   * Render player item with round breakdown
   */
  const renderPlayerItemDetailed = (player: PlayerWithRank) => {
    const isWinner = player.rank === 1;
    const isCurrentUser = player.id === playerId;

    return (
      <View key={player.id} style={[
        styles.playerItemDetailed,
        isWinner && styles.playerItemWinner,
        isCurrentUser && styles.playerItemCurrentUser
      ]}>
        <View style={styles.playerItemHeader}>
          {/* Rank */}
          <View style={styles.rankContainer}>
            <Text style={styles.medalEmoji}>{getMedalEmoji(player.rank)}</Text>
          </View>

          {/* Player Info */}
          <View style={styles.playerInfo}>
            <View style={styles.playerNameRow}>
              <Text style={styles.playerName}>{player.name}</Text>
              {player.type === 'bot' && (
                <Text style={styles.botBadge}>🤖</Text>
              )}
            </View>
            <Text style={styles.totalScore}>{player.totalScore} pts</Text>
          </View>

          {/* Stats */}
          <View style={styles.playerStats}>
            <Text style={styles.tricksWon}>{player.tricksWon} tricks</Text>
          </View>
        </View>

        {/* Round Scores */}
        {player.roundScores && player.roundScores.length > 0 && (
          <View style={styles.roundScoresWrapper}>
            <Text style={styles.roundScoresTitle}>Round Scores</Text>
            <View style={styles.roundScoresContainer}>
              {player.roundScores.map((score, index) => (
                <View key={index} style={[
                  styles.roundScoreBadge,
                  score < 0 && styles.roundScoreNegative
                ]}>
                  <Text style={styles.roundScoreText}>{score}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  /**
   * Render confetti particles
   */
  const renderConfetti = () => {
    return confetti.map((particle) => (
      <Animated.View
        key={particle.id}
        style={[
          styles.confettiParticle,
          {
            left: particle.x,
            top: particle.y,
            transform: [
              { translateX: particle.translateX },
              { translateY: particle.translateY },
              { rotate: particle.rotation.interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg'],
              })},
              { scale: particle.scale },
            ],
          },
        ]}
      >
        <Text style={styles.confettiEmoji}>{particle.emoji}</Text>
      </Animated.View>
    ));
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Loading results...</Text>
        </View>
      </View>
    );
  }

  // No game data
  if (!gameData) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Tournament results not available</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sortedPlayers = getSortedPlayers();
  const winner = getWinner();
  const playerWon = isPlayerWinner();

  return (
    <View style={styles.container}>
      {/* Confetti Overlay */}
      {confetti.length > 0 && (
        <View style={styles.confettiContainer} pointerEvents="none">
          {renderConfetti()}
        </View>
      )}

      <ScrollView style={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {playerWon ? '🎉 Victory!' : 'Game Over'}
          </Text>
          <Text style={styles.subtitle}>
            {winner?.name} won with {winner?.totalScore} points!
          </Text>
        </View>

        {/* Winner Card */}
        <View style={styles.winnerCard}>
          <Text style={styles.winnerEmoji}>🏆</Text>
          <Text style={styles.winnerName}>{winner?.name}</Text>
          <Text style={styles.winnerScore}>{winner?.totalScore} points</Text>
          {playerWon && (
            <Text style={styles.winnerMessage}>Congratulations!</Text>
          )}
        </View>

        {/* Rankings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final Rankings</Text>

          {sortedPlayers.map((player) =>
            showRoundHistory
              ? renderPlayerItemDetailed(player)
              : renderPlayerItem(player)
          )}
        </View>

        {/* Toggle Round History */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowRoundHistory(!showRoundHistory)}
        >
          <Text style={styles.toggleButtonText}>
            {showRoundHistory ? 'Hide Round History' : 'Show Round History'}
          </Text>
        </TouchableOpacity>

        {/* NFT Claim Card (for winners) */}
        {playerWon && (
          <View style={styles.rewardCard}>
            <Text style={styles.rewardTitle}>🎁 Your Reward</Text>
            <Text style={styles.rewardDescription}>
              You've earned a commemorative cNFT!
            </Text>

            {rewardClaimed ? (
              <View style={styles.rewardClaimed}>
                <Text style={styles.rewardClaimedText}>✅ Claimed!</Text>
                <Text style={styles.rewardClaimedSub}>
                  Check your wallet for the NFT
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.claimButton, claimingReward && styles.claimButtonDisabled]}
                onPress={handleClaimReward}
                disabled={claimingReward}
              >
                {claimingReward ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={styles.claimButtonText}>Claim NFT Reward</Text>
                    <Text style={styles.claimButtonSub}>Mint to your wallet</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tournament Info */}
        <View style={styles.tournamentInfo}>
          <Text style={styles.tournamentInfoText}>
            Rounds: {gameData.roundsPlayed} / {gameData.totalRounds}
          </Text>
        </View>
      </ScrollView>

      {/* Back to Lobby Button */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Lobby' as never)}
      >
        <Text style={styles.actionButtonText}>Back to Lobby</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  confettiParticle: {
    position: 'absolute',
  },
  confettiEmoji: {
    fontSize: 24,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  winnerCard: {
    backgroundColor: 'linear-gradient(135deg, #e94560, #533483)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#e94560',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  winnerEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  winnerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  winnerScore: {
    fontSize: 20,
    color: '#FFD700',
    fontWeight: '700',
    marginBottom: 8,
  },
  winnerMessage: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    marginLeft: 4,
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  playerItemDetailed: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  playerItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerItemWinner: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#2a2a4e',
  },
  playerItemCurrentUser: {
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
  },
  medalEmoji: {
    fontSize: 24,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  botBadge: {
    fontSize: 14,
    marginLeft: 6,
  },
  totalScore: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '700',
  },
  playerStats: {
    alignItems: 'flex-end',
  },
  tricksWon: {
    fontSize: 12,
    color: '#888',
  },
  roundScoresWrapper: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a3a5e',
  },
  roundScoresTitle: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  roundScoresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  roundScoreBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3a3a5e',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  roundScoreNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  roundScoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  toggleButton: {
    backgroundColor: '#3a3a5e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  rewardCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#6C63FF',
  },
  rewardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardDescription: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  claimButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  claimButtonDisabled: {
    opacity: 0.6,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  claimButtonSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  rewardClaimed: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  rewardClaimedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
    marginBottom: 4,
  },
  rewardClaimedSub: {
    fontSize: 12,
    color: '#888',
  },
  tournamentInfo: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  tournamentInfoText: {
    fontSize: 14,
    color: '#888',
  },
  actionButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    paddingVertical: 18,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  backButton: {
    backgroundColor: '#3a3a5e',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 40,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
});
