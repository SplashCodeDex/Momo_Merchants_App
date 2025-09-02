import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function OnboardingPermissions() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Permissions</Text>
      <Text style={styles.subtitle}>We’ll need a few permissions to get started (SMS, Notifications, etc.).</Text>
      <Button title="Allow Permissions" onPress={() => {}} color="#2563EB" />
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
