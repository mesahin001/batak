/**
 * Unified Auth Context for React Native
 * Supports both wallet (Seeker/Solana Mobile) and email+password authentication
 * Provides a single playerId for use throughout the app
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AsyncStorageService } from '../services/storage/AsyncStorageService';
import { useSocket } from './SocketContext';
import { useWallet } from './WalletContext';

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  playerId: string | null;
  username: string | null;
  authType: 'wallet' | 'email' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<AuthResult>;
  registerWithEmail: (email: string, password: string) => Promise<AuthResult>;
  connectWallet: () => Promise<AuthResult>;
  setUsername: (username: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

function utf8Bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { socket, isConnected } = useSocket();
  const { publicKey: walletPublicKey, connect: walletConnect, disconnect: walletDisconnect, signMessage } = useWallet();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [authType, setAuthType] = useState<'wallet' | 'email' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!playerId;

  /**
   * Auto-login: try stored token on socket connect
   */
  useEffect(() => {
    if (!socket || !isConnected) {
      setIsLoading(true);
      return;
    }

    const attemptAutoLogin = async () => {
      try {
        const storedToken = await AsyncStorageService.getAuthToken();
        const storedUsername = await AsyncStorageService.getUsername();

        if (storedToken) {
          socket.emit('auth_validate', { token: storedToken }, (response: any) => {
            if (response.success) {
              setPlayerId(response.playerId);
              setAuthType(response.authType);
              setUsernameState(response.username || storedUsername || null);
            } else {
              // Invalid token, clear it
              AsyncStorageService.removeAuthToken();
            }
            setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auto-login error:', error);
        setIsLoading(false);
      }
    };

    attemptAutoLogin();
  }, [socket, isConnected]);

  /**
   * When wallet connects, auto-generate wallet token
   */
  useEffect(() => {
    if (!socket || !isConnected || !walletPublicKey) return;
    // Only generate wallet token if not already authenticated
    if (playerId) return;

    // Prove wallet ownership: server sends a one-time challenge, the wallet signs it.
    socket.emit('auth_wallet_challenge', { publicKey: walletPublicKey }, async (challenge: any) => {
      if (!challenge?.success) {
        console.error('[Auth] Wallet challenge failed:', challenge?.error);
        return;
      }
      try {
        const message = utf8Bytes(challenge.message);
        const signed = await signMessage(message);
        // MWA returns the signed payload (message followed by the 64-byte signature)
        const signature = signed.length > 64 ? signed.slice(signed.length - 64) : signed;
        socket.emit('auth_wallet', { publicKey: walletPublicKey, signature: bytesToBase64(signature) }, async (response: any) => {
          if (response.success && response.token) {
            await AsyncStorageService.setAuthToken(response.token);
            setPlayerId(response.playerId);
            setAuthType('wallet');
            setUsernameState(response.username || null);
          } else {
            console.error('[Auth] Wallet login rejected:', response?.error);
          }
        });
      } catch (err) {
        console.error('[Auth] Wallet signing failed:', err);
      }
    });
  }, [socket, isConnected, walletPublicKey, playerId, signMessage]);

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!socket || !isConnected) {
      return { success: false, error: 'No connection' };
    }

    return new Promise((resolve) => {
      socket.emit('auth_login', { email, password }, async (response: any) => {
        if (response.success && response.token) {
          await AsyncStorageService.setAuthToken(response.token);
          setPlayerId(response.playerId);
          setAuthType('email');
          setUsernameState(response.username || null);
          resolve({ success: true });
        } else {
          resolve({ success: false, error: response.error || 'Login failed' });
        }
      });
    });
  }, [socket, isConnected]);

  const registerWithEmail = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!socket || !isConnected) {
      return { success: false, error: 'No connection' };
    }

    return new Promise((resolve) => {
      socket.emit('auth_register', { email, password }, async (response: any) => {
        if (response.success && response.token) {
          await AsyncStorageService.setAuthToken(response.token);
          setPlayerId(response.playerId);
          setAuthType('email');
          setUsernameState(response.username || null);
          resolve({ success: true });
        } else {
          resolve({ success: false, error: response.error || 'Registration failed' });
        }
      });
    });
  }, [socket, isConnected]);

  /**
   * Connect wallet - this triggers the WalletContext to connect
   * The actual connection is handled by WalletContext
   */
  const connectWallet = useCallback(async (): Promise<AuthResult> => {
    try {
      await walletConnect();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }, [walletConnect]);

  const setUsername = useCallback(async (name: string): Promise<AuthResult> => {
    if (!socket || !isConnected || !playerId) {
      return { success: false, error: 'No connection or not authenticated' };
    }

    return new Promise((resolve) => {
      socket.emit('set_username', { publicKey: playerId, username: name }, async (response: any) => {
        if (response.success) {
          setUsernameState(response.username);
          await AsyncStorageService.setUsername(response.username);
          resolve({ success: true });
        } else {
          resolve({ success: false, error: response.error || 'Failed to save username' });
        }
      });
    });
  }, [socket, isConnected, playerId]);

  const logout = useCallback(async () => {
    await AsyncStorageService.clearAuthData();
    setPlayerId(null);
    setUsernameState(null);
    setAuthType(null);
    // Disconnect wallet if it was a wallet auth
    if (authType === 'wallet') {
      walletDisconnect();
    }
  }, [authType, walletDisconnect]);

  const value: AuthContextType = {
    playerId,
    username,
    authType,
    isAuthenticated,
    isLoading,
    loginWithEmail,
    registerWithEmail,
    connectWallet,
    setUsername,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
