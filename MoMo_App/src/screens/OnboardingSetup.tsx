import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function OnboardingSetup() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Setup Complete</Text>
      <Text style={styles.subtitle}>You’re ready to start using the MoMo Merchant App!</Text>
      <Button title="Go to Home" onPress={() => {}} color="#2563EB" />
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
