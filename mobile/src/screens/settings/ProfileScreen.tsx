/**
 * Profile Screen - Player profile with stats and game history
 * Shows player statistics, recent games, and NFT rewards
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { LeaderboardEntry, GameHistoryEntry, NftRewardEntry } from '../../types/game';

interface PlayerStatsResponse {
  player?: LeaderboardEntry;
  nfts?: NftRewardEntry[];
  error?: string;
}

interface PlayerGamesResponse {
  games?: GameHistoryEntry[];
  error?: string;
}

interface RouteParams {
  publicKey?: string;
}

export const ProfileScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { socket, isConnected } = useSocket();
  const { playerId: currentUser } = useAuth();
  const { t } = useTranslation();

  // Get publicKey from route params (viewing other profile) or use current user
  const params = route.params as RouteParams | undefined;
  const targetPublicKey = params?.publicKey || currentUser;
  const isOwnProfile = targetPublicKey === currentUser;

  const [player, setPlayer] = useState<LeaderboardEntry | null>(null);
  const [games, setGames] = useState<GameHistoryEntry[]>([]);
  const [nfts, setNfts] = useState<NftRewardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch player data from server
   */
  useEffect(() => {
    if (!socket || !isConnected || !targetPublicKey) {
      setLoading(false);
      setError(t('profile.serverNotConnected'));
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch player stats
    socket.emit('get_player_stats', { publicKey: targetPublicKey }, (response: PlayerStatsResponse) => {
      if (response.error) {
        setError(response.error);
        setLoading(false);
        return;
      }

      if (response.player) {
        setPlayer(response.player);
      }

      if (response.nfts) {
        setNfts(response.nfts);
      }
    });

    // Fetch player games
    socket.emit('get_player_games', { publicKey: targetPublicKey, limit: 10 }, (response: PlayerGamesResponse) => {
      setLoading(false);

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.games) {
        setGames(response.games);
      }
    });
  }, [socket, isConnected, targetPublicKey]);

  /**
   * Calculate win rate percentage
   */
  const getWinRate = (): string => {
    if (!player || player.gamesPlayed === 0) return '0.0%';
    return ((player.gamesWon / player.gamesPlayed) * 100).toFixed(1) + '%';
  };

  /**
   * Calculate bid success rate percentage
   */
  const getBidSuccessRate = (): string => {
    if (!player || player.totalBidsMade === 0) return '0.0%';
    return ((player.bidsSuccessful / player.totalBidsMade) * 100).toFixed(1) + '%';
  };

  /**
   * Get rank tier label
   */
  const getRankTierLabel = (tier: number): string => {
    if (tier >= 100) return t('profile.elite');
    if (tier >= 50) return t('profile.gold');
    if (tier >= 20) return t('profile.silver');
    return t('profile.bronze');
  };

  /**
   * Get rank tier color
   */
  const getRankTierColor = (tier: number): string => {
    if (tier >= 100) return '#FFD700';
    if (tier >= 50) return '#FFA500';
    if (tier >= 20) return '#C0C0C0';
    return '#CD7F32';
  };

  /**
   * Get game result icon
   */
  const getGameResultIcon = (game: GameHistoryEntry): string => {
    if (!currentUser) return '❓';
    return game.winnerPk === currentUser ? '🏆' : '❌';
  };

  /**
   * Format date
   */
  const formatDate = (dateString?: string): string => {
    if (!dateString) return t('common.error');
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('common.today');
    if (diffDays === 1) return t('common.yesterday');
    if (diffDays < 7) return t('profile.daysAgo', { count: diffDays });
    if (diffDays < 30) return t('profile.weeksAgo', { count: Math.floor(diffDays / 7) });
    return date.toLocaleDateString();
  };

  /**
   * Render game history item
   */
  const renderGameItem = (game: GameHistoryEntry, index: number) => {
    const won = game.winnerPk === currentUser;

    return (
      <View key={game.id} style={styles.gameItem}>
        <View style={[styles.gameResultBadge, won ? styles.gameResultWin : styles.gameResultLoss]}>
          <Text style={styles.gameResultText}>{won ? t('profile.win') : t('profile.loss')}</Text>
        </View>

        <View style={styles.gameInfo}>
          <Text style={styles.gameMode}>
            {game.gameMode === 'koz_maca' ? t('lobby.kozMaca') : t('lobby.ihaleliBatak')}
          </Text>
          <Text style={styles.gameDate}>{formatDate(game.completedAt)}</Text>
        </View>

        <View style={styles.gameStats}>
          <Text style={styles.gameRounds}>{game.totalRounds} {t('profile.rounds')}</Text>
        </View>

        <Text style={styles.gameResultIcon}>{getGameResultIcon(game)}</Text>
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error || !player) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || t('profile.noHistory')}</Text>
        </View>
      </View>
    );
  }

  const rankTierColor = getRankTierColor(player.rankTier);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {isOwnProfile ? t('profile.myProfile') : t('profile.playerProfile')}
          </Text>
        </View>

        {/* Player Info Card */}
        <View style={styles.playerCard}>
          <View style={styles.playerHeader}>
            <View style={[styles.rankBadge, { backgroundColor: rankTierColor }]}>
              <Text style={styles.rankText}>#{player.rankTier}</Text>
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{player.username || t('profile.anonymous')}</Text>
              <Text style={styles.playerKey}>
                {player.publicKey.slice(0, 8)}...{player.publicKey.slice(-4)}
              </Text>
            </View>
          </View>

          <View style={styles.tierRow}>
            <View style={[styles.tierBadge, { borderColor: rankTierColor }]}>
              <Text style={[styles.tierText, { color: rankTierColor }]}>
                {getRankTierLabel(player.rankTier)} {t('profile.tier')}
              </Text>
            </View>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>{t('profile.seasonPoints')}</Text>
            <Text style={styles.scoreValue}>{player.currentSeasonPoints}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.stats')}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{player.gamesPlayed}</Text>
              <Text style={styles.statLabel}>{t('leaderboard.games')}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statValue, styles.statWin]}>{player.gamesWon}</Text>
              <Text style={styles.statLabel}>{t('leaderboard.wins')}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{getWinRate()}</Text>
              <Text style={styles.statLabel}>{t('leaderboard.winRate')}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statValue, styles.statNft]}>{player.nftsEarned}</Text>
              <Text style={styles.statLabel}>{t('profile.nft')}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{player.totalTricksWon}</Text>
              <Text style={styles.statLabel}>{t('profile.tricks')}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>{getBidSuccessRate()}</Text>
              <Text style={styles.statLabel}>{t('profile.bidSuccess')}</Text>
            </View>
          </View>
        </View>

        {/* Score Range Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.scoreRange')}</Text>

          <View style={styles.scoreRangeCard}>
            <View style={styles.scoreRangeItem}>
              <Text style={styles.scoreRangeLabel}>{t('profile.best')}</Text>
              <Text style={[styles.scoreRangeValue, styles.scoreBest]}>{player.bestScore}</Text>
            </View>

            <View style={styles.scoreRangeItem}>
              <Text style={styles.scoreRangeLabel}>{t('profile.total')}</Text>
              <Text style={styles.scoreRangeValue}>{player.totalScore}</Text>
            </View>

            <View style={styles.scoreRangeItem}>
              <Text style={styles.scoreRangeLabel}>{t('profile.worst')}</Text>
              <Text style={[styles.scoreRangeValue, styles.scoreWorst]}>{player.worstScore}</Text>
            </View>
          </View>
        </View>

        {/* Recent Games */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.recentGames')}</Text>

          {games.length === 0 ? (
            <View style={styles.emptyGames}>
              <Text style={styles.emptyText}>{t('profile.noHistory')}</Text>
            </View>
          ) : (
            <View style={styles.gamesList}>
              {games.map((game, index) => renderGameItem(game, index))}
            </View>
          )}
        </View>

        {/* NFT Rewards */}
        {nfts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.nfts')}</Text>

            <View style={styles.nftsList}>
              {nfts.map((nft, index) => (
                <View key={index} style={styles.nftCard}>
                  <Text style={styles.nftEmoji}>🏆</Text>
                  <View style={styles.nftInfo}>
                    <Text style={styles.nftTier}>
                      Tier {nft.tier} {nft.onChainMinted ? '✅' : '⏳'}
                    </Text>
                    <Text style={styles.nftStatus}>
                      {nft.onChainMinted ? t('profile.minted') : t('profile.pending')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
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
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  playerCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  rankBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  playerKey: {
    fontSize: 12,
    color: '#14F195',
    fontFamily: 'monospace',
  },
  tierRow: {
    marginBottom: 14,
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
  },
  tierText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3a3a5e',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#888',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: '33%',
    paddingHorizontal: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
  },
  statWin: {
    color: '#22c55e',
  },
  statNft: {
    color: '#FFD700',
  },
  scoreRangeCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreRangeItem: {
    alignItems: 'center',
  },
  scoreRangeLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  scoreRangeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreBest: {
    color: '#22c55e',
  },
  scoreWorst: {
    color: '#ef4444',
  },
  gamesList: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a5e',
  },
  gameResultBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gameResultWin: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  gameResultLoss: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  gameResultText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  gameInfo: {
    flex: 1,
  },
  gameMode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  gameDate: {
    fontSize: 11,
    color: '#888',
  },
  gameStats: {
    marginRight: 8,
  },
  gameRounds: {
    fontSize: 12,
    color: '#888',
  },
  gameResultIcon: {
    fontSize: 18,
  },
  emptyGames: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
  nftsList: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 12,
  },
  nftCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#252545',
    borderRadius: 10,
    marginBottom: 8,
  },
  nftEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  nftInfo: {
    flex: 1,
  },
  nftTier: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  nftStatus: {
    fontSize: 12,
    color: '#888',
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
