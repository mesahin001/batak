/**
 * Wallet context.
 * Solana cüzdan bağlantısını (Phantom/Seeker) uygulama genelinde yönetir.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
interface WalletContextType {
  publicKey: string | null;
  connecting: boolean;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (transaction: any) => Promise<any>;
}

// Create context
const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Provider props
interface WalletProviderProps {
  children: React.ReactNode;
}

// Wallet Provider
export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);

  // Check for existing connection on mount
  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        // Check if running in Solana Seeker mobile app
        if ((window as any).solanaMobileWalletAdapter) {
          const adapter = (window as any).solanaMobileWalletAdapter;
          // For MVP, just set a mock connection
          // In production, would properly connect via adapter
        }
      } catch (error) {
        console.log('No existing wallet connection found');
      }
    };

    checkExistingConnection();
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    setConnecting(true);

    try {
      // Check for Solana Mobile Wallet Adapter (Solana Seeker)
      if ((window as any).solanaMobileWalletAdapter) {
        const adapter = (window as any).solanaMobileWalletAdapter;
        const response = await adapter.connect();
        setPublicKey(response.publicKey.toString());
        setConnected(true);
      }
      // Check for Phantom wallet
      else if ((window as any).solana?.isPhantom) {
        const response = await (window as any).solana.connect();
        setPublicKey(response.publicKey.toString());
        setConnected(true);
      }
      // Check for general Solana provider
      else if ((window as any).solana) {
        const response = await (window as any).solana.connect();
        setPublicKey(response.publicKey.toString());
        setConnected(true);
      }
      // Fallback: generate mock wallet for testing
      else {
        console.warn('No Solana wallet found. Using mock wallet for testing.');
        // Generate a mock public key
        const mockKey = 'Mock' + Math.random().toString(36).substring(2, 12) + 'Wallet';
        setPublicKey(mockKey);
        setConnected(true);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    } finally {
      setConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    try {
      if ((window as any).solana?.disconnect) {
        (window as any).solana.disconnect();
      }
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    } finally {
      setPublicKey(null);
      setConnected(false);
    }
  }, []);

  // Sign transaction
  const signTransaction = useCallback(async (transaction: any) => {
    try {
      if ((window as any).solana?.signTransaction) {
        return await (window as any).solana.signTransaction(transaction);
      }
      throw new Error('Wallet does not support signing');
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw error;
    }
  }, []);

  const value: WalletContextType = {
    publicKey,
    connecting,
    connected,
    connect,
    disconnect,
    signTransaction,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Hook to use wallet context
export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

// Type declarations for window.solana
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: any) => Promise<any>;
    };
    solanaMobileWalletAdapter?: any;
  }
}
