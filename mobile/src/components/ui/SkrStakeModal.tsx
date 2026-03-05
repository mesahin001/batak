/**
 * SKR Stake Modal
 * Shows SKR balance, lets user set a stake amount, and approves via MWA.
 * Used when creating a SKR Tournament room.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getSkrBalance, formatSkrBalance } from '../../services/SkrService';
import { SeekerWalletService } from '../../services/wallet/SeekerWalletService';

const STAKE_PRESETS = [1, 5, 10, 25];

interface SkrStakeModalProps {
  visible: boolean;
  publicKey: string;
  gameMode: string;
  botDifficulty: string;
  onConfirm: (stake: number, claimSignature: string) => void;
  onClose: () => void;
}

export const SkrStakeModal: React.FC<SkrStakeModalProps> = ({
  visible,
  publicKey,
  gameMode,
  botDifficulty,
  onConfirm,
  onClose,
}) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [selectedStake, setSelectedStake] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    if (!visible || !publicKey) return;
    setLoadingBalance(true);
    getSkrBalance(publicKey)
      .then(setBalance)
      .catch(() => setBalance(0))
      .finally(() => setLoadingBalance(false));
  }, [visible, publicKey]);

  const handleConfirm = async () => {
    if (balance !== null && selectedStake > balance) {
      Alert.alert('Insufficient Balance', `You need ${selectedStake} SKR but only have ${formatSkrBalance(balance)} SKR.`);
      return;
    }

    setLoading(true);
    try {
      // Build a tournament room ID for the stake memo
      const roomTag = `skr-tournament-${Date.now()}`;

      // Sign a memo transaction: proves the user approved the stake via their wallet
      // In production, this would be a real SPL token transfer to a program-controlled escrow
      const signature = await SeekerWalletService.claimNftReward(roomTag);

      onConfirm(selectedStake, signature);
    } catch (error) {
      console.error('[SkrStakeModal] Stake approval failed:', error);
      Alert.alert(
        'Wallet Error',
        'Could not get wallet approval. Make sure Seeker wallet is installed and authorized.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={!loading ? onClose : undefined}
      >
        <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>SKR Tournament</Text>
            <Text style={styles.subtitle}>Stake SKR to enter · Winner takes the pot</Text>
          </View>

          {/* Balance */}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            {loadingBalance ? (
              <ActivityIndicator size="small" color="#14F195" />
            ) : (
              <Text style={styles.balanceValue}>
                {balance !== null ? `${formatSkrBalance(balance)} SKR` : '— SKR'}
              </Text>
            )}
          </View>

          {/* Stake Selector */}
          <Text style={styles.stakeLabel}>Select Stake (SKR)</Text>
          <View style={styles.stakeGrid}>
            {STAKE_PRESETS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.stakeOption,
                  selectedStake === amount && styles.stakeOptionActive,
                  balance !== null && amount > balance && styles.stakeOptionDisabled,
                ]}
                onPress={() => {
                  if (balance === null || amount <= balance) setSelectedStake(amount);
                }}
                disabled={balance !== null && amount > balance}
              >
                <Text
                  style={[
                    styles.stakeOptionText,
                    selectedStake === amount && styles.stakeOptionTextActive,
                    balance !== null && amount > balance && styles.stakeOptionTextDisabled,
                  ]}
                >
                  {amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pot info */}
          <View style={styles.potInfo}>
            <Text style={styles.potLabel}>Winner's Pot</Text>
            <Text style={styles.potValue}>{selectedStake * 4} SKR</Text>
          </View>

          {/* Note */}
          <Text style={styles.note}>
            Tapping "Approve &amp; Create" will open your Seeker wallet to sign the stake approval.
          </Text>

          {/* Actions */}
          <TouchableOpacity
            style={[styles.confirmButton, loading && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.confirmButtonText}>Approve &amp; Create Room</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: '#14F195',
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#14F195',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#888',
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14F195',
  },
  stakeLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  stakeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stakeOption: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#2a2a4e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stakeOptionActive: {
    borderColor: '#14F195',
    backgroundColor: 'rgba(20, 241, 149, 0.1)',
  },
  stakeOptionDisabled: {
    opacity: 0.35,
  },
  stakeOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  stakeOptionTextActive: {
    color: '#14F195',
  },
  stakeOptionTextDisabled: {
    color: '#555',
  },
  potInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  potLabel: {
    fontSize: 14,
    color: '#d4af37',
  },
  potValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#d4af37',
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  confirmButton: {
    backgroundColor: '#14F195',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#888',
  },
});
