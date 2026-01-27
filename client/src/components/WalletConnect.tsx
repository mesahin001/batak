/**
 * Cüzdan bağlantı bileşeni.
 * Phantom/Solana Seeker wallet bağlantısı ve disconnect arayüzü.
 */

import React, { useState } from 'react';
import { useWallet } from '../solana/WalletContext';
import './WalletConnect.css';

interface WalletConnectProps {
  onConnect?: () => void;
}

const WalletConnect: React.FC<WalletConnectProps> = ({ onConnect }) => {
  const { publicKey, connect, disconnect, connecting } = useWallet();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try {
      await connect();
      onConnect?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  if (publicKey) {
    return (
      <div className="wallet-connected">
        <div className="wallet-info">
          <div className="wallet-icon">👛</div>
          <div className="wallet-details">
            <p className="wallet-label">Connected</p>
            <p className="wallet-address">{formatAddress(publicKey.toString())}</p>
          </div>
        </div>
        <button
          className="btn-secondary"
          onClick={handleDisconnect}
          disabled={connecting}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connect">
      <div className="wallet-content">
        <div className="wallet-icon-large">🔐</div>
        <h2>Connect Your Wallet</h2>
        <p>Connect your Solana wallet to play tournaments and earn NFT rewards</p>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <>
              <div className="spinner"></div>
              Connecting...
            </>
          ) : (
            'Connect Wallet'
          )}
        </button>

        <div className="wallet-options">
          <p className="wallet-note">Supported wallets:</p>
          <div className="wallet-list">
            <span>Solana Seeker</span>
            <span>Phantom</span>
            <span>Backpack</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnect;
