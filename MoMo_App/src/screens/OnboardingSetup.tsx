import type { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { NeonGradientCard } from '@/components/ui/neon-gradient-card';
import { TextAnimate } from '@/components/ui/text-animate';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';
import { RainbowButton } from '@/components/ui/rainbow-button';

type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingPermissions: undefined;
  OnboardingSetup: undefined;
  MainApp: undefined;
};

type Props = {
  navigation: StackNavigationProp<OnboardingStackParamList, 'OnboardingSetup'>;
  route: RouteProp<OnboardingStackParamList, 'OnboardingSetup'>;
};


export default function OnboardingSetup({ navigation }: Props) {
  const handleGoToHome = async () => {
    await AsyncStorage.setItem('onboardingComplete', 'true');
    navigation.replace('MainApp');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <NeonGradientCard className="w-full max-w-md p-8 flex flex-col items-center gap-8 shadow-2xl">
        <TextAnimate animation="blurInUp" by="character" as="h1" className="text-2xl font-bold text-center text-blue-600 mb-2">
          Setup Complete
        </TextAnimate>
        <AnimatedShinyText className="text-lg font-medium text-center mb-4">
          You’re ready to start using the MoMo Merchant App!
        </AnimatedShinyText>
        <RainbowButton
          className="w-full py-3 text-lg font-semibold mt-2"
          onClick={handleGoToHome}
        >
          Go to Home
        </RainbowButton>
      </NeonGradientCard>
    </div>
  );
}
