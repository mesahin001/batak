/**
 * Socket.IO context for React Native
 * WebSocket bağlantısını uygulama genelinde erişilebilir yapar
 * Silent reconnect with auth token support
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { AsyncStorageService } from '../services/storage/AsyncStorageService';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  connectionAttempts: number;
  connect: () => void;
  disconnect: () => void;
  forceReconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  url: string;
  children: React.ReactNode;
  // Auth token for automatic reauthentication
  authToken?: string;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ url, children, authToken }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Authenticate socket with stored token
   */
  const authenticateSocket = useCallback(async (socketInstance: Socket) => {
    try {
      const token = authToken || await AsyncStorageService.getAuthToken();

      if (token && socketInstance.connected) {
        socketInstance.emit('auth_validate', { token }, (response: any) => {
          if (response.success) {
            console.log('Socket authenticated successfully');
          } else {
            console.warn('Socket authentication failed');
          }
        });
      }
    } catch (error) {
      console.error('Error authenticating socket:', error);
    }
  }, [authToken]);

  /**
   * Connect to socket server
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('Socket already connected');
      return;
    }

    console.log('Connecting to socket server:', url);

    const socketInstance = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
      autoConnect: true,
    });

    socketInstance.on('connect', async () => {
      console.log('Socket connected:', socketInstance.id);
      setIsConnected(true);
      setIsReconnecting(false);
      setConnectionAttempts(0);

      // Authenticate if token exists
      await authenticateSocket(socketInstance);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);

      // If server disconnected, try to reconnect
      if (reason === 'io server disconnect') {
        socketInstance.connect();
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error?.message || error);
      setConnectionAttempts(prev => prev + 1);
    });

    socketInstance.on('reconnect_attempt', (attempt) => {
      console.log(`Socket reconnecting... attempt ${attempt}`);
      setIsReconnecting(true);
      setConnectionAttempts(attempt);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setIsReconnecting(false);
      setConnectionAttempts(0);

      // Re-authenticate on reconnect
      authenticateSocket(socketInstance);
    });

    socketInstance.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after all attempts');
      setIsReconnecting(false);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);
  }, [url, authenticateSocket]);

  /**
   * Disconnect socket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('Disconnecting socket');
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setIsReconnecting(false);
      setConnectionAttempts(0);
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Force reconnect
   */
  const forceReconnect = useCallback(() => {
    disconnect();
    // Small delay before reconnecting
    setTimeout(() => {
      connect();
    }, 500);
  }, [disconnect, connect]);

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  /**
   * Re-authenticate when auth token changes
   */
  useEffect(() => {
    if (isConnected && socket && authToken) {
      authenticateSocket(socket);
    }
  }, [authToken, isConnected, socket, authenticateSocket]);

  /**
   * Handle app state changes (foreground/background)
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && !isConnected && !isReconnecting) {
        console.log('App came to foreground, reconnecting socket...');
        forceReconnect();
      }
    };

    // Note: AppState import would be added when used
    // For now, this is a placeholder for app state handling
    // import { AppState } from 'react-native';
    // AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // Cleanup listener when component unmounts
      // AppState.removeEventListener('change', handleAppStateChange);
    };
  }, [isConnected, isReconnecting, forceReconnect]);

  const value: SocketContextType = {
    socket,
    isConnected,
    isReconnecting,
    connectionAttempts,
    connect,
    disconnect,
    forceReconnect,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Hook to use socket context
 */
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

/**
 * Hook to get socket connection status without full context
 */
export const useSocketStatus = () => {
  const { isConnected, isReconnecting, connectionAttempts } = useSocket();
  return {
    isConnected,
    isReconnecting,
    connectionAttempts,
    isAttemptingConnection: isReconnecting || connectionAttempts > 0,
  };
};
