import { View, Text, Button, StyleSheet } from 'react-native';
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
  navigation: StackNavigationProp<OnboardingStackParamList, 'OnboardingSetup'>;
  route: RouteProp<OnboardingStackParamList, 'OnboardingSetup'>;
};

export default function OnboardingSetup({ navigation }: Props) {
  const handleGoToHome = async () => {
    await AsyncStorage.setItem('onboardingComplete', 'true');
    navigation.replace('MainApp');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Setup Complete</Text>
      <Text style={styles.subtitle}>You’re ready to start using the MoMo Merchant App!</Text>
      <Button
        title="Go to Home"
        onPress={handleGoToHome}
        color="#2563EB"
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
