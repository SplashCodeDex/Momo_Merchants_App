import React, { useEffect, useRef } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';

interface AnimatedTextProps {
  children: string;
  animation?: 'fadeIn' | 'slideUp' | 'bounce' | 'scale';
  delay?: number;
  duration?: number;
  style?: any;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  children,
  animation = 'fadeIn',
  delay = 0,
  duration = 600,
  style
}) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const animations = [];

    // Always include fade in
    animations.push(
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      })
    );

    // Add animation-specific effects
    switch (animation) {
      case 'slideUp':
        translateYAnim.setValue(20);
        animations.push(
          Animated.timing(translateYAnim, {
            toValue: 0,
            duration,
            delay,
            useNativeDriver: true,
          })
        );
        break;
      case 'bounce':
        translateYAnim.setValue(20);
        scaleAnim.setValue(0.8);
        animations.push(
          Animated.parallel([
            Animated.spring(translateYAnim, {
              toValue: 0,
              delay,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              delay,
              useNativeDriver: true,
            })
          ])
        );
        break;
      case 'scale':
        scaleAnim.setValue(0.8);
        animations.push(
          Animated.spring(scaleAnim, {
            toValue: 1,
            delay,
            useNativeDriver: true,
          })
        );
        break;
      default: // fadeIn
        break;
    }

    Animated.parallel(animations).start();
  }, [animation, delay, duration]);

  const getTransform = () => {
    const transforms = [];

    if (animation === 'slideUp' || animation === 'bounce') {
      transforms.push({ translateY: translateYAnim });
    }

    if (animation === 'bounce' || animation === 'scale') {
      transforms.push({ scale: scaleAnim });
    }

    return transforms;
  };

  return (
    <Animated.Text
      style={[
        styles.text,
        style,
        {
          opacity: opacityAnim,
          transform: getTransform(),
        }
      ]}
    >
      {children}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    color: '#374151',
  },
});