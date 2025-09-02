import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function OnboardingWelcome() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>Let’s get you set up for success with MoMo Merchant App.</Text>
      <Button title="Get Started" onPress={() => {}} color="#2563EB" />
    </View>

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
});
  );
}
