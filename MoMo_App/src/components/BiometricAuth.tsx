import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export default function BiometricAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const authenticate = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometric authentication not available', 'Please set up biometrics on your device.');
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access KudiCopilot',
        fallbackLabel: 'Use PIN',
      });

      if (result.success) {
        setIsAuthenticated(true);
        Alert.alert('Success', 'Authenticated successfully!');
      } else {
        Alert.alert('Authentication failed', result.error || 'Unknown error');
      }
    } catch (error) {
      Alert.alert('Error', 'Authentication error');
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black p-4">
      <Text className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        Biometric Authentication
      </Text>
      <TouchableOpacity
        onPress={authenticate}
        className="px-6 py-3 bg-blue-500 rounded-lg"
      >
        <Text className="text-white font-semibold">Authenticate</Text>
      </TouchableOpacity>
      {isAuthenticated && (
        <Text className="text-green-600 mt-4">Authenticated!</Text>
      )}
    </View>
  );
}