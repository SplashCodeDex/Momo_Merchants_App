import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { AnimatedCard, AnimatedText, AuroraText, RainbowButton, ShimmerButton } from './ui';

export const AnimatedComponentsDemo: React.FC = () => {
  const [counter, setCounter] = useState(0);

  const handleRainbowPress = () => {
    setCounter(prev => prev + 1);
  };

  const handleShimmerPress = () => {
    setCounter(prev => prev - 1);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <AnimatedText
          animation="fadeIn"
          delay={0}
          style={styles.headerTitle}
        >
          🎨 Magic UI Components Demo
        </AnimatedText>
        <AuroraText size="md" style={styles.headerSubtitle}>
          Beautiful animated components for React Native
        </AuroraText>
      </View>

      {/* Animated Cards Section */}
      <View style={styles.section}>
        <AnimatedText
          animation="slideUp"
          delay={200}
          style={styles.sectionTitle}
        >
          ✨ Animated Cards
        </AnimatedText>

        <AnimatedCard
          title="Welcome Card"
          content="This card has a beautiful gradient background with smooth animations."
          gradient="blue-purple"
          onPress={() => console.log('Card pressed!')}
        />

        <AnimatedCard
          title="Success Card"
          content="Perfect for displaying important information with visual appeal."
          gradient="green-blue"
          onPress={() => console.log('Success card pressed!')}
        />
      </View>

      {/* Animated Text Section */}
      <View style={styles.section}>
        <AnimatedText
          animation="bounce"
          delay={400}
          style={styles.sectionTitle}
        >
          📝 Animated Text
        </AnimatedText>

        <View style={styles.textDemo}>
          <AnimatedText animation="fadeIn" delay={600} style={styles.demoText}>
            Fade In Animation
          </AnimatedText>

          <AnimatedText animation="slideUp" delay={800} style={styles.demoText}>
            Slide Up Animation
          </AnimatedText>

          <AnimatedText animation="scale" delay={1000} style={styles.demoText}>
            Scale Animation
          </AnimatedText>

          <AuroraText size="lg" style={styles.auroraDemo}>
            🌈 Aurora Text - Color Shifting Magic!
          </AuroraText>
        </View>
      </View>

      {/* Buttons Section */}
      <View style={styles.section}>
        <AnimatedText
          animation="slideUp"
          delay={1200}
          style={styles.sectionTitle}
        >
          🎯 Interactive Buttons
        </AnimatedText>

        <View style={styles.buttonContainer}>
          <RainbowButton
            size="lg"
            onPress={handleRainbowPress}
          >
            🌈 Rainbow Button (Count: {counter})
          </RainbowButton>

          <ShimmerButton
            size="md"
            variant="secondary"
            onPress={handleShimmerPress}
          >
            ✨ Shimmer Button
          </ShimmerButton>

          <RainbowButton
            size="sm"
            variant="success"
            onPress={() => console.log('Success!')}
          >
            ✅ Success Button
          </RainbowButton>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <AnimatedText
          animation="fadeIn"
          delay={1400}
          style={styles.sectionTitle}
        >
          🚀 Features
        </AnimatedText>

        <View style={styles.featuresList}>
          <Text style={styles.featureItem}>• Smooth React Native animations</Text>
          <Text style={styles.featureItem}>• Gradient backgrounds with LinearGradient</Text>
          <Text style={styles.featureItem}>• Touch feedback and press animations</Text>
          <Text style={styles.featureItem}>• Customizable colors and sizes</Text>
          <Text style={styles.featureItem}>• TypeScript support</Text>
          <Text style={styles.featureItem}>• Performance optimized</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  textDemo: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    gap: 12,
  },
  demoText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
  },
  auroraDemo: {
    textAlign: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    gap: 16,
  },
  featuresList: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    gap: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
});