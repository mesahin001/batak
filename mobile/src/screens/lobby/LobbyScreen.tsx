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
  TextInput,
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
  const [botCount, setBotCount] = useState(
    parseInt(process.env.EXPO_PUBLIC_DEFAULT_BOT_COUNT || '0')
  );

  // Queue state
  const [inQueue, setInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);

  // Private room state
  const [showPrivateRoom, setShowPrivateRoom] = useState(false);
  const [privateRoomCode, setPrivateRoomCode] = useState<string | null>(null);
  const [privateRoomPlayers, setPrivateRoomPlayers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

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

    const handlePrivateRoomUpdate = (data: any) => {
      console.log('[Lobby] Private room update:', data);
      setPrivateRoomPlayers(data.players);
      if (data.code) setPrivateRoomCode(data.code);
    };

    const handlePrivateRoomClosed = () => {
      console.log('[Lobby] Private room closed');
      setShowPrivateRoom(false);
      setPrivateRoomCode(null);
      setPrivateRoomPlayers([]);
      setIsHost(false);
      Alert.alert('Room Closed', 'The room has been closed by the host');
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
   * Create a private room
   */
  const handleCreatePrivateRoom = () => {
    if (!socket || !playerId) {
      Alert.alert('Error', 'Please log in again');
      return;
    }

    setError(null);
    socket.emit('create_private_room', {
      publicKey: playerId,
      username,
      botDifficulty,
      gameMode,
    }, (response: any) => {
      if (response.error) {
        Alert.alert('Error', response.error);
        return;
      }
      setPrivateRoomCode(response.code);
      setPrivateRoomPlayers(response.players);
      setIsHost(true);
      setShowPrivateRoom(true);
    });
  };

  /**
   * Join a private room
   */
  const handleJoinPrivateRoom = () => {
    if (!socket || !playerId || !joinCodeInput) {
      Alert.alert('Error', 'Please enter a room code');
      return;
    }

    setError(null);
    socket.emit('join_private_room', {
      code: joinCodeInput.toUpperCase(),
      publicKey: playerId,
      username,
    }, (response: any) => {
      if (response.error) {
        Alert.alert('Error', response.error);
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

  /**
   * Start the private room game
   */
  const handleStartPrivateRoom = () => {
    if (!socket || !playerId || !privateRoomCode) return;

    socket.emit('start_private_room', {
      code: privateRoomCode,
      publicKey: playerId,
    });
  };

  /**
   * Leave the private room
   */
  const handleLeavePrivateRoom = () => {
    if (!socket || !playerId || !privateRoomCode) return;

    socket.emit('leave_private_room', {
      code: privateRoomCode,
      publicKey: playerId,
    });

    setShowPrivateRoom(false);
    setPrivateRoomCode(null);
    setPrivateRoomPlayers([]);
    setIsHost(false);
  };

  /**
   * Copy room code to clipboard
   */
  const copyRoomCode = () => {
    if (privateRoomCode) {
      Alert.alert('Room Code', privateRoomCode);
    }
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

  // Private room lobby view
  if (showPrivateRoom && privateRoomCode) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.privateRoomContainer}>
            <Text style={styles.headerTitle}>Private Room</Text>
            <Text style={styles.headerSubtitle}>Invite your friends!</Text>

            {/* Room Code Display */}
            <View style={styles.roomCodeCard}>
              <Text style={styles.roomCodeLabel}>Room Code</Text>
              <View style={styles.roomCodeDisplay}>
                <Text style={styles.roomCodeText}>{privateRoomCode}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={copyRoomCode}>
                  <Text style={styles.copyButtonText}>Copy</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Player List */}
            <View style={styles.playersCard}>
              <Text style={styles.playersLabel}>
                Players ({privateRoomPlayers.length}/4)
              </Text>
              {privateRoomPlayers.map((player, index) => (
                <View key={player.publicKey} style={styles.playerItem}>
                  <Text style={styles.playerIcon}>👤</Text>
                  <Text style={styles.playerName}>
                    {player.username || player.publicKey.slice(0, 12)}
                  </Text>
                  {index === 0 && (
                    <View style={styles.hostBadge}>
                      <Text style={styles.hostBadgeText}>Host</Text>
                    </View>
                  )}
                </View>
              ))}
              {/* Empty slots (bots) */}
              {Array.from({ length: 4 - privateRoomPlayers.length }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.playerItem}>
                  <Text style={styles.playerIcon}>🤖</Text>
                  <Text style={[styles.playerName, styles.botSlotText]}>
                    Bot (empty slot)
                  </Text>
                </View>
              ))}
            </View>

            {/* Host: Start Button */}
            {isHost && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStartPrivateRoom}
                activeOpacity={0.7}
              >
                <Text style={styles.startButtonText}>Start Game</Text>
              </TouchableOpacity>
            )}

            {/* Non-host: Waiting message */}
            {!isHost && (
              <Text style={styles.waitingText}>
                Waiting for host to start the game...
              </Text>
            )}

            {/* Leave Room Button */}
            <TouchableOpacity
              style={styles.leaveRoomButton}
              onPress={handleLeavePrivateRoom}
              activeOpacity={0.7}
            >
              <Text style={styles.leaveRoomButtonText}>Leave Room</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

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
              {[0, 1, 2, 3].map((count) => (
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
                    {count === 0 ? 'PvP' : count}
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

        {/* Private Room Actions */}
        {!inQueue && (
          <View style={styles.privateRoomActions}>
            <TouchableOpacity
              style={styles.privateRoomButton}
              onPress={handleCreatePrivateRoom}
              disabled={!isConnected}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.privateRoomButtonText}>Create Room</Text>
            </TouchableOpacity>

            {!showJoinInput ? (
              <TouchableOpacity
                style={styles.privateRoomButton}
                onPress={() => setShowJoinInput(true)}
                disabled={!isConnected}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.privateRoomButtonText}>Join Room</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.joinRoomInput}>
                <TextInput
                  style={styles.roomCodeInput}
                  value={joinCodeInput}
                  onChangeText={(text) => setJoinCodeInput(text.toUpperCase())}
                  placeholder="Room code..."
                  placeholderTextColor="#888"
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[
                    styles.joinButton,
                    joinCodeInput.length !== 6 && styles.buttonDisabled,
                  ]}
                  onPress={handleJoinPrivateRoom}
                  disabled={joinCodeInput.length !== 6}
                  activeOpacity={0.7}
                >
                  <Text style={styles.joinButtonText}>Join</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelJoinButton}
                  onPress={() => {
                    setShowJoinInput(false);
                    setJoinCodeInput('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelJoinButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Quick Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            {botCount === 0
              ? `You'll play with 4 real players on ${currentGameMode.title} mode.`
              : `You'll play against ${botCount} bot${botCount > 1 ? 's' : ''} on ${currentGameMode.title} mode.`}
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
  // Private Room Styles
  privateRoomContainer: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#888',
  },
  privateRoomActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
    width: '100%',
  },
  privateRoomButton: {
    flex: 1,
    backgroundColor: '#2d5a3d',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d4af37',
    alignItems: 'center',
  },
  privateRoomButtonText: {
    color: '#d4af37',
    fontSize: 15,
    fontWeight: '600',
  },
  roomCodeCard: {
    backgroundColor: '#1a472a',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2d5a3d',
  },
  roomCodeLabel: {
    color: '#d4af37',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  roomCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roomCodeText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  copyButton: {
    backgroundColor: '#d4af37',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  copyButtonText: {
    color: '#0d2818',
    fontSize: 14,
    fontWeight: '600',
  },
  playersCard: {
    backgroundColor: '#1a472a',
    padding: 20,
    borderRadius: 12,
    marginTop: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2d5a3d',
  },
  playersLabel: {
    color: '#d4af37',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
  },
  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2d5a3d',
  },
  playerIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  playerName: {
    color: '#fff',
    fontSize: 15,
    flex: 1,
  },
  botSlotText: {
    color: '#888',
    fontStyle: 'italic',
  },
  hostBadge: {
    backgroundColor: '#d4af37',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  hostBadgeText: {
    color: '#0d2818',
    fontSize: 11,
    fontWeight: '700',
  },
  startButton: {
    backgroundColor: '#d4af37',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#0d2818',
    fontSize: 16,
    fontWeight: '700',
  },
  waitingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  leaveRoomButton: {
    backgroundColor: '#8b0000',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  leaveRoomButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  joinRoomInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  roomCodeInput: {
    flex: 1,
    backgroundColor: '#1a472a',
    color: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d5a3d',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  joinButton: {
    backgroundColor: '#d4af37',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#0d2818',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelJoinButton: {
    backgroundColor: '#8b0000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelJoinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
