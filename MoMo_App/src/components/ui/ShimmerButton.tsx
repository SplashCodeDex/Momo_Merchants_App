import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ShimmerButtonProps {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline';
}

export const ShimmerButton: React.FC<ShimmerButtonProps> = ({
  children,
  onPress,
  disabled = false,
  size = 'md',
  variant = 'primary'
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (!disabled) {
      // Continuous shimmer animation
      const animateShimmer = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(shimmerAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(shimmerAnim, {
              toValue: -1,
              duration: 1500,
              useNativeDriver: true,
            })
          ])
        ).start();
      };

      animateShimmer();
    }

    return () => {
      shimmerAnim.stopAnimation();
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

  const getButtonStyles = () => {
    if (disabled) {
      return {
        backgroundColor: '#9ca3af',
        borderWidth: 0,
      };
    }

    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: '#6b7280',
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: '#3b82f6',
        };
      default: // primary
        return {
          backgroundColor: '#3b82f6',
          borderWidth: 0,
        };
    }
  };

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-200, 200]
  });

  return (
    <Animated.View
      style={[
        styles.container,
        getSizeStyles(),
        getButtonStyles(),
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
        <View style={styles.content}>
          <Text style={[
            styles.text,
            { fontSize: getTextSize() },
            variant === 'outline' && !disabled && { color: '#3b82f6' }
          ]}>
            {children}
          </Text>

          {/* Shimmer effect */}
          {!disabled && variant !== 'outline' && (
            <Animated.View
              style={[
                styles.shimmer,
                {
                  transform: [{ translateX: shimmerTranslateX }]
                }
              ]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          )}
        </View>
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
  content: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shimmerGradient: {
    width: 60,
    height: '100%',
    opacity: 0.8,
  },
});