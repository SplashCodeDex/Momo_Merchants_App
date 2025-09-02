import type { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

import { MagicCard } from '@/components/ui/magic-card';
import { TextAnimate } from '@/components/ui/text-animate';
import { AuroraText } from '@/components/ui/aurora-text';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { ShimmerButton } from '@/components/ui/shimmer-button';
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
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <MagicCard className="w-full max-w-md p-8 flex flex-col items-center gap-8 shadow-xl">
        <TextAnimate animation="blurInUp" by="character" as="h1" className="text-3xl font-bold text-center text-blue-600 mb-2">
          Welcome!
        </TextAnimate>
        <AuroraText className="text-lg font-medium text-center mb-4">
          Let’s get you set up for success with MoMo Merchant App.
        </AuroraText>
        <RainbowButton
          className="w-full py-3 text-lg font-semibold mt-2"
          onClick={() => navigation.navigate('OnboardingPermissions')}
        >
          Get Started
        </RainbowButton>
        <ShimmerButton
          className="w-full mt-4 text-base font-medium"
          onClick={() => navigation.replace('MainApp')}
        >
          Skip
        </ShimmerButton>
      </MagicCard>
    </div>
  );
}
