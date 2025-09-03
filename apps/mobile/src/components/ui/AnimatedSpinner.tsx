import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { colors, semanticColors } from '../../theme/colors';

interface AnimatedSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: any;
  variant?: 'pulse' | 'rotate' | 'bounce' | 'wave';
}

const AnimatedSpinner: React.FC<AnimatedSpinnerProps> = ({
  size = 'medium',
  color = semanticColors.primary,
  style,
  variant = 'rotate',
}) => {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const getSize = () => {
    switch (size) {
      case 'small':
        return 20;
      case 'large':
        return 48;
      default: // medium
        return 32;
    }
  };

  const spinnerSize = getSize();

  const animatedStyle = useAnimatedStyle(() => {
    switch (variant) {
      case 'rotate':
        return {
          transform: [{ rotate: `${rotation.value}deg` }],
        };
      case 'pulse':
        return {
          transform: [{ scale: scale.value }],
          opacity: opacity.value,
        };
      case 'bounce':
        return {
          transform: [{ scale: scale.value }],
        };
      case 'wave':
        return {
          opacity: opacity.value,
        };
      default:
        return {
          transform: [{ rotate: `${rotation.value}deg` }],
        };
    }
  });

  useEffect(() => {
    switch (variant) {
      case 'rotate':
        rotation.value = withRepeat(
          withTiming(360, {
            duration: 1000,
            easing: Easing.linear,
          }),
          -1,
          false
        );
        break;

      case 'pulse':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.2, { duration: 500 }),
            withTiming(1, { duration: 500 })
          ),
          -1,
          false
        );
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.7, { duration: 500 }),
            withTiming(1, { duration: 500 })
          ),
          -1,
          false
        );
        break;

      case 'bounce':
        scale.value = withRepeat(
          withSequence(
            withTiming(1.3, { duration: 300, easing: Easing.elastic(1.2) }),
            withTiming(1, { duration: 300, easing: Easing.elastic(1.2) })
          ),
          -1,
          false
        );
        break;

      case 'wave':
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.3, { duration: 400 }),
            withTiming(1, { duration: 400 }),
            withTiming(0.3, { duration: 400 }),
            withTiming(1, { duration: 400 })
          ),
          -1,
          false
        );
        break;
    }
  }, [variant]);

  const renderSpinner = () => {
    switch (variant) {
      case 'rotate':
        return (
          <View style={[styles.spinnerRing, { width: spinnerSize, height: spinnerSize }]}>
            <Animated.View
              style={[
                styles.spinnerArc,
                {
                  width: spinnerSize,
                  height: spinnerSize,
                  borderColor: color,
                  borderTopColor: 'transparent',
                },
                animatedStyle,
              ]}
            />
          </View>
        );

      case 'pulse':
      case 'bounce':
        return (
          <Animated.View
            style={[
              styles.dot,
              {
                width: spinnerSize * 0.3,
                height: spinnerSize * 0.3,
                backgroundColor: color,
                borderRadius: (spinnerSize * 0.3) / 2,
              },
              animatedStyle,
            ]}
          />
        );

      case 'wave':
        return (
          <View style={styles.waveContainer}>
            {[0, 1, 2, 3].map((index) => (
              <WaveBar
                key={index}
                index={index}
                size={spinnerSize}
                color={color}
              />
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { width: spinnerSize, height: spinnerSize }, style]}>
      {renderSpinner()}
    </View>
  );
};

// Wave bar component for wave variant
interface WaveBarProps {
  index: number;
  size: number;
  color: string;
}

const WaveBar: React.FC<WaveBarProps> = ({ index, size, color }) => {
  const height = useSharedValue(4);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  useEffect(() => {
    const delay = index * 100; // Stagger the animation

    setTimeout(() => {
      height.value = withRepeat(
        withSequence(
          withTiming(size * 0.8, { duration: 300 }),
          withTiming(4, { duration: 300 }),
          withTiming(size * 0.6, { duration: 300 }),
          withTiming(4, { duration: 300 })
        ),
        -1,
        false
      );
    }, delay);
  }, [index, size]);

  return (
    <Animated.View
      style={[
        styles.waveBar,
        {
          width: size * 0.08,
          backgroundColor: color,
          marginHorizontal: size * 0.02,
        },
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerArc: {
    borderWidth: 3,
    borderRadius: 50,
  },
  dot: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  waveBar: {
    borderRadius: 2,
  },
});

export default AnimatedSpinner;