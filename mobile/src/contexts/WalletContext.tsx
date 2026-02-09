/**
 * Wallet Context for React Native
 * Handles Seeker wallet connection and management
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { NativeEventEmitter, NativeModules } from 'react-native';
import {
  SeekerWalletService,
  WalletAuthResult,
  APP_IDENTITY,
} from '../services/wallet/SeekerWalletService';
import { AsyncStorageService } from '../services/storage/AsyncStorageService';

interface WalletContextType {
  publicKey: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  authToken: string | null;
  connect: () => Promise<WalletAuthResult>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<WalletAuthResult | null>;
  signTransaction: (transaction: any) => Promise<any>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: React.ReactNode;
  // Callback when wallet successfully connects
  onWalletConnected?: (publicKey: string) => void;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children, onWalletConnected }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  /**
   * Check if wallet was previously authorized and attempt reconnect
   */
  useEffect(() => {
    const checkExistingAuth = async () => {
      const storedPublicKey = await AsyncStorageService.getWalletPublicKey();
      const storedToken = await AsyncStorageService.getWalletToken();

      if (storedPublicKey && storedToken) {
        setPublicKey(storedPublicKey);
        setAuthToken(storedToken);
        setIsConnected(true);
      }
    };

    checkExistingAuth();
  }, []);

  /**
   * Connect to Seeker wallet
   */
  const connect = useCallback(async (): Promise<WalletAuthResult> => {
    if (isConnecting) {
      throw new Error('Wallet connection already in progress');
    }

    setIsConnecting(true);

    try {
      const result = await SeekerWalletService.authorize();

      setPublicKey(result.publicKey);
      setAuthToken(result.authToken);
      setIsConnected(true);

      // Notify parent that wallet connected
      if (onWalletConnected) {
        onWalletConnected(result.publicKey);
      }

      return result;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting, onWalletConnected]);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(async () => {
    try {
      await SeekerWalletService.deauthorize();
    } catch (error) {
      console.error('Wallet deauthorization failed:', error);
    } finally {
      setPublicKey(null);
      setAuthToken(null);
      setIsConnected(false);
    }
  }, []);

  /**
   * Attempt silent reconnect using stored auth token
   */
  const reconnect = useCallback(async (): Promise<WalletAuthResult | null> => {
    try {
      const result = await SeekerWalletService.reauthorize();

      if (result) {
        setPublicKey(result.publicKey);
        setAuthToken(result.authToken);
        setIsConnected(true);

        if (onWalletConnected) {
          onWalletConnected(result.publicKey);
        }

        return result;
      }

      // Reconnect failed, clear state
      setPublicKey(null);
      setAuthToken(null);
      setIsConnected(false);

      return null;
    } catch (error) {
      console.error('Wallet reconnection failed:', error);
      setPublicKey(null);
      setAuthToken(null);
      setIsConnected(false);
      return null;
    }
  }, [onWalletConnected]);

  /**
   * Sign a transaction
   */
  const signTransaction = useCallback(async (transaction: any): Promise<any> => {
    if (!isConnected || !publicKey) {
      throw new Error('Wallet not connected');
    }

    return await SeekerWalletService.signTransaction(transaction);
  }, [isConnected, publicKey]);

  /**
   * Sign a message
   */
  const signMessage = useCallback(async (message: Uint8Array): Promise<Uint8Array> => {
    if (!isConnected || !publicKey) {
      throw new Error('Wallet not connected');
    }

    return await SeekerWalletService.signMessage(message);
  }, [isConnected, publicKey]);

  const value: WalletContextType = {
    publicKey,
    isConnected,
    isConnecting,
    authToken,
    connect,
    disconnect,
    reconnect,
    signTransaction,
    signMessage,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

/**
 * Hook to get wallet connection status without full context
 */
export const useWalletConnection = () => {
  const { publicKey, isConnected, isConnecting } = useWallet();
  return {
    publicKey,
    isConnected,
    isConnecting,
    hasWallet: !!publicKey,
  };
};
