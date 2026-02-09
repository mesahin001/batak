/**
 * Game Navigator - Stack for game-related screens
 * GameRoom, Results, Summary screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GameRoomScreen } from '../screens/game/GameRoomScreen';
import { GameResultScreen } from '../screens/results/GameResultScreen';
import { TournamentResultScreen } from '../screens/results/TournamentResultScreen';

export type GameStackParamList = {
  GameRoom: {
    roomId: string;
  };
  GameResult: {
    roomId: string;
  };
  TournamentResult: {
    tournamentId: string;
  };
};

const Stack = createNativeStackNavigator<GameStackParamList>();

export const GameNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="GameRoom" component={GameRoomScreen} />
      <Stack.Screen name="GameResult" component={GameResultScreen} />
      <Stack.Screen name="TournamentResult" component={TournamentResultScreen} />
    </Stack.Navigator>
  );
};
