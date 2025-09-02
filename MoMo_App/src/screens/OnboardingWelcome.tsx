import { View, Text, Button, StyleSheet, TouchableOpacity } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingPermissions: undefined;
  OnboardingSetup: undefined;
  MainApp: undefined;
};

type Props = {
  navigation: StackNavigationProp<OnboardingStackParamList, 'OnboardingWelcome'>;
  route: RouteProp<OnboardingStackParamList, 'OnboardingWelcome'>;
};

export default function OnboardingWelcome({ navigation }: Props) {
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const done = await AsyncStorage.getItem('onboardingComplete');
        if (done === 'true') {
          navigation.replace('MainApp');
        }
      })();
    }, [navigation])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>Let’s get you set up for success with MoMo Merchant App.</Text>
      <Button
        title="Get Started"
        onPress={() => navigation.navigate('OnboardingPermissions')}
        color="#2563EB"
      />
      <TouchableOpacity onPress={() => navigation.replace('MainApp')} style={styles.skipBtn}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 32,
  },
  skipBtn: {
    marginTop: 24,
    padding: 8,
  },
  skipText: {
    color: '#6B7280',
    textDecorationLine: 'underline',
    fontSize: 14,
  },
});
