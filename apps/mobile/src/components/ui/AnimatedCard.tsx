import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: any;
  onAnimationComplete?: () => void;
  variant?: 'fadeIn' | 'slideUp' | 'scale' | 'bounce';
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  delay = 0,
  duration = 300,
  style,
  onAnimationComplete,
  variant = 'fadeIn',
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.9);

  const animatedStyle = useAnimatedStyle(() => {
    let transform: any[] = [];

    switch (variant) {
      case 'fadeIn':
        return {
          opacity: opacity.value,
        };
      case 'slideUp':
        transform = [{ translateY: translateY.value }];
        break;
      case 'scale':
        transform = [{ scale: scale.value }];
        break;
      case 'bounce':
        transform = [{ scale: scale.value }];
        break;
      default:
        return {
          opacity: opacity.value,
          transform: [{ translateY: translateY.value }],
        };
    }

    return {
      opacity: opacity.value,
      transform,
    };
  });

  useEffect(() => {
    const startAnimation = () => {
      opacity.value = withTiming(1, {
        duration,
        easing: Easing.out(Easing.ease),
      });

      switch (variant) {
        case 'slideUp':
          translateY.value = withTiming(0, {
            duration,
            easing: Easing.out(Easing.cubic),
          });
          break;
        case 'scale':
          scale.value = withSpring(1, {
            damping: 15,
            stiffness: 120,
          });
          break;
        case 'bounce':
          scale.value = withSpring(1, {
            damping: 8,
            stiffness: 200,
            mass: 1,
          });
          break;
      }

      if (onAnimationComplete) {
        setTimeout(() => {
          runOnJS(onAnimationComplete)();
        }, duration + delay);
      }
    };

    if (delay > 0) {
      setTimeout(startAnimation, delay);
    } else {
      startAnimation();
    }
  }, [delay, duration, variant, onAnimationComplete]);

  return (
    <Animated.View style={[styles.card, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow.xl,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
});

export default AnimatedCard;