/**
 * Register Screen - New user registration
 * Email, password, and confirm password with validation
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import type { AuthStackParamList } from '../../types/game';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { registerWithEmail, isLoading: authLoading } = useAuth();
  const { connect: connectWallet, isConnecting: walletConnecting } = useWallet();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [usernameError, setUsernameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [registerError, setRegisterError] = useState('');

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
    setUsernameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    // Validate username
    if (!username.trim()) {
      setUsernameError('Username is required');
      isValid = false;
    } else if (username.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters');
      isValid = false;
    }

    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email');
      isValid = false;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    // Validate confirm password
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  /**
   * Handle registration
   */
  const handleRegister = async () => {
    setRegisterError('');

    if (!validateForm()) {
      return;
    }

    try {
      const result = await registerWithEmail(email.trim(), password);

      if (result.success) {
        // Optionally set username after registration
        if (username.trim()) {
          // Username will be set on the server
        }
      } else {
        setRegisterError(result.error || 'Registration failed. Please try again.');
      }
      // If successful, AuthContext will handle navigation via RootNavigator
    } catch (error) {
      setRegisterError('An unexpected error occurred. Please try again.');
      console.error('Registration error:', error);
    }
  };

  /**
   * Handle Seeker wallet connection
   */
  const handleWalletConnect = async () => {
    setRegisterError('');

    try {
      await connectWallet();
      // If successful, AuthContext will detect wallet connection and authenticate
    } catch (error) {
      setRegisterError('Failed to connect wallet. Make sure Seeker is installed.');
      console.error('Wallet connection error:', error);
    }
  };

  /**
   * Navigate back to login screen
   */
  const navigateToLogin = () => {
    navigation.navigate('Login');
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the Batak Tournament</Text>
        </View>

        {/* Register Error Message */}
        {registerError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{registerError}</Text>
          </View>
        ) : null}

        {/* Username Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={[styles.input, usernameError ? styles.inputError : null]}
            placeholder="Enter your username"
            placeholderTextColor="#666"
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              setUsernameError('');
              setRegisterError('');
            }}
            autoCapitalize="words"
            autoComplete="username"
            textContentType="username"
            editable={!isLoading}
            maxLength={20}
          />
          {usernameError ? <Text style={styles.fieldError}>{usernameError}</Text> : null}
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            placeholder="your@email.com"
            placeholderTextColor="#666"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError('');
              setRegisterError('');
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
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, passwordError ? styles.inputError : null]}
              placeholder="••••••••"
              placeholderTextColor="#666"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
                setRegisterError('');
              }}
              secureTextEntry={!showPassword}
              autoComplete="password"
              textContentType="newPassword"
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
          {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}
          {password && !passwordError ? (
            <Text style={styles.hintText}>
              {password.length >= 6 ? '✓' : '•'} At least 6 characters
            </Text>
          ) : null}
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, confirmPasswordError ? styles.inputError : null]}
              placeholder="••••••••"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setConfirmPasswordError('');
                setRegisterError('');
              }}
              secureTextEntry={!showConfirmPassword}
              autoComplete="password"
              textContentType="newPassword"
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading}
            >
              <Text style={styles.eyeIconText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>
          {confirmPasswordError ? <Text style={styles.fieldError}>{confirmPasswordError}</Text> : null}
          {confirmPassword && !confirmPasswordError && password === confirmPassword ? (
            <Text style={styles.hintText}>✓ Passwords match</Text>
          ) : null}
        </View>

        {/* Register Button */}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, isLoading ? styles.buttonDisabled : null]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Wallet Connect Button */}
        <TouchableOpacity
          style={[styles.button, styles.walletButton, walletConnecting ? styles.buttonDisabled : null]}
          onPress={handleWalletConnect}
          disabled={walletConnecting}
        >
          {walletConnecting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.walletIcon}>👛</Text>
              <Text style={styles.buttonText}>Connect with Seeker</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Terms and Privacy */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={navigateToLogin} disabled={isLoading}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Play Batak card game on Solana</Text>
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
    marginTop: 30,
    marginBottom: 30,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  logoEmoji: {
    fontSize: 35,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
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
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#2a2a4e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    top: 12,
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
  hintText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    color: '#22c55e',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#6C63FF',
    marginTop: 8,
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
    marginVertical: 18,
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
  termsContainer: {
    marginTop: 8,
    paddingHorizontal: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 18,
  },
  loginText: {
    fontSize: 14,
    color: '#888',
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
  },
});
