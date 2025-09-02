import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button, Card } from '@react-native-blossom-ui/components';
import type { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingPermissions: undefined;
  OnboardingSetup: undefined;
  MainApp: undefined;
};

type Props = {
  navigation: StackNavigationProp<OnboardingStackParamList, 'OnboardingPermissions'>;
  route: RouteProp<OnboardingStackParamList, 'OnboardingPermissions'>;
};


export default function OnboardingPermissions({ navigation }: Props) {
  const [loading, setLoading] = useState(false);

  const handleAllowPermissions = async () => {
    setLoading(true);
    // TODO: Implement real permission requests (SMS, notifications, etc.)
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Mock async
    setLoading(false);
    navigation.navigate('OnboardingSetup');
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Permissions</Text>
        <Text style={styles.subtitle}>
          We'll need a few permissions to get started (SMS, Notifications, etc.).
        </Text>
        <Button
          isLoading={loading}
          onPress={handleAllowPermissions}
          style={{ marginTop: 16 }}
        >
          Allow Permissions
        </Button>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2563eb',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#374151',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
