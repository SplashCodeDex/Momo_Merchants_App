import { View, Text, Button, StyleSheet } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useState } from 'react';
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
      <Text style={styles.title}>Permissions</Text>
      <Text style={styles.subtitle}>We’ll need a few permissions to get started (SMS, Notifications, etc.).</Text>
      <Button
        title={loading ? 'Requesting...' : 'Allow Permissions'}
        onPress={handleAllowPermissions}
        color="#2563EB"
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 32,
  },
});
