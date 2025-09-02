import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AnimatedCardProps {
  title: string;
  content: string;
  gradient?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  title,
  content,
  gradient = 'blue-purple',
  onPress,
  children
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Fade in and slide up animation
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getGradientColors = () => {
    switch (gradient) {
      case 'blue-purple':
        return ['#667eea', '#764ba2'];
      case 'orange-pink':
        return ['#ff9a9e', '#fecfef'];
      case 'green-blue':
        return ['#a8edea', '#fed6e3'];
      default:
        return ['#667eea', '#764ba2'];
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: translateYAnim }
          ]
        }
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.touchable}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{content}</Text>
            {children}
          </View>

          {/* Shimmer effect overlay */}
          <View style={styles.shimmerOverlay} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  touchable: {
    borderRadius: 16,
  },
  gradient: {
    padding: 20,
    minHeight: 120,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.3,
  },
});