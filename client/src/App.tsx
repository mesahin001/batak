/**
 * Ana uygulama bileşeni.
 * Uygulama state'ini yönetir: loading → wallet → lobby → playing → results.
 */

import React, { useState, useEffect } from 'react';
import { WalletProvider, useWallet } from './solana/WalletContext';
import { SocketProvider, useSocket } from './socket/SocketContext';
import WalletConnect from './components/WalletConnect';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import TournamentResults from './components/TournamentResults';
import { RoundCompleteData, GameCompleteData, GameClientState } from './types/game';
import './App.css';

// App states
type AppState = 'loading' | 'wallet' | 'lobby' | 'playing' | 'results';

function AppContent() {
  const { isConnected: socketConnected } = useSocket();
  const { connected: walletConnected, publicKey } = useWallet();
  const [appState, setAppState] = useState<AppState>('loading');
  const [gameState, setGameState] = React.useState<GameClientState | null>(null);

  useEffect(() => {
    // First check if socket is connected
    if (!socketConnected) {
      setAppState('loading');
      return;
    }

    // Then check wallet
    if (!walletConnected || !publicKey) {
      setAppState('wallet');
    } else {
      setAppState('lobby');
    }
  }, [socketConnected, walletConnected, publicKey]);

  const handleJoinGame = (data: GameClientState) => {
    console.log('Joined game:', data);
    setGameState(data);
    setAppState('playing');
  };

  const handleRoundEnd = (data: RoundCompleteData) => {
    console.log('Round ended:', data);
    // Round complete is handled in the GameRoom component with a modal
    // We stay in the 'playing' state and let the user request next round
  };

  const handleGameEnd = (results: GameCompleteData) => {
    console.log('Game ended:', results);
    setGameState(results as any);
    setAppState('results');
  };

  const handleBackToLobby = () => {
    setGameState(null);
    setAppState('lobby');
  };

  const renderContent = () => {
    switch (appState) {
      case 'loading':
        return (
          <div className="loading-screen">
            <div className="spinner"></div>
            <p>Bağlanıyor...</p>
          </div>
        );

      case 'wallet':
        return (
          <div className="wallet-screen">
            <div className="logo-container">
              <h1>🃏 Batak Tournament</h1>
              <p>NFT-Rewarded Card Game on Solana</p>
            </div>
            <WalletConnect />
          </div>
        );

      case 'lobby':
        return (
          <Lobby
            onJoinGame={handleJoinGame}
          />
        );

      case 'playing':
        return (
          <GameRoom
            gameState={gameState!}
            onRoundEnd={handleRoundEnd}
            onGameEnd={handleGameEnd}
            onLeave={handleBackToLobby}
          />
        );

      case 'results':
        return (
          <TournamentResults
            results={gameState as any}
            onBackToLobby={handleBackToLobby}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="app">
      {renderContent()}
    </div>
  );
}

function App() {
  const serverUrl = import.meta.env.VITE_SERVER_URL || 'ws://localhost:3001';

  return (
    <WalletProvider>
      <SocketProvider url={serverUrl}>
        <AppContent />
      </SocketProvider>
    </WalletProvider>
  );
}

export default App;
