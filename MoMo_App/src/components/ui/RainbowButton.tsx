import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface RainbowButtonProps {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'success';
}

export const RainbowButton: React.FC<RainbowButtonProps> = ({
  children,
  onPress,
  disabled = false,
  size = 'md',
  variant = 'primary'
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const gradientAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous rainbow animation
    const animate = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(gradientAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(gradientAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          })
        ])
      ).start();
    };

    if (!disabled) {
      animate();
    }

    return () => {
      gradientAnim.stopAnimation();
    };
  }, [disabled]);

  const handlePressIn = () => {
    if (!disabled) {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 };
      case 'lg':
        return { paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 };
      default: // md
        return { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 14;
      case 'lg':
        return 18;
      default:
        return 16;
    }
  };

  const getGradientColors = () => {
    const baseColors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'
    ];

    if (disabled) {
      return ['#9ca3af', '#9ca3af'];
    }

    switch (variant) {
      case 'success':
        return ['#10b981', '#34d399'];
      case 'secondary':
        return ['#6b7280', '#9ca3af'];
      default: // primary - rainbow
        return baseColors;
    }
  };

  const animatedColors = gradientAnim.interpolate({
    inputRange: [0, 1],
    outputRange: getGradientColors()
  });

  return (
    <Animated.View
      style={[
        styles.container,
        getSizeStyles(),
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}
        style={styles.touchable}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Text style={[styles.text, { fontSize: getTextSize() }]}>
            {children}
          </Text>

          {/* Animated shine effect */}
          {!disabled && (
            <Animated.View
              style={[
                styles.shine,
                {
                  transform: [{
                    translateX: gradientAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, 100]
                    })
                  }]
                }
              ]}
            />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  touchable: {
    borderRadius: 8,
  },
  gradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  text: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
});