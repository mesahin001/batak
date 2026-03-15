/**
 * Settings Screen - App settings and logout
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
  Modal,
  Linking,
  TextInput,
} from 'react-native';
// ActionSheetIOS import removed - causing Android import issues
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { useSocket } from '../../contexts/SocketContext';
import { changeLanguage, getCurrentLanguage, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../services/i18n/I18nService';
import { soundManager } from '../../utils/SoundManager';
import { HelpModal } from '../../components/ui/HelpModal';

interface NftReward {
  id: number;
  tournamentId: string;
  tier: number; // 1=bronze, 2=silver, 3=gold
  mintAddress: string | null;
  signature: string | null;
  mintedAt: string;
  onChainMinted?: boolean; // true if actually minted on mainnet
}

const TIER_LABELS: Record<number, { emoji: string; name: string; color: string }> = {
  1: { emoji: '🥉', name: 'Bronze', color: '#cd7f32' },
  2: { emoji: '🥈', name: 'Silver', color: '#c0c0c0' },
  3: { emoji: '🥇', name: 'Gold', color: '#d4af37' },
};

export const SettingsScreen = () => {
  const { t } = useTranslation();
  const { logout, username, authType, playerId, setUsername } = useAuth();
  const { publicKey, disconnect: walletDisconnect } = useWallet();
  const { socket, isConnected } = useSocket();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [nfts, setNfts] = useState<NftReward[]>([]);
  const [nftsLoading, setNftsLoading] = useState(false);
  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Load initial preferences
  useEffect(() => {
    const loadPreferences = async () => {
      const soundState = soundManager.isEnabled();
      setSoundEnabled(soundState);

      const lang = getCurrentLanguage();
      setCurrentLanguage(lang);
    };
    loadPreferences();
  }, []);

  // Load NFT trophies when socket + wallet are ready
  const loadNfts = useCallback(() => {
    if (!socket || !publicKey) return;
    setNftsLoading(true);
    socket.emit('get_player_stats', { publicKey }, (response: any) => {
      setNftsLoading(false);
      if (!response.error && response.nfts) {
        setNfts(response.nfts);
      }
    });
  }, [socket, publicKey]);

  useEffect(() => {
    loadNfts();
  }, [loadNfts]);

  const handleLogout = async () => {
    Alert.alert(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      [
        { text: t('app.cancel'), style: 'cancel' },
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
            } catch (error) {
              console.error('Logout error:', error);
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleLanguagePress = () => {
    // Show language picker modal for both iOS and Android
    setShowLanguagePicker(true);
  };

  const handleSoundToggle = async (value: boolean) => {
    setSoundEnabled(value);
    await soundManager.setEnabled(value);
  };

  const handleSaveUsername = async () => {
    const trimmed = newUsername.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
      setUsernameError(t('settings.usernameRules'));
      return;
    }
    setSavingUsername(true);
    setUsernameError('');
    const result = await setUsername(trimmed);
    setSavingUsername(false);
    if (result.success) {
      setUsernameModalVisible(false);
    } else {
      setUsernameError(result.error || t('common.error'));
    }
  };

  const getAuthTypeDisplay = () => {
    if (!authType) return t('auth.notLoggedIn');
    return authType === 'wallet' ? `👛 ${t('settings.walletAddress')}` : `📧 ${t('settings.emailAddress')}`;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.title')}</Text>
        </View>

        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account')}</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRowWithAction}>
              <Text style={styles.infoLabel}>{t('auth.username')}</Text>
              <View style={styles.infoRowRight}>
                <Text style={styles.infoValue}>{username || t('settings.notSet')}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setNewUsername(username || '');
                    setUsernameError('');
                    setUsernameModalVisible(true);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('settings.authType')}</Text>
              <Text style={styles.infoValue}>{getAuthTypeDisplay()}</Text>
            </View>
            {publicKey && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('settings.walletAddress')}</Text>
                  <Text style={styles.infoValueSmall}>
                    {publicKey.slice(0, 8)}...{publicKey.slice(-8)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Connection Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.connection')}</Text>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
              <Text style={styles.statusText}>
                {isConnected ? t('auth.connected') : t('auth.disconnected')}
              </Text>
            </View>
          </View>
        </View>

        {/* Settings Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>

          {/* Language Selector - NOW ENABLED */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={handleLanguagePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.settingIcon}>🌐</Text>
            <Text style={styles.settingText}>{t('settings.language')}</Text>
            <Text style={styles.settingValue}>{SUPPORTED_LANGUAGES[currentLanguage]}</Text>
          </TouchableOpacity>

          {/* Sound Toggle - NOW ENABLED */}
          <View style={[styles.settingItem, styles.switchItem]}>
            <Text style={styles.settingIcon}>🔊</Text>
            <Text style={styles.settingText}>{t('settings.sound')}</Text>
            <Switch
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: '#3a3a5e', true: '#d4af37' }}
              thumbColor={soundEnabled ? '#fff' : '#888'}
              ios_backgroundColor="#3a3a5e"
            />
          </View>

          {/* Notifications - COMING SOON */}
          <View style={[styles.settingItem, styles.disabledItem]}>
            <Text style={styles.settingIcon}>🔔</Text>
            <Text style={styles.settingText}>{t('settings.notifications')}</Text>
            <Text style={styles.comingSoonBadge}>{t('settings.comingSoon')}</Text>
          </View>
        </View>

        {/* NFT Trophies Section — only shown for wallet users */}
        {publicKey && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>{t('settings.myTrophies')}</Text>
              {nftsLoading && <ActivityIndicator size="small" color="#d4af37" />}
              {!nftsLoading && (
                <TouchableOpacity onPress={loadNfts} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.refreshText}>↻</Text>
                </TouchableOpacity>
              )}
            </View>

            {nfts.length === 0 && !nftsLoading ? (
              <View style={styles.emptyTrophies}>
                <Text style={styles.emptyTrophiesIcon}>🏆</Text>
                <Text style={styles.emptyTrophiesText}>{t('settings.noTrophiesMsg')}</Text>
              </View>
            ) : (
              nfts.map((nft) => {
                const tier = TIER_LABELS[nft.tier] || TIER_LABELS[1];
                const date = new Date(nft.mintedAt).toLocaleDateString();
                const solscanUrl = nft.mintAddress
                  ? `https://solscan.io/token/${nft.mintAddress}?cluster=devnet`
                  : null;
                return (
                  <TouchableOpacity
                    key={nft.id}
                    style={[styles.nftCard, { borderLeftColor: tier.color }]}
                    onPress={() => solscanUrl && Linking.openURL(solscanUrl)}
                    activeOpacity={solscanUrl ? 0.7 : 1}
                  >
                    <Text style={styles.nftTierEmoji}>{tier.emoji}</Text>
                    <View style={styles.nftInfo}>
                      <Text style={[styles.nftTierName, { color: tier.color }]}>
                        {t(`profile.${tier.name.toLowerCase()}`)} {t('settings.champion')}
                      </Text>
                      <Text style={styles.nftDate}>Tournament #{String(nft.tournamentId).slice(0, 8)} · {date}</Text>
                      {nft.onChainMinted && nft.mintAddress ? (
                        <Text style={styles.nftMint}>{nft.mintAddress.slice(0, 8)}...{nft.mintAddress.slice(-6)} ↗</Text>
                      ) : nft.onChainMinted === false ? (
                        <Text style={styles.nftMintFailed}>{t('settings.mintingFailed')}</Text>
                      ) : (
                        <Text style={styles.nftMintPending}>{t('settings.mintingPending')}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.about')}</Text>

          <View style={styles.aboutCard}>
            <Text style={styles.appName}>{t('app.name')}</Text>
            <Text style={styles.appVersion}>Version {Constants.expoConfig?.version ?? '1.0.1'}</Text>
            <Text style={styles.appDescription}>
              {t('settings.appDescription')}
            </Text>
          </View>

          {/* Help Button */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setHelpModalVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.settingIcon}>❓</Text>
            <Text style={styles.settingText}>{t('help.title')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.dangerZone')}</Text>

          <TouchableOpacity
            style={[styles.logoutButton, isLoggingOut && styles.buttonDisabled]}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isLoggingOut ? (
              <ActivityIndicator color="#ef4444" size="small" />
            ) : (
              <>
                <Text style={styles.logoutIcon}>🚪</Text>
                <Text style={styles.logoutText}>{t('auth.logout')}</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.logoutHint}>
            {t('auth.logoutHint')}
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('settings.footer')}</Text>
        </View>
      </ScrollView>

      {/* Username Edit Modal */}
      <Modal
        visible={usernameModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUsernameModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setUsernameModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.usernameModalContent}>
            <Text style={styles.usernameModalTitle}>{t('settings.editUsername')}</Text>
            <TextInput
              style={styles.usernameInput}
              value={newUsername}
              onChangeText={(text) => {
                setNewUsername(text);
                setUsernameError('');
              }}
              placeholder={t('settings.enterNewUsername')}
              placeholderTextColor="#666"
              maxLength={20}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {usernameError ? (
              <Text style={styles.usernameErrorText}>{usernameError}</Text>
            ) : null}
            <Text style={styles.usernameHintText}>{t('settings.usernameRules')}</Text>
            <View style={styles.usernameModalButtons}>
              <TouchableOpacity
                style={styles.usernameModalCancel}
                onPress={() => setUsernameModalVisible(false)}
              >
                <Text style={styles.usernameModalCancelText}>{t('app.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.usernameModalSave, savingUsername && styles.buttonDisabled]}
                onPress={handleSaveUsername}
                disabled={savingUsername}
              >
                {savingUsername ? (
                  <ActivityIndicator size="small" color="#1a1a2e" />
                ) : (
                  <Text style={styles.usernameModalSaveText}>{t('common.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showLanguagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguagePicker(false)}
        >
          <View style={styles.languagePickerContainer}>
            <Text style={styles.languagePickerTitle}>{t('settings.selectLanguage')}</Text>
            <ScrollView>
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.languageOption,
                    currentLanguage === code && styles.languageOptionActive,
                  ]}
                  onPress={async () => {
                    const langCode = code as SupportedLanguage;
                    await changeLanguage(langCode);
                    setCurrentLanguage(langCode);
                    setShowLanguagePicker(false);
                  }}
                >
                  <Text style={[
                    styles.languageOptionText,
                    currentLanguage === code && styles.languageOptionTextActive,
                  ]}>
                    {name}
                  </Text>
                  {currentLanguage === code && (
                    <Text style={styles.languageCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.languageCancelButton}
              onPress={() => setShowLanguagePicker(false)}
            >
              <Text style={styles.languageCancelText}>{t('app.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Help Modal */}
      <HelpModal visible={helpModalVisible} onClose={() => setHelpModalVisible(false)} />
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
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#888',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 14,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#888',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  infoValueSmall: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#14F195',
  },
  divider: {
    height: 1,
    backgroundColor: '#3a3a5e',
    marginVertical: 12,
  },
  statusCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 14,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  statusText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  switchItem: {
    justifyContent: 'space-between',
  },
  disabledItem: {
    opacity: 0.6,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  settingText: {
    fontSize: 15,
    color: '#fff',
    flex: 1,
  },
  settingValue: {
    fontSize: 14,
    color: '#888',
  },
  chevron: {
    fontSize: 20,
    color: '#888',
    fontWeight: '300',
  },
  comingSoonBadge: {
    fontSize: 12,
    color: '#d4af37',
    fontWeight: '600',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aboutCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  appVersion: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  logoutHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#555',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  languagePickerContainer: {
    backgroundColor: '#2a2a4e',
    borderRadius: 16,
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  languagePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a5e',
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a5e',
  },
  languageOptionActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  languageOptionText: {
    fontSize: 15,
    color: '#fff',
  },
  languageOptionTextActive: {
    color: '#d4af37',
    fontWeight: '600',
  },
  languageCheckmark: {
    fontSize: 16,
    color: '#d4af37',
    fontWeight: '700',
  },
  languageCancelButton: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#3a3a5e',
  },
  languageCancelText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '600',
  },
  // NFT Trophies
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginLeft: 4,
  },
  refreshText: {
    fontSize: 20,
    color: '#d4af37',
    fontWeight: '700',
  },
  emptyTrophies: {
    backgroundColor: '#2a2a4e',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
  },
  emptyTrophiesIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTrophiesText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  nftCard: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  nftTierEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  nftInfo: {
    flex: 1,
  },
  nftTierName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  nftDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 3,
  },
  nftMint: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#14F195',
  },
  nftMintPending: {
    fontSize: 11,
    color: '#f59e0b',
    fontStyle: 'italic',
  },
  nftMintFailed: {
    fontSize: 11,
    color: '#ef4444',
    fontStyle: 'italic',
  },
  // Username edit row
  infoRowWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIcon: {
    fontSize: 16,
  },
  // Username modal
  usernameModalContent: {
    backgroundColor: '#2a2a4e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  usernameModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  usernameInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3a3a5e',
    marginBottom: 8,
  },
  usernameErrorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 6,
    marginLeft: 2,
  },
  usernameHintText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    marginLeft: 2,
  },
  usernameModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  usernameModalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#3a3a5e',
    alignItems: 'center',
  },
  usernameModalCancelText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  usernameModalSave: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#d4af37',
    alignItems: 'center',
  },
  usernameModalSaveText: {
    fontSize: 15,
    color: '#1a1a2e',
    fontWeight: '700',
  },
});
