import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import MainNavigator from './src/navigation/MainNavigator';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { updateBusLocationBackground } from './src/services/routeService';

export const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      await updateBusLocationBackground(locations[0]);
    }
  }
});

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" backgroundColor="#F0F4FF" />
          <MainNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
