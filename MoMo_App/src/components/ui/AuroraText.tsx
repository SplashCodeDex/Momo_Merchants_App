import React, { useEffect, useRef } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface AuroraTextProps {
  children: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  speed?: number;
  style?: any;
}

export const AuroraText: React.FC<AuroraTextProps> = ({
  children,
  size = 'md',
  speed = 3000,
  style
}) => {
  const colorAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Continuous color shifting animation
    const animateColors = () => {
      Animated.loop(
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: speed,
          useNativeDriver: false,
        })
      ).start();
    };

    animateColors();

    return () => {
      colorAnim.stopAnimation();
      opacityAnim.stopAnimation();
    };
  }, [speed]);

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 14;
      case 'lg':
        return 20;
      case 'xl':
        return 24;
      default: // md
        return 16;
    }
  };

  const getGradientColors = () => {
    const colors = [
      ['#ff6b6b', '#4ecdc4', '#45b7d1'], // Red to teal to blue
      ['#a8edea', '#fed6e3', '#d299c2'], // Light blue to pink to purple
      ['#ffecd2', '#fcb69f', '#ff9a9e'], // Cream to coral to pink
      ['#667eea', '#764ba2', '#f093fb'], // Blue to purple to pink
    ];

    const colorIndex = Math.floor(colorAnim._value * (colors.length - 1));
    const nextColorIndex = (colorIndex + 1) % colors.length;
    const progress = (colorAnim._value * (colors.length - 1)) % 1;

    // Interpolate between color sets
    const currentColors = colors[colorIndex];
    const nextColors = colors[nextColorIndex];

    return currentColors.map((color, index) => {
      // Simple color interpolation (in a real app, you'd use a proper color interpolation library)
      return progress > 0.5 ? nextColors[index] : color;
    });
  };

  return (
    <Animated.View style={{ opacity: opacityAnim }}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Text
          style={[
            styles.text,
            {
              fontSize: getFontSize(),
              backgroundColor: 'transparent',
            },
            style
          ]}
        >
          {children}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 4,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
    color: '#ffffff',
  },
});