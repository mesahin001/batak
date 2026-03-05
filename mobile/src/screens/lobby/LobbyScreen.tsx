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
import { useTranslation } from 'react-i18next';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { GameMode } from '../../types/game';
import { getSkrBalance, formatSkrBalance } from '../../services/SkrService';
import { SkrStakeModal } from '../../components/ui/SkrStakeModal';

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
  const { publicKey } = useWallet();
  const { t } = useTranslation();

  // SKR balance
  const [skrBalance, setSkrBalance] = useState<number | null>(null);

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
  const [showSkrModal, setShowSkrModal] = useState(false);

  /**
   * Load SKR balance when wallet is connected
   */
  useEffect(() => {
    if (!publicKey) return;
    getSkrBalance(publicKey).then(setSkrBalance).catch(() => setSkrBalance(0));
  }, [publicKey]);

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
        Alert.alert(t('lobby.navError'), t('lobby.navErrorMsg'));
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
      Alert.alert(t('lobby.roomClosed'), t('lobby.roomClosedMsg'));
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
      Alert.alert(t('lobby.connError'), t('lobby.connErrorMsg'));
      return;
    }

    if (!playerId) {
      Alert.alert(t('lobby.connError'), t('lobby.authErrorMsg'));
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
      Alert.alert(t('common.error'), t('lobby.authErrorMsg'));
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
        Alert.alert(t('common.error'), response.error);
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
      Alert.alert(t('common.error'), t('lobby.enterCode'));
      return;
    }

    setError(null);
    socket.emit('join_private_room', {
      code: joinCodeInput.toUpperCase(),
      publicKey: playerId,
      username,
    }, (response: any) => {
      if (response.error) {
        Alert.alert(t('common.error'), response.error);
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
   * Create a SKR tournament room (requires MWA wallet signature)
   */
  const handleCreateSkrRoom = (stake: number, claimSignature: string) => {
    if (!socket || !playerId) return;

    setShowSkrModal(false);
    setError(null);

    socket.emit('create_skr_room', {
      publicKey: playerId,
      username,
      botDifficulty,
      gameMode,
      skrStake: stake,
      claimSignature,
    }, (response: any) => {
      if (response.error) {
        Alert.alert(t('common.error'), response.error);
        return;
      }
      setPrivateRoomCode(response.code);
      setPrivateRoomPlayers(response.players);
      setIsHost(true);
      setShowPrivateRoom(true);
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
      Alert.alert(t('lobby.roomCode'), privateRoomCode);
    }
  };

  /**
   * Get game mode display info
   */
  const getGameModeInfo = (mode: GameMode) => {
    switch (mode) {
      case GameMode.KOZ_MACA:
        return {
          title: t('lobby.kozMaca'),
          description: t('lobby.kozMacaDesc'),
          emoji: '♠️',
        };
      case GameMode.IHALELI_BATAK:
        return {
          title: t('lobby.ihaleliBatak'),
          description: t('lobby.ihaleliBatakDesc'),
          emoji: '🃏',
        };
      default:
        return {
          title: t('lobby.unknownMode'),
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
            <Text style={styles.headerTitle}>{t('lobby.privateRoom')}</Text>
            <Text style={styles.headerSubtitle}>{t('lobby.inviteFriends')}</Text>

            {/* Room Code Display */}
            <View style={styles.roomCodeCard}>
              <Text style={styles.roomCodeLabel}>{t('lobby.roomCode')}</Text>
              <View style={styles.roomCodeDisplay}>
                <Text style={styles.roomCodeText}>{privateRoomCode}</Text>
                <TouchableOpacity style={styles.copyButton} onPress={copyRoomCode}>
                  <Text style={styles.copyButtonText}>{t('common.copy')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Player List */}
            <View style={styles.playersCard}>
              <Text style={styles.playersLabel}>
                {t('lobby.players')} ({privateRoomPlayers.length}/4)
              </Text>
              {privateRoomPlayers.map((player, index) => (
                <View key={player.publicKey} style={styles.playerItem}>
                  <Text style={styles.playerIcon}>👤</Text>
                  <Text style={styles.playerName}>
                    {player.username || player.publicKey.slice(0, 12)}
                  </Text>
                  {index === 0 && (
                    <View style={styles.hostBadge}>
                      <Text style={styles.hostBadgeText}>{t('lobby.host')}</Text>
                    </View>
                  )}
                </View>
              ))}
              {/* Empty slots (bots) */}
              {Array.from({ length: 4 - privateRoomPlayers.length }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.playerItem}>
                  <Text style={styles.playerIcon}>🤖</Text>
                  <Text style={[styles.playerName, styles.botSlotText]}>
                    {t('lobby.botSlot')}
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
                <Text style={styles.startButtonText}>{t('lobby.startGame')}</Text>
              </TouchableOpacity>
            )}

            {/* Non-host: Waiting message */}
            {!isHost && (
              <Text style={styles.waitingText}>
                {t('lobby.waitingForHost')}
              </Text>
            )}

            {/* Leave Room Button */}
            <TouchableOpacity
              style={styles.leaveRoomButton}
              onPress={handleLeavePrivateRoom}
              activeOpacity={0.7}
            >
              <Text style={styles.leaveRoomButtonText}>{t('lobby.leaveRoom')}</Text>
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
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('lobby.title')}</Text>
            {publicKey && skrBalance !== null && (
              <View style={styles.skrChip}>
                <Text style={styles.skrChipIcon}>◎</Text>
                <Text style={styles.skrChipText}>{formatSkrBalance(skrBalance)} SKR</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>{t('lobby.readyToPlay', { name: username || 'Player' })}</Text>
        </View>

        {/* Connection Status */}
        {!isConnected && (
          <View style={styles.connectionWarning}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>{t('lobby.connectingServer')}</Text>
          </View>
        )}

        {/* Game Mode Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('lobby.gameModes')}</Text>

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
              <Text style={styles.modeTitle}>{t('lobby.kozMaca')}</Text>
              <Text style={styles.modeDescription}>
                {t('lobby.kozMacaDesc')}
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
              <Text style={styles.modeTitle}>{t('lobby.ihaleliBatak')}</Text>
              <Text style={styles.modeDescription}>
                {t('lobby.ihaleliBatakDesc')}
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
          <Text style={styles.sectionTitle}>{t('lobby.gameSettings')}</Text>

          {/* Bot Difficulty */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingTitle}>{t('lobby.botDifficulty')}</Text>
              <Text style={styles.settingDescription}>{t('lobby.aiSkillLevel')}</Text>
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
                    {t('lobby.' + difficulty)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bot Count */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabel}>
              <Text style={styles.settingTitle}>{t('lobby.botCount')}</Text>
              <Text style={styles.settingDescription}>{t('lobby.botsDescription')}</Text>
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
                    {count === 0 ? t('lobby.pvp') : count}
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
              <Text style={styles.queueStatusTitle}>{t('lobby.findingMatch')}</Text>
            </View>
            <Text style={styles.queueStatusMessage}>{queueStatus.message}</Text>
            {queueStatus.playersInQueue > 0 && (
              <View style={styles.queuePlayersInfo}>
                <Text style={styles.queuePlayersText}>
                  {t('lobby.playersInQueue', { count: queueStatus.playersInQueue })}
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
            <Text style={styles.playButtonText}>{t('lobby.findMatch')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleLeaveQueue}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelButtonText}>{t('lobby.cancelSearch')}</Text>
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
              <Text style={styles.privateRoomButtonText}>{t('lobby.createRoom')}</Text>
            </TouchableOpacity>

            {!showJoinInput ? (
              <TouchableOpacity
                style={styles.privateRoomButton}
                onPress={() => setShowJoinInput(true)}
                disabled={!isConnected}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.privateRoomButtonText}>{t('lobby.joinRoom')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.joinRoomInput}>
                <TextInput
                  style={styles.roomCodeInput}
                  value={joinCodeInput}
                  onChangeText={(text) => setJoinCodeInput(text.toUpperCase())}
                  placeholder={t('lobby.roomCodePlaceholder')}
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
                  <Text style={styles.joinButtonText}>{t('lobby.join')}</Text>
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

        {/* SKR Tournament — only for wallet users */}
        {!inQueue && publicKey && (
          <TouchableOpacity
            style={[styles.skrTournamentButton, !isConnected && styles.buttonDisabled]}
            onPress={() => setShowSkrModal(true)}
            disabled={!isConnected}
            activeOpacity={0.7}
          >
            <Text style={styles.skrTournamentIcon}>◎</Text>
            <View>
              <Text style={styles.skrTournamentTitle}>{t('lobby.skrTournament')}</Text>
              <Text style={styles.skrTournamentSub}>{t('lobby.skrTournamentSub')}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            {botCount === 0 ? t('lobby.infoAllReal', { mode: currentGameMode.title }) : t('lobby.infoBots', { count: botCount, mode: currentGameMode.title })}
          </Text>
        </View>
      </ScrollView>

      {/* SKR Stake Modal */}
      {publicKey && (
        <SkrStakeModal
          visible={showSkrModal}
          publicKey={publicKey}
          gameMode={gameMode}
          botDifficulty={botDifficulty}
          onConfirm={handleCreateSkrRoom}
          onClose={() => setShowSkrModal(false)}
        />
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  skrChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 241, 149, 0.12)',
    borderWidth: 1,
    borderColor: '#14F195',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  skrChipIcon: {
    fontSize: 13,
    color: '#14F195',
    marginRight: 4,
  },
  skrChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14F195',
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
  // SKR Tournament Button
  skrTournamentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 241, 149, 0.06)',
    borderWidth: 1.5,
    borderColor: '#14F195',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  skrTournamentIcon: {
    fontSize: 28,
    color: '#14F195',
    marginRight: 14,
  },
  skrTournamentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#14F195',
    marginBottom: 2,
  },
  skrTournamentSub: {
    fontSize: 12,
    color: '#888',
  },
});
