import type { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { MagicCard } from '@/components/ui/magic-card';
import { TextAnimate } from '@/components/ui/text-animate';
import { AuroraText } from '@/components/ui/aurora-text';
import { RainbowButton } from '@/components/ui/rainbow-button';

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
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
      <MagicCard className="w-full max-w-md p-8 flex flex-col items-center gap-8 shadow-xl">
        <TextAnimate animation="blurInUp" by="character" as="h1" className="text-2xl font-bold text-center text-blue-600 mb-2">
          Permissions
        </TextAnimate>
        <AuroraText className="text-lg font-medium text-center mb-4">
          We’ll need a few permissions to get started (SMS, Notifications, etc.).
        </AuroraText>
        <RainbowButton
          className="w-full py-3 text-lg font-semibold mt-2"
          onClick={handleAllowPermissions}
          disabled={loading}
        >
          {loading ? 'Requesting...' : 'Allow Permissions'}
        </RainbowButton>
      </MagicCard>
    </div>
  );
}
