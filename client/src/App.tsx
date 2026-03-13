/**
 * Ana uygulama bileseni.
 * Uygulama state'ini yonetir: loading -> auth -> username -> lobby -> playing -> results.
 */

import React, { useState, useEffect } from 'react';
import { WalletProvider } from './solana/WalletContext';
import { SocketProvider, useSocket } from './socket/SocketContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import AuthScreen from './components/AuthScreen';
import UsernameInput from './components/UsernameInput';
import Navbar from './components/Navbar';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import TournamentResults from './components/TournamentResults';
import Leaderboard from './components/Leaderboard';
import PlayerProfile from './components/PlayerProfile';
import { RoundCompleteData, GameCompleteData, GameClientState } from './types/game';
import './App.css';

// App states
type AppState = 'loading' | 'auth' | 'username' | 'lobby' | 'playing' | 'results' | 'leaderboard' | 'profile';

function AppContent() {
  const { socket, isConnected: socketConnected } = useSocket();
  const { playerId, username, authType, isAuthenticated, isLoading: authLoading, logout, setUsername: authSetUsername } = useAuth();
  const [appState, setAppState] = useState<AppState>('loading');
  const [gameState, setGameState] = React.useState<GameClientState | null>(null);
  const [selectedProfileKey, setSelectedProfileKey] = useState<string | null>(null);

  useEffect(() => {
    // First check if socket is connected
    if (!socketConnected) {
      setAppState('loading');
      return;
    }

    // Wait for auth loading to finish
    if (authLoading) {
      setAppState('loading');
      return;
    }

    // Not authenticated -> auth screen
    if (!isAuthenticated || !playerId) {
      setAppState('auth');
      return;
    }

    // Authenticated but no username -> username screen
    if (appState === 'loading' || appState === 'auth') {
      if (username) {
        setAppState('lobby');
      } else {
        setAppState('username');
      }
    }
  }, [socketConnected, authLoading, isAuthenticated, playerId, username]);

  // Listen for game_rejoined (reconnection)
  useEffect(() => {
    if (!socket) return;

    const handleGameRejoined = (data: { roomId: string; gameState: GameClientState }) => {
      console.log('Game rejoined (reconnect):', data);
      setGameState(data.gameState);
      setAppState('playing');
    };

    socket.on('game_rejoined', handleGameRejoined);

    return () => {
      socket.off('game_rejoined', handleGameRejoined);
    };
  }, [socket]);

  const handleJoinGame = (data: GameClientState) => {
    console.log('Joined game:', data);
    setGameState(data);
    setAppState('playing');
  };

  const handleRoundEnd = (data: RoundCompleteData) => {
    console.log('Round ended:', data);
  };

  const handleGameEnd = (results: GameCompleteData) => {
    console.log('Game ended:', results);
    setGameState(results as any);
    setAppState('results');
  };

  const handleBackToLobby = () => {
    setGameState(null);
    setSelectedProfileKey(null);
    setAppState('lobby');
  };

  const handleViewLeaderboard = () => {
    setAppState('leaderboard');
  };

  const handleViewProfile = (pk: string) => {
    setSelectedProfileKey(pk);
    setAppState('profile');
  };

  const handleLogout = () => {
    logout();
    setGameState(null);
    setAppState('auth');
  };

  const showNavbar = isAuthenticated && appState !== 'loading' && appState !== 'auth' && appState !== 'playing';
  const showFooter = appState !== 'playing' && appState !== 'loading';

  const renderContent = () => {
    switch (appState) {
      case 'loading':
        return (
          <div className="loading-screen">
            <div className="spinner"></div>
            <p>Connecting...</p>
          </div>
        );

      case 'auth':
        return <AuthScreen />;

      case 'username':
        return (
          <UsernameInput
            onComplete={(name) => {
              if (name) {
                authSetUsername(name);
              }
              setAppState('lobby');
            }}
          />
        );

      case 'lobby':
        return (
          <Lobby
            username={username || undefined}
            onJoinGame={handleJoinGame}
            onViewLeaderboard={handleViewLeaderboard}
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

      case 'leaderboard':
        return (
          <Leaderboard
            onSelectPlayer={handleViewProfile}
            onBack={handleBackToLobby}
          />
        );

      case 'profile':
        return (
          <PlayerProfile
            publicKey={selectedProfileKey!}
            onBack={() => setAppState('leaderboard')}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="app">
      {showNavbar && (
        <Navbar
          username={username}
          playerId={playerId}
          authType={authType}
          onLogout={handleLogout}
          minimal={false}
        />
      )}
      <div className={`app-content ${showNavbar ? 'with-navbar' : ''}`}>
        {renderContent()}
      </div>
      {showFooter && (
        <footer className="app-footer">
          <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
          <span>·</span>
          <a href="/terms.html" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a>
          <span>·</span>
          <a href="/legal/license" target="_blank" rel="noopener noreferrer">License</a>
        </footer>
      )}
    </div>
  );
}

function App() {
  const serverUrl = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? '' : 'ws://localhost:3001');

  return (
    <WalletProvider>
      <SocketProvider url={serverUrl}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </SocketProvider>
    </WalletProvider>
  );
}

export default App;
