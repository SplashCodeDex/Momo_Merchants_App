import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Text, Card } from '@react-native-blossom-ui/components';
import { AnimatedCard, AnimatedText, AuroraText, RainbowButton, ShimmerButton } from '../components/ui';
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
      <Card style={styles.card}>
        <Text typography="h1" style={styles.title}>
          Welcome!
        </Text>

        <Text typography="b1" style={styles.subtitle}>
          Let's get you set up for success with MoMo Merchant App.
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            title="Get Started"
            mode="filled"
            size="large"
            onPress={() => navigation.navigate('OnboardingPermissions')}
          />

          <Button
            title="Skip"
            mode="outlined"
            size="medium"
            onPress={() => navigation.replace('MainApp')}
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#1f2937',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    color: '#6b7280',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
});
