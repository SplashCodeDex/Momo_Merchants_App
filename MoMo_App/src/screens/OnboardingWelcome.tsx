import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      <AnimatedCard
        title=""
        content=""
        gradient="blue-purple"
        onPress={() => {}}
      >
        <View style={styles.cardContent}>
          <AnimatedText
            animation="slideUp"
            delay={200}
            style={styles.title}
          >
            Welcome!
          </AnimatedText>

          <AuroraText size="lg" style={styles.subtitle}>
            Let's get you set up for success with MoMo Merchant App.
          </AuroraText>

          <View style={styles.buttonContainer}>
            <RainbowButton
              size="lg"
              onPress={() => navigation.navigate('OnboardingPermissions')}
            >
              Get Started
            </RainbowButton>

            <ShimmerButton
              size="md"
              variant="secondary"
              onPress={() => navigation.replace('MainApp')}
            >
              Skip
            </ShimmerButton>
          </View>
        </View>
      </AnimatedCard>
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
  cardContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffffff',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
});
