/**
 * Auth Navigator - Authentication screens stack
 * Login, Register, and other auth-related screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { WalletAuthScreen } from '../screens/auth/WalletAuthScreen';
import type { AuthStackParamList } from '../types/game';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        orientation: 'portrait',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="WalletAuth" component={WalletAuthScreen} />
    </Stack.Navigator>
  );
};
