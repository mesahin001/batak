/**
 * Login Screen - Email/Password and Wallet authentication
 * Supports both email/password login and Seeker wallet connection
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import type { AuthStackParamList } from '../../types/game';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { t } = useTranslation();
  const { loginWithEmail, isLoading: authLoading } = useAuth();
  const { connect: connectWallet, isConnecting: walletConnecting, isConnected: walletConnected } = useWallet();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeMode, setActiveMode] = useState<'email' | 'wallet'>('email');

  /**
   * Validate email format
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    let isValid = true;

    // Reset errors
    setEmailError('');
    setPasswordError('');

    // Validate email
    if (!email.trim()) {
      setEmailError(t('auth.email') + ' ' + t('common.error'));
      isValid = false;
    } else if (!isValidEmail(email)) {
      setEmailError(t('auth.invalidEmail'));
      isValid = false;
    }

    // Validate password
    if (!password) {
      setPasswordError(t('auth.password') + ' ' + t('common.error'));
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError(t('auth.passwordTooShort'));
      isValid = false;
    }

    return isValid;
  };

  /**
   * Handle email/password login
   */
  const handleLogin = async () => {
    setLoginError('');

    if (!validateForm()) {
      return;
    }

    try {
      const result = await loginWithEmail(email.trim(), password);

      if (!result.success) {
        setLoginError(result.error || t('auth.loginFailed'));
      }
      // If successful, AuthContext will handle navigation via RootNavigator
    } catch (error) {
      setLoginError(t('app.error'));
      console.error('Login error:', error);
    }
  };

  /**
   * Handle Seeker wallet connection
   */
  const handleWalletConnect = async () => {
    setLoginError('');

    try {
      await connectWallet();
      // If successful, AuthContext will detect wallet connection and authenticate
    } catch (error) {
      setLoginError(t('auth.loginFailed'));
      console.error('Wallet connection error:', error);
    }
  };

  /**
   * Navigate to register screen
   */
  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const isLoading = authLoading || walletConnecting;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Title */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoEmoji}>🃏</Text>
          </View>
          <Text style={styles.title}>{t('app.name')}</Text>
          <Text style={styles.subtitle}>{t('auth.login')}</Text>
        </View>

        {/* Login Error Message */}
        {loginError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{loginError}</Text>
          </View>
        ) : null}

        {/* Auth Mode Toggle */}
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            style={[styles.modeToggle, activeMode === 'email' && styles.modeToggleActive]}
            onPress={() => setActiveMode('email')}
            disabled={isLoading}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.modeToggleText, activeMode === 'email' && styles.modeToggleTextActive]}>
              📧 {t('auth.email')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeToggle, activeMode === 'wallet' && styles.modeToggleActive]}
            onPress={() => setActiveMode('wallet')}
            disabled={isLoading}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.modeToggleText, activeMode === 'wallet' && styles.modeToggleTextActive]}>
              👛 {t('auth.walletConnection')}
            </Text>
          </TouchableOpacity>
        </View>

        {activeMode === 'email' && (
          <>
            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                style={[styles.input, emailError ? styles.inputError : null]}
                placeholder="your@email.com"
                placeholderTextColor="#666"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailError('');
                  setLoginError('');
                }}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                editable={!isLoading}
              />
              {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, passwordError ? styles.inputError : null]}
                  placeholder="••••••••"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError('');
                    setLoginError('');
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  textContentType="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
              {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isLoading ? styles.buttonDisabled : null]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>{t('auth.login')}</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {activeMode === 'wallet' && (
          <>
            {/* Wallet Info Card */}
            <View style={styles.walletInfoCard}>
              <Text style={styles.walletInfoText}>
                {t('auth.seekerConnect')}
              </Text>
            </View>

            {/* Wallet Connect Button */}
            <TouchableOpacity
              style={[styles.button, styles.walletButton, walletConnecting ? styles.buttonDisabled : null]}
              onPress={handleWalletConnect}
              disabled={walletConnecting}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {walletConnecting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.walletIcon}>👛</Text>
                  <Text style={styles.buttonText}>
                    {walletConnected ? t('auth.loginSuccess') : t('auth.seekerConnect')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Register Link */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>{t('common.back')} </Text>
          <TouchableOpacity
            onPress={navigateToRegister}
            disabled={isLoading}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.registerLink}>{t('auth.register')}</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('app.name')}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  eyeIconText: {
    fontSize: 20,
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#6C63FF',
  },
  walletButton: {
    backgroundColor: '#14F195',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  walletIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3a3a5e',
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
    color: '#888',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  modeToggle: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  modeToggleActive: {
    backgroundColor: '#6C63FF',
  },
  modeToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
  },
  modeToggleTextActive: {
    color: '#fff',
  },
  walletInfoCard: {
    backgroundColor: 'rgba(20, 241, 149, 0.1)',
    borderWidth: 1,
    borderColor: '#14F195',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  walletInfoText: {
    fontSize: 14,
    color: '#14F195',
    textAlign: 'center',
    lineHeight: 20,
  },
});
