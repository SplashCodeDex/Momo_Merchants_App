import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import * as LocalAuthentication from 'expo-local-authentication';
import { RootState } from '../store';
import {
  setBiometricStatus,
  authenticate,
  failAuthentication,
  resetFailedAttempts,
  logout,
  checkLockout,
} from '../store/slices/authSlice';

export default function BiometricAuth() {
  const dispatch = useDispatch();
  const {
    isAuthenticated,
    isBiometricAvailable,
    isBiometricEnrolled,
    failedAttempts,
    isLocked,
    lockoutUntil,
    lastAuthTime,
  } = useSelector((state: RootState) => state.auth);

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [pinFallback, setPinFallback] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(checkLockout());
    }, 1000);
    return () => clearInterval(interval);
  }, [dispatch]);

  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      dispatch(setBiometricStatus({ available: hasHardware, enrolled: isEnrolled }));

      console.log('Biometric support:', {
        hasHardware,
        isEnrolled,
        supportedTypes,
      });
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      Alert.alert('Error', 'Failed to check biometric availability');
    }
  };

  const handleBiometricAuth = async () => {
    if (isLocked) {
      const remainingTime = lockoutUntil ? Math.ceil((lockoutUntil - Date.now()) / 1000 / 60) : 0;
      Alert.alert(
        'Account Locked',
        `Too many failed attempts. Try again in ${remainingTime} minutes.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsAuthenticating(true);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access KudiCopilot',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        dispatch(authenticate());
        dispatch(resetFailedAttempts());
        Alert.alert('Success', 'Authenticated successfully!');
      } else {
        handleAuthFailure(result.error);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      handleAuthFailure('unknown');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAuthFailure = (error?: string) => {
    dispatch(failAuthentication());

    let message = 'Authentication failed';
    switch (error) {
      case 'user_cancel':
        message = 'Authentication cancelled by user';
        break;
      case 'system_cancel':
        message = 'Authentication cancelled by system';
        break;
      case 'timeout':
        message = 'Authentication timed out';
        break;
      case 'lockout':
        message = 'Biometric authentication locked out';
        break;
      case 'not_enrolled':
        message = 'No biometrics enrolled on device';
        break;
      default:
        message = 'Authentication failed. Please try again.';
    }

    Alert.alert('Authentication Failed', message, [
      { text: 'Try Again', onPress: handleBiometricAuth },
      { text: 'Use PIN', onPress: () => setShowPinInput(true) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePinAuth = () => {
    // Simple PIN fallback - in production, use secure PIN storage
    const correctPin = '1234'; // This should be securely stored

    if (pinFallback === correctPin) {
      dispatch(authenticate());
      dispatch(resetFailedAttempts());
      setShowPinInput(false);
      setPinFallback('');
      Alert.alert('Success', 'Authenticated with PIN!');
    } else {
      dispatch(failAuthentication());
      Alert.alert('Invalid PIN', 'Please try again');
      setPinFallback('');
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    Alert.alert('Logged Out', 'You have been logged out successfully');
  };

  const getBiometricTypeText = () => {
    if (!isBiometricAvailable) return 'Not Available';
    if (!isBiometricEnrolled) return 'Not Enrolled';
    return 'Available';
  };

  const getLockoutStatus = () => {
    if (!isLocked || !lockoutUntil) return null;
    const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 bg-white dark:bg-black p-4">
      <Text className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
        Biometric Authentication
      </Text>

      {/* Status Information */}
      <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4">
        <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Authentication Status
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Biometric: {getBiometricTypeText()}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Authenticated: {isAuthenticated ? 'Yes' : 'No'}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          Failed Attempts: {failedAttempts}/5
        </Text>
        {isLocked && (
          <Text className="text-sm text-red-600 dark:text-red-400">
            Locked for: {getLockoutStatus()}
          </Text>
        )}
        {lastAuthTime && (
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Last Auth: {new Date(lastAuthTime).toLocaleString()}
          </Text>
        )}
      </View>

      {/* Authentication Buttons */}
      <View className="mb-4">
        {!isAuthenticated ? (
          <TouchableOpacity
            onPress={handleBiometricAuth}
            disabled={isAuthenticating || isLocked}
            className={`px-6 py-3 rounded-lg mb-2 ${
              isAuthenticating || isLocked
                ? 'bg-gray-400'
                : 'bg-blue-500'
            }`}
          >
            <Text className="text-white font-semibold text-center">
              {isAuthenticating ? 'Authenticating...' : 'Authenticate with Biometrics'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleLogout}
            className="px-6 py-3 bg-red-500 rounded-lg mb-2"
          >
            <Text className="text-white font-semibold text-center">Logout</Text>
          </TouchableOpacity>
        )}

        {!isAuthenticated && (
          <TouchableOpacity
            onPress={() => setShowPinInput(!showPinInput)}
            className="px-6 py-3 bg-green-500 rounded-lg"
          >
            <Text className="text-white font-semibold text-center">
              {showPinInput ? 'Hide PIN Input' : 'Use PIN Instead'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* PIN Input */}
      {showPinInput && !isAuthenticated && (
        <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4">
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Enter PIN
          </Text>
          <TextInput
            className="p-2 border border-gray-300 rounded mb-2 text-black dark:text-white dark:bg-gray-700"
            placeholder="Enter PIN"
            value={pinFallback}
            onChangeText={setPinFallback}
            keyboardType="numeric"
            secureTextEntry
            placeholderTextColor="#666"
          />
          <TouchableOpacity
            onPress={handlePinAuth}
            className="px-4 py-2 bg-blue-500 rounded"
          >
            <Text className="text-white font-semibold text-center">Submit PIN</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Success Message */}
      {isAuthenticated && (
        <View className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
          <Text className="text-green-800 dark:text-green-200 text-center font-semibold">
            ✓ Authenticated Successfully!
          </Text>
          <Text className="text-green-700 dark:text-green-300 text-center text-sm mt-1">
            You now have access to all features
          </Text>
        </View>
      )}
    </View>
  );
}