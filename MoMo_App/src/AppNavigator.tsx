import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import OnboardingWelcome from './screens/OnboardingWelcome';
import OnboardingPermissions from './screens/OnboardingPermissions';
import OnboardingSetup from './screens/OnboardingSetup';
import App from '../App';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="OnboardingWelcome" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcome} />
        <Stack.Screen name="OnboardingPermissions" component={OnboardingPermissions} />
        <Stack.Screen name="OnboardingSetup" component={OnboardingSetup} />
        <Stack.Screen name="MainApp" component={App} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
