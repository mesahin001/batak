/**
 * Game Result Screen - Single game results display
 * Shows final rankings and round breakdown for a completed game
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { GameClientState, PlayerState } from '../../types/game';

interface RouteParams {
  roomId: string;
  gameData?: any; // Game completion data passed from GameRoomScreen
}

interface PlayerWithRank extends PlayerState {
  rank: number;
}

export const GameResultScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { socket } = useSocket();
  const { playerId } = useAuth();

  const params = route.params as RouteParams;
  const { roomId } = params;

  const [gameState, setGameState] = useState<GameClientState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRoundBreakdown, setShowRoundBreakdown] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  useEffect(() => {
    // If gameData was passed from GameRoomScreen, use it directly
    const params = route.params as RouteParams;
    if (params.gameData) {
      // Convert game completion data to GameClientState format
      const completionData = params.gameData;
      const gameState: GameClientState = {
        state: 'finished',
        gameMode: completionData.gameMode || 'koz_maca',
        players: completionData.players || [],
        currentRound: completionData.roundsPlayed || 0,
        totalRounds: completionData.totalRounds || 5,
        winner: completionData.winner,
        roundHistory: completionData.roundHistory || [],
        // Add other required fields for compatibility
        deck: [],
        hands: [],
        currentTrick: null,
        bids: [],
        trump: null,
        leadSuit: null,
        currentTurn: null,
      };
      setGameState(gameState);
      setLoading(false);
      return;
    }

    // Fallback: try to fetch from server (for backwards compatibility)
    if (!socket || !roomId) return;

    socket.emit('get_game_state', { roomId }, (response: any) => {
      if (response.gameState) {
        setGameState(response.gameState);
      }
      setLoading(false);
    });
  }, [socket, roomId, route.params]);

  useEffect(() => {
    if (!socket) return;
    socket.on('reward_minted', (data: { signature?: string }) => {
      setClaimingReward(false);
      setRewardClaimed(true);
      if (data.signature) {
        Alert.alert(
          '🏆 NFT Ödülü Mint Edildi!',
          `Cüzdanına gönderildi!\n\nTx: ${data.signature.slice(0, 20)}...`,
          [{ text: 'Tamam' }]
        );
      }
    });
    return () => { socket.off('reward_minted'); };
  }, [socket]);

  /**
   * Sort players by total score (lowest first for Batak rules)
   */
  const getSortedPlayers = (): PlayerWithRank[] => {
    if (!gameState?.players) return [];

    const sorted = [...gameState.players]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((player, index) => ({ ...player, rank: index + 1 }));

    return sorted;
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
    if (gameState?.winner) return gameState.winner === playerId;
    const winner = getWinner(); // fallback
    return winner?.id === playerId;
  };

  const handleClaimReward = () => {
    if (!socket || claimingReward || rewardClaimed || !playerId) return;
    setClaimingReward(true);
    socket.emit('claim_reward', { tournamentId: roomId, publicKey: playerId }, (response: any) => {
      setClaimingReward(false);
      if (response?.error) {
        Alert.alert('Hata', response.error);
      } else {
        setRewardClaimed(true);
      }
    });
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
   * Render round scores for a player
   */
  const renderRoundScores = (player: PlayerWithRank) => {
    if (!player.roundScores || player.roundScores.length === 0) {
      return <Text style={styles.noRoundsText}>{t('game_result.noRoundsPlayed')}</Text>;
    }

    return (
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
    );
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
          <Text style={styles.totalScore}>{player.totalScore} {t('game_result.points')}</Text>
        </View>

        {/* Stats */}
        <View style={styles.playerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{player.tricksWon}</Text>
            <Text style={styles.statLabel}>{t('game_result.tricks')}</Text>
          </View>
        </View>
      </View>
    );
  };

  /**
   * Render detailed player item with round breakdown
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
            <Text style={styles.totalScore}>{player.totalScore} {t('game_result.points')}</Text>
          </View>

          {/* Stats */}
          <View style={styles.playerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{player.tricksWon}</Text>
              <Text style={styles.statLabel}>{t('game_result.tricks')}</Text>
            </View>
          </View>
        </View>

        {/* Round Scores */}
        <View style={styles.roundScoresWrapper}>
          <Text style={styles.roundScoresTitle}>{t('game_result.roundScores')}</Text>
          {renderRoundScores(player)}
        </View>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>{t('game_result.loading')}</Text>
        </View>
      </View>
    );
  }

  // No game state
  if (!gameState) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{t('game_result.notAvailable')}</Text>
        </View>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{t('game.goBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sortedPlayers = getSortedPlayers();
  const winner = getWinner();
  const playerWon = isPlayerWinner();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {playerWon ? t('game_result.victory') : t('game_result.gameOver')}
        </Text>
        <Text style={styles.subtitle}>
          {winner?.name} {t('game_result.wonWith')} {winner?.totalScore} {t('game_result.points')}!
        </Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Winner Highlight */}
        <View style={styles.winnerCard}>
          <Text style={styles.winnerEmoji}>🏆</Text>
          <Text style={styles.winnerName}>{winner?.name}</Text>
          <Text style={styles.winnerScore}>{winner?.totalScore} {t('game_result.points')}</Text>
        </View>

        {/* Rankings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('game_result.finalRankings')}</Text>

          {sortedPlayers.map((player) =>
            showRoundBreakdown
              ? renderPlayerItemDetailed(player)
              : renderPlayerItem(player)
          )}
        </View>

        {/* Toggle Round Breakdown */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowRoundBreakdown(!showRoundBreakdown)}
        >
          <Text style={styles.toggleButtonText}>
            {showRoundBreakdown ? t('game_result.hideRoundDetails') : t('game_result.showRoundDetails')}
          </Text>
        </TouchableOpacity>

        {/* NFT Reward Card (yalnızca kazanan insan oyuncuya göster) */}
        {playerWon && gameState?.players?.find(p => p.id === playerId)?.type !== 'bot' && (
          <View style={styles.rewardCard}>
            <Text style={styles.rewardTitle}>🎁 NFT Ödülü</Text>
            <Text style={styles.rewardDescription}>Turnuva kazananı cNFT ödülü kazandın!</Text>
            {rewardClaimed ? (
              <View style={styles.rewardClaimed}>
                <Text style={styles.rewardClaimedText}>✅ Mint Edildi!</Text>
                <Text style={styles.rewardClaimedSub}>Cüzdanını kontrol et</Text>
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
                    <Text style={styles.claimButtonText}>NFT Ödülü Talep Et</Text>
                    <Text style={styles.claimButtonSub}>Cüzdanına mint et</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Game Info */}
        <View style={styles.gameInfoCard}>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>{t('game_result.gameMode')}</Text>
            <Text style={styles.gameInfoValue}>
              {gameState.gameMode === 'koz_maca' ? t('lobby.kozMaca') : t('lobby.ihaleliBatak')}
            </Text>
          </View>
          <View style={styles.gameInfoRow}>
            <Text style={styles.gameInfoLabel}>{t('game_result.rounds')}</Text>
            <Text style={styles.gameInfoValue}>
              {gameState.totalRounds || 'Unknown'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Back to Lobby Button */}
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('Main' as never)}
      >
        <Text style={styles.actionButtonText}>{t('game_result.backToLobby')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  winnerCard: {
    backgroundColor: 'linear-gradient(135deg, rgba(108, 99, 255, 0.2), rgba(83, 52, 131, 0.2))',
    borderWidth: 2,
    borderColor: '#6C63FF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  winnerEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  winnerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  winnerScore: {
    fontSize: 18,
    color: '#6C63FF',
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
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
  noRoundsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
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
  gameInfoCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  gameInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  gameInfoLabel: {
    fontSize: 14,
    color: '#888',
  },
  gameInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
  rewardCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  rewardDescription: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 14,
  },
  claimButton: {
    backgroundColor: '#d4af37',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  claimButtonDisabled: { opacity: 0.6 },
  claimButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 3,
  },
  claimButtonSub: {
    fontSize: 11,
    color: 'rgba(26, 26, 46, 0.7)',
  },
  rewardClaimed: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  rewardClaimedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#22c55e',
    marginBottom: 3,
  },
  rewardClaimedSub: {
    fontSize: 11,
    color: '#888',
  },
});
