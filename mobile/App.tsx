import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SocketProvider } from './src/contexts/SocketContext';
import { WalletProvider } from './src/contexts/WalletContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { initI18n } from './src/services/i18n/I18nService';
import { soundManager } from './src/utils/SoundManager';
import { RootNavigator } from './src/navigation/RootNavigator';

// Socket server URL - configure based on environment
// For development on mobile, use the actual IP of the development machine
const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'wss://batakci.xyz';

export default function App() {
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    // Initialize services before rendering
    const initServices = async () => {
      await initI18n();
      await soundManager.init();
      setIsI18nReady(true);
    };
    initServices();
  }, []);

  if (!isI18nReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <SocketProvider url={SOCKET_URL}>
      <WalletProvider>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="light" />
        </AuthProvider>
      </WalletProvider>
    </SocketProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});
