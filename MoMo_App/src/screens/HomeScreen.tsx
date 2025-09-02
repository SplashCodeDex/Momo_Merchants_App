import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to MoMo Merchant App</Text>
      <Text style={styles.subtitle}>Your gateway to seamless mobile money operations.</Text>
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
  },
});
  );
}
