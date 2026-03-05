/**
 * Main Navigator - Bottom tabs for main app sections
 * Lobby, Leaderboard, Profile, Settings
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LobbyScreen } from '../screens/lobby/LobbyScreen';
import { LeaderboardScreen } from '../screens/lobby/LeaderboardScreen';
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';

export type MainStackParamList = {
  Lobby: undefined;
  Leaderboard: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainStackParamList>();

// Simple icon components (replace with proper icons later)
const TabBarIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.icon, { color: focused ? '#6C63FF' : '#888' }]}>
        {name === 'Lobby' ? '🎮' :
         name === 'Leaderboard' ? '🏆' :
         name === 'Profile' ? '👤' :
         name === 'Settings' ? '⚙️' : '📱'}
      </Text>
    </View>
  );
};

export const MainNavigator = () => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabBarIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#6C63FF',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="Lobby"
        component={LobbyScreen}
        options={{ tabBarLabel: t('nav.lobby') }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ tabBarLabel: t('nav.leaderboard') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: t('nav.profile') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: t('nav.settings') }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1a1a2e',
    borderTopColor: '#2a2a4e',
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
  },
});
