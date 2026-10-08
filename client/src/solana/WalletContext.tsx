/**
 * Wallet context.
 * Solana cüzdan bağlantısını (Phantom/Seeker/Backpack) uygulama genelinde yönetir.
 * Mobil cüzdanlar için @solana-mobile/wallet-adapter-mobile kullanır.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface WalletContextType {
  publicKey: string | null;
  connecting: boolean;
  connected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (transaction: any) => Promise<any>;
  /** Sign a UTF-8 message with the connected wallet; returns the signature as base64. */
  signMessage: (message: string) => Promise<string>;
  availableWallets: string[];
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
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);

  // Detect available wallets
  const detectWallets = useCallback(() => {
    const wallets: string[] = [];
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    // Check for various wallet injection points
    const phantom = !!(window as any).solana?.isPhantom;
    const backpack = !!(window as any).backpack;
    const solanaProvider = !!(window as any).solana;

    if (phantom) wallets.push('Phantom');
    if (backpack) wallets.push('Backpack');
    if (solanaProvider && !phantom) wallets.push('Diğer Solana Cüzdan');

    // On mobile, show that test mode is available
    if (isMobile) {
      wallets.push('Test Modu (Otomatik)');
    }

    setAvailableWallets(wallets);
    console.log('[Wallet] Detected wallets:', wallets);
    console.log('[Wallet] Is mobile:', isMobile);

    return wallets;
  }, []);

  // Check for existing connection on mount
  useEffect(() => {
    detectWallets();
    const interval = setInterval(detectWallets, 2000);
    return () => clearInterval(interval);
  }, [detectWallets]);

  // Connect wallet
  const connect = useCallback(async () => {
    setConnecting(true);

    try {
      console.log('[Wallet] Attempting to connect wallet...');
      console.log('[Wallet] User agent:', navigator.userAgent);

      // 1. Check for Phantom wallet (works in browser)
      const solana = (window as any).solana;
      if (solana?.isPhantom) {
        console.log('[Wallet] Found Phantom wallet');
        const response = await solana.connect();
        setPublicKey(response.publicKey.toString());
        setConnected(true);
        console.log('[Wallet] Connected via Phantom');
        return;
      }

      // 2. Check for Backpack wallet (works in browser)
      const backpack = (window as any).backpack;
      if (backpack) {
        console.log('[Wallet] Found Backpack wallet');
        const response = await backpack.connect();
        setPublicKey(response.publicKey.toString());
        setConnected(true);
        console.log('[Wallet] Connected via Backpack');
        return;
      }

      // 3. Check for general Solana provider
      if (solana) {
        console.log('[Wallet] Found general Solana provider');
        const response = await solana.connect();
        setPublicKey(response.publicKey.toString());
        setConnected(true);
        console.log('[Wallet] Connected via general Solana provider');
        return;
      }

      // 4. No wallet found. There is no mock fallback: the server only accepts
      // wallets that can sign a challenge, so use email login instead.
      console.warn('[Wallet] No Solana wallet detected');
      throw new Error('Solana cüzdanı bulunamadı. E-posta ile giriş yapabilirsiniz.');
    } catch (error) {
      console.error('[Wallet] Failed to connect wallet:', error);
      setConnecting(false);
      throw new Error('Cüzdan bağlanamadı: ' + (error as any)?.message || 'Bilinmeyen hata');
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

  // Sign a message with the injected wallet (Phantom, Backpack or generic provider)
  const signMessage = useCallback(async (message: string): Promise<string> => {
    const w = window as any;
    const provider = w.solana?.isPhantom ? w.solana : (w.backpack || w.solana);
    if (!provider?.signMessage) {
      throw new Error('Cüzdan mesaj imzalamayı desteklemiyor');
    }
    const encoded = new TextEncoder().encode(message);
    const result = await provider.signMessage(encoded, 'utf8');
    const bytes: Uint8Array = result?.signature ?? result;
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }, []);

  const value: WalletContextType = {
    publicKey,
    connecting,
    connected,
    connect,
    disconnect,
    signTransaction,
    signMessage,
    availableWallets,
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
  if (context === undefined) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};

// Type declarations for window.solana
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect?: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect?: () => Promise<void>;
      signTransaction?: (transaction: any) => Promise<any>;
    };
    solanaMobileWalletAdapter?: {
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect?: () => Promise<void>;
    };
    backpack?: {
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect?: () => Promise<void>;
    };
  }
}
