/**
 * Auth Navigator - Authentication screens stack
 * Wallet-only auth (email auth temporarily disabled)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WalletAuthScreen } from '../screens/auth/WalletAuthScreen';
import type { AuthStackParamList } from '../types/game';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="WalletAuth"
      screenOptions={{
        headerShown: false,
        orientation: 'portrait',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="WalletAuth" component={WalletAuthScreen} />
    </Stack.Navigator>
  );
};
