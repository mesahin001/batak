/**
 * Wallet Auth Screen - Dedicated Seeker wallet authentication
 * Provides wallet-only login option with detailed instructions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../contexts/WalletContext';
import { useAuth } from '../../contexts/AuthContext';
import type { AuthStackParamList } from '../../types/game';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type WalletAuthScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'WalletAuth'>;

export const WalletAuthScreen = () => {
  const navigation = useNavigation<WalletAuthScreenNavigationProp>();
  const { t } = useTranslation();
  const { connect, isConnected, isConnecting, publicKey } = useWallet();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [connectionError, setConnectionError] = useState('');
  const [connectionStep, setConnectionStep] = useState<'idle' | 'connecting' | 'authorizing' | 'authenticating' | 'success'>('idle');

  /**
   * Handle wallet connection with step-by-step feedback
   */
  const handleWalletConnect = async () => {
    setConnectionError('');
    setConnectionStep('connecting');

    try {
      // Step 1: Open Seeker and get authorization
      setConnectionStep('authorizing');
      await connect();

      // Connection successful, now authenticating with server
      setConnectionStep('authenticating');
      // AuthContext will handle server authentication

      // Wait a moment to show success state
      setTimeout(() => {
        setConnectionStep('success');
      }, 500);
    } catch (error) {
      setConnectionError('Failed to connect to wallet. Please make sure:');
      setConnectionStep('idle');
      console.error('Wallet connection error:', error);
    }
  };

  /**
   * Navigate back to login
   */
  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  /**
   * Reset to idle when connected but not authenticated
   */
  useEffect(() => {
    if (isConnected && !isAuthenticated && connectionStep === 'authenticating') {
      // Still waiting for auth, keep showing authenticating
    } else if (isAuthenticated) {
      setConnectionStep('success');
    }
  }, [isConnected, isAuthenticated, connectionStep]);

  const isLoading = isConnecting || authLoading || connectionStep !== 'idle';
  const showSuccess = isConnected && isAuthenticated;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>👛</Text>
          </View>
          <Text style={styles.title}>{t('auth.walletAuthTitle')}</Text>
          <Text style={styles.subtitle}>{t('auth.walletSubtitle')}</Text>
        </View>

        {/* Connection Status */}
        <View style={styles.statusContainer}>
          {connectionStep === 'idle' && (
            <View style={styles.statusIdle}>
              <Text style={styles.statusIcon}>💡</Text>
              <Text style={styles.statusText}>{t('auth.walletReady')}</Text>
            </View>
          )}

          {(connectionStep === 'connecting' || connectionStep === 'authorizing') && (
            <View style={styles.statusConnecting}>
              <ActivityIndicator color="#14F195" size="large" />
              <Text style={styles.statusText}>
                {connectionStep === 'connecting' ? t('auth.walletOpening') : t('auth.walletWaiting')}
              </Text>
              <Text style={styles.statusSubtext}>{t('auth.walletApprove')}</Text>
            </View>
          )}

          {connectionStep === 'authenticating' && (
            <View style={styles.statusConnecting}>
              <ActivityIndicator color="#6C63FF" size="large" />
              <Text style={styles.statusText}>{t('auth.walletAuthenticating')}</Text>
            </View>
          )}

          {showSuccess && (
            <View style={styles.statusSuccess}>
              <Text style={styles.statusIcon}>✅</Text>
              <Text style={styles.statusText}>{t('auth.walletSuccess')}</Text>
              {publicKey && (
                <Text style={styles.walletAddress}>
                  {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
                </Text>
              )}
            </View>
          )}

          {connectionError ? (
            <View style={styles.statusError}>
              <Text style={styles.statusIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>{t('auth.walletFailed')}</Text>
            </View>
          ) : null}
        </View>

        {/* Error Message */}
        {connectionError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{connectionError}</Text>
            <View style={styles.errorList}>
              <Text style={styles.errorBullet}>• {t('auth.checkSeeker')}</Text>
              <Text style={styles.errorBullet}>• {t('auth.checkWallet')}</Text>
              <Text style={styles.errorBullet}>• {t('auth.checkInternet')}</Text>
            </View>
          </View>
        ) : null}

        {/* Connect Button */}
        {!showSuccess && (
          <TouchableOpacity
            style={[styles.connectButton, isLoading ? styles.buttonDisabled : null]}
            onPress={handleWalletConnect}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>{t('auth.walletConnecting')}</Text>
              </>
            ) : (
              <>
                <Text style={styles.connectIcon}>🔗</Text>
                <Text style={styles.buttonText}>{t('auth.connectWalletButton')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Why Use Wallet Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>{t('auth.walletWhyTitle')}</Text>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>🔐</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>{t('auth.featureSecure')}</Text>
              <Text style={styles.infoItemText}>{t('auth.featureSecureDesc')}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>⚡</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>{t('auth.featureFast')}</Text>
              <Text style={styles.infoItemText}>{t('auth.featureFastDesc')}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>🏆</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>{t('auth.featureRewards')}</Text>
              <Text style={styles.infoItemText}>{t('auth.featureRewardsDesc')}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIcon}>
              <Text style={styles.infoEmoji}>🎮</Text>
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>{t('auth.featurePlay')}</Text>
              <Text style={styles.infoItemText}>{t('auth.featurePlayDesc')}</Text>
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.howTitle}>{t('auth.walletHowTitle')}</Text>
          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>{t('auth.walletStep1')}</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>{t('auth.walletStep2')}</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>{t('auth.walletStep3')}</Text>
            </View>
          </View>
        </View>

        {/* Back to Login */}
        <View style={styles.backContainer}>
          <Text style={styles.backText}>{t('auth.walletPreferEmail')}</Text>
          <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
            <Text style={styles.backLink}>{t('auth.walletSignIn')}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by Solana Mobile</Text>
          <Text style={styles.footerEmoji}>🌱</Text>
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
    flexGrow: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(20, 241, 149, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#2a2a4e',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIdle: {
    alignItems: 'center',
  },
  statusConnecting: {
    alignItems: 'center',
  },
  statusSuccess: {
    alignItems: 'center',
  },
  statusError: {
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusSubtext: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
  walletAddress: {
    fontSize: 14,
    color: '#14F195',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
  },
  errorList: {
    paddingLeft: 8,
  },
  errorBullet: {
    color: '#ef4444',
    fontSize: 13,
    lineHeight: 22,
  },
  connectButton: {
    backgroundColor: '#14F195',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    flexDirection: 'row',
    shadowColor: '#14F195',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  connectIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  infoSection: {
    backgroundColor: '#252545',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3a3a5e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoEmoji: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  infoItemText: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  howItWorks: {
    backgroundColor: '#252545',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  howTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepContainer: {
    alignItems: 'center',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  stepText: {
    fontSize: 14,
    color: '#fff',
    flex: 1,
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: '#3a3a5e',
    marginLeft: 17,
    marginVertical: 4,
  },
  backContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    fontSize: 14,
    color: '#888',
  },
  backLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#666',
    marginRight: 6,
  },
  footerEmoji: {
    fontSize: 16,
  },
});
