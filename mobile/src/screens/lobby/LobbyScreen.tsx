/**
 * Lobby Screen - Match finding and game configuration
 * Quick play, game mode selection, and bot settings
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { GameMode } from '../../types/game';

interface QueueStatus {
  status: 'waiting' | 'matched_with_bots';
  playersInQueue: number;
  playersNeeded: number;
  gameMode: string;
  message: string;
}

interface MatchFoundData {
  roomId: string;
  gameState?: any;
}

export const LobbyScreen = () => {
  const navigation = useNavigation();
  const { socket, isConnected } = useSocket();
  const { playerId, username } = useAuth();

  // Game settings
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.KOZ_MACA);
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [botCount, setBotCount] = useState(3);

  // Queue state
  const [inQueue, setInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);

  // UI state
  const [error, setError] = useState<string | null>(null);

  /**
   * Setup socket listeners
   */
  useEffect(() => {
    if (!socket || !playerId) return;

    const handleQueueStatus = (data: QueueStatus) => {
      console.log('[Lobby] Queue status:', data);
      setQueueStatus(data);
    };

    const handleMatchFound = (data: MatchFoundData) => {
      console.log('[Lobby] Match found:', data);
      setInQueue(false);
      setQueueStatus(null);

      // Navigate to game room via parent RootNavigator
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        rootNavigation.navigate('Game', {
          screen: 'GameRoom',
          params: {
            roomId: data.roomId,
            gameState: data.gameState, // Pass initial game state
          },
        });
      } else {
        console.error('[Lobby] Could not access root navigator');
        Alert.alert('Navigation Error', 'Unable to start game. Please try again.');
      }
    };

    const handleError = (data: any) => {
      const errorMessage = data.message || 'An error occurred';
      setError(errorMessage);
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
  }, [socket, playerId, navigation]);

  /**
   * Join the matchmaking queue
   */
  const handleJoinQueue = () => {
    if (!socket || !isConnected) {
      Alert.alert('Connection Error', 'Please check your internet connection');
      return;
    }

    if (!playerId) {
      Alert.alert('Authentication Error', 'Please log in again');
      return;
    }

    setError(null);
    setInQueue(true);

    socket.emit('join_queue', {
      publicKey: playerId,
      username: username || undefined,
      botCount,
      botDifficulty,
      gameMode,
    });
  };

  /**
   * Leave the matchmaking queue
   */
  const handleLeaveQueue = () => {
    if (!socket) return;

    socket.emit('leave_queue');
    setInQueue(false);
    setQueueStatus(null);
  };

  /**
   * Get game mode display info
   */
  const getGameModeInfo = (mode: GameMode) => {
    switch (mode) {
      case GameMode.KOZ_MACA:
        return {
          title: 'Koz Maça',
          description: 'Spades are always trump. Win tricks to score points!',
          emoji: '♠️',
        };
      case GameMode.IHALELI_BATAK:
        return {
          title: 'İhaleli Batak',
          description: 'Bid your trump and tricks. Lowest score wins!',
          emoji: '🃏',
        };
      default:
        return {
          title: 'Unknown',
          description: '',
          emoji: '❓',
        };
    }
  };

  /**
   * Get bot difficulty color
   */
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '#22c55e';
      case 'normal': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#888';
    }
  };

  const currentGameMode = getGameModeInfo(gameMode);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Lobby</Text>
          <Text style={styles.subtitle}>Ready to play, {username || 'Player'}?</Text>
        </View>

        {/* Connection Status */}
        {!isConnected && (
          <View style={styles.connectionWarning}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>Connecting to server...</Text>
          </View>
        )}

        {/* Game Mode Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Mode</Text>

          <TouchableOpacity
            style={[
              styles.modeCard,
              gameMode === GameMode.KOZ_MACA && styles.modeCardActive,
            ]}
            onPress={() => setGameMode(GameMode.KOZ_MACA)}
            disabled={inQueue}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.modeEmojiContainer}>
              <Text style={styles.modeEmoji}>♠️</Text>
            </View>
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>Koz Maça</Text>
              <Text style={styles.modeDescription}>
                Spades are always trump. Win the most tricks!
              </Text>
            </View>
            {gameMode === GameMode.KOZ_MACA && (
              <View style={styles.modeCheck}>
                <Text style={styles.modeCheckText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeCard,
              gameMode === GameMode.IHALELI_BATAK && styles.modeCardActive,
            ]}
            onPress={() => setGameMode(GameMode.IHALELI_BATAK)}
            disabled={inQueue}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.modeEmojiContainer}>
              <Text style={styles.modeEmoji}>🃏</Text>
            </View>
            <View style={styles.modeContent}>
              <Text style={styles.modeTitle}>İhaleli Batak</Text>
              <Text style={styles.modeDescription}>
                Bid your suit and tricks. Lowest score wins!
              </Text>
            </View>
            {gameMode === GameMode.IHALELI_BATAK && (
              <View style={styles.modeCheck}>
                <Text style={styles.modeCheckText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Game Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Game Settings</Text>

          {/* Bot Difficulty */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingTitle}>Bot Difficulty</Text>
              <Text style={styles.settingDescription}>AI opponent skill level</Text>
            </View>
            <View style={styles.difficultySelector}>
              {(['easy', 'normal', 'hard'] as const).map((difficulty) => (
                <TouchableOpacity
                  key={difficulty}
                  style={[
                    styles.difficultyButton,
                    { borderColor: getDifficultyColor(difficulty) },
                    botDifficulty === difficulty && {
                      backgroundColor: getDifficultyColor(difficulty),
                    },
                  ]}
                  onPress={() => setBotDifficulty(difficulty)}
                  disabled={inQueue}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text
                    style={[
                      styles.difficultyButtonText,
                      botDifficulty === difficulty && styles.difficultyButtonTextActive,
                    ]}
                  >
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bot Count */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingTitle}>Bot Count</Text>
              <Text style={styles.settingDescription}>Number of AI opponents</Text>
            </View>
            <View style={styles.countSelector}>
              {[1, 2, 3].map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[
                    styles.countButton,
                    botCount === count && styles.countButtonActive,
                  ]}
                  onPress={() => setBotCount(count)}
                  disabled={inQueue}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text
                    style={[
                      styles.countButtonText,
                      botCount === count && styles.countButtonTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Queue Status */}
        {inQueue && queueStatus && (
          <View style={styles.queueStatusCard}>
            <View style={styles.queueStatusHeader}>
              <ActivityIndicator color="#6C63FF" size="small" />
              <Text style={styles.queueStatusTitle}>Finding Match...</Text>
            </View>
            <Text style={styles.queueStatusMessage}>{queueStatus.message}</Text>
            {queueStatus.playersInQueue > 0 && (
              <View style={styles.queuePlayersInfo}>
                <Text style={styles.queuePlayersText}>
                  Players in queue: {queueStatus.playersInQueue}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Action Buttons */}
        {!inQueue ? (
          <TouchableOpacity
            style={[styles.playButton, !isConnected && styles.buttonDisabled]}
            onPress={handleJoinQueue}
            disabled={!isConnected}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.playButtonEmoji}>🎮</Text>
            <Text style={styles.playButtonText}>Find Match</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleLeaveQueue}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelButtonText}>Cancel Search</Text>
          </TouchableOpacity>
        )}

        {/* Quick Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            You'll play against {botCount} bot{botCount > 1 ? 's' : ''} on {currentGameMode.title} mode.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
  },
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  warningIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  warningText: {
    fontSize: 14,
    color: '#f59e0b',
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 14,
    marginLeft: 4,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeCardActive: {
    borderColor: '#6C63FF',
    backgroundColor: '#2a2a4e',
  },
  modeEmojiContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3a3a5e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modeEmoji: {
    fontSize: 26,
  },
  modeContent: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  modeCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  modeCheckText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  settingRow: {
    backgroundColor: '#2a2a4e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  settingLabel: {
    marginBottom: 14,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#888',
  },
  difficultySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: 'transparent',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  difficultyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  difficultyButtonTextActive: {
    color: '#fff',
  },
  countSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  countButton: {
    width: 60,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#3a3a5e',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  countButtonActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  countButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#888',
  },
  countButtonTextActive: {
    color: '#fff',
  },
  queueStatusCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#6C63FF',
  },
  queueStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  queueStatusTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
  queueStatusMessage: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  queuePlayersInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#3a3a5e',
  },
  queuePlayersText: {
    fontSize: 13,
    color: '#6C63FF',
    fontWeight: '600',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    flex: 1,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 16,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  playButtonEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#252545',
    borderRadius: 12,
    padding: 14,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#aaa',
    flex: 1,
    lineHeight: 18,
  },
});
