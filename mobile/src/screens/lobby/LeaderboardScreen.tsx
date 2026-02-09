/**
 * Leaderboard Screen - Top players ranking
 * Shows player rankings with stats and NFT badges
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { LeaderboardEntry } from '../../types/game';

interface LeaderboardResponse {
  leaderboard?: LeaderboardEntry[];
  error?: string;
}

export const LeaderboardScreen = () => {
  const navigation = useNavigation();
  const { socket, isConnected } = useSocket();
  const { playerId } = useAuth();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch leaderboard data from server
   */
  useEffect(() => {
    if (!socket || !isConnected) {
      setLoading(false);
      setError('Server not connected');
      return;
    }

    setLoading(true);
    setError(null);

    socket.emit('get_leaderboard', { limit: 100 }, (response: LeaderboardResponse) => {
      setLoading(false);

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.leaderboard) {
        setEntries(response.leaderboard);
      } else {
        setEntries([]);
      }
    });
  }, [socket, isConnected]);

  /**
   * Navigate to player profile
   */
  const handlePlayerPress = (publicKey: string) => {
    // @ts-ignore - Navigation to Profile screen
    navigation.navigate('Profile', { publicKey });
  };

  /**
   * Get rank badge styling
   */
  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return styles.rankGold;
    if (rank === 2) return styles.rankSilver;
    if (rank === 3) return styles.rankBronze;
    return styles.rankDefault;
  };

  /**
   * Get rank badge text color
   */
  const getRankTextColor = (rank: number) => {
    if (rank === 1) return '#B8860B';
    if (rank === 2) return '#708090';
    if (rank === 3) return '#8B4513';
    return '#888';
  };

  /**
   * Calculate win rate percentage
   */
  const getWinRate = (entry: LeaderboardEntry): string => {
    if (entry.gamesPlayed === 0) return '0.0%';
    return ((entry.gamesWon / entry.gamesPlayed) * 100).toFixed(1) + '%';
  };

  /**
   * Render leaderboard item
   */
  const renderLeaderboardItem = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;
    const isCurrentUser = item.publicKey === playerId;

    return (
      <TouchableOpacity
        style={[styles.itemContainer, isCurrentUser && styles.itemCurrentUser]}
        onPress={() => handlePlayerPress(item.publicKey)}
        activeOpacity={0.7}
      >
        {/* Rank Badge */}
        <View style={[styles.rankBadge, getRankBadgeStyle(rank)]}>
          <Text style={[styles.rankText, { color: getRankTextColor(rank) }]}>{rank}</Text>
        </View>

        {/* Player Info */}
        <View style={styles.playerInfo}>
          <View style={styles.playerNameRow}>
            <Text style={styles.playerName} numberOfLines={1}>
              {item.username || 'Anonymous'}
            </Text>
            {item.nftsEarned > 0 && (
              <View style={styles.nftBadge}>
                <Text style={styles.nftBadgeText}>🏆 {item.nftsEarned}</Text>
              </View>
            )}
          </View>
          <Text style={styles.publicKey}>
            {item.publicKey.slice(0, 6)}...{item.publicKey.slice(-4)}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.gamesWon}/{item.gamesPlayed}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>{getWinRate(item)}</Text>
            <Text style={styles.statLabel}>Win%</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statValue, styles.scoreValue]}>{item.totalScore}</Text>
            <Text style={styles.statLabel}>Pts</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render list header
   */
  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.headerText}>#</Text>
      <Text style={styles.headerPlayer}>Player</Text>
      <View style={styles.headerStats}>
        <Text style={styles.headerText}>Wins</Text>
        <Text style={styles.headerText}>Win%</Text>
        <Text style={styles.headerText}>Score</Text>
      </View>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Skor Tablosu</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Skor Tablosu</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Skor Tablosu</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>Henüz Kayıt Yok</Text>
          <Text style={styles.emptyText}>
            Lider tablosunda oyuncu görünmek için oyun oyna!
          </Text>
        </View>
      </View>
    );
  }

  // Main content
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Skor Tablosu</Text>
        <Text style={styles.subtitle}>En iyi oyuncular</Text>
      </View>

      <ScrollView style={styles.listContainer}>
        {renderHeader()}
        <FlatList
          data={entries}
          keyExtractor={(item) => item.publicKey}
          renderItem={renderLeaderboardItem}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  listHeader: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#252545',
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    textAlign: 'center',
    flex: 1,
  },
  headerPlayer: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    flex: 3,
  },
  headerStats: {
    flexDirection: 'row',
    flex: 3,
    justifyContent: 'space-around',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    marginHorizontal: 8,
  },
  itemCurrentUser: {
    borderWidth: 2,
    borderColor: '#6C63FF',
    backgroundColor: '#2a2a4e',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankGold: {
    backgroundColor: '#FFD700',
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  rankSilver: {
    backgroundColor: '#C0C0C0',
    borderWidth: 2,
    borderColor: '#A8A8A8',
  },
  rankBronze: {
    backgroundColor: '#CD7F32',
    borderWidth: 2,
    borderColor: '#B87333',
  },
  rankDefault: {
    backgroundColor: '#3a3a5e',
    borderWidth: 1,
    borderColor: '#4a4a6e',
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 3,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  nftBadge: {
    backgroundColor: 'rgba(108, 99, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  nftBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6C63FF',
  },
  publicKey: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  statsContainer: {
    flexDirection: 'row',
    flex: 3,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  scoreValue: {
    color: '#6C63FF',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
