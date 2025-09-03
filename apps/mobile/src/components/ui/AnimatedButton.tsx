import React, { useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { colors, semanticColors } from '../../theme/colors';

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  rippleEffect?: boolean;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  icon,
  rippleEffect = true,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const getVariantStyles = () => {
    const baseStyles = {
      backgroundColor: semanticColors.primary,
      borderColor: semanticColors.primary,
    };

    switch (variant) {
      case 'secondary':
        return {
          ...baseStyles,
          backgroundColor: semanticColors.secondary,
          borderColor: semanticColors.secondary,
        };
      case 'success':
        return {
          ...baseStyles,
          backgroundColor: semanticColors.success,
          borderColor: semanticColors.success,
        };
      case 'warning':
        return {
          ...baseStyles,
          backgroundColor: semanticColors.warning,
          borderColor: semanticColors.warning,
        };
      case 'error':
        return {
          ...baseStyles,
          backgroundColor: semanticColors.error,
          borderColor: semanticColors.error,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: semanticColors.primary,
          borderWidth: 2,
        };
      default:
        return baseStyles;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 16,
          paddingVertical: 8,
          minHeight: 36,
        };
      case 'large':
        return {
          paddingHorizontal: 32,
          paddingVertical: 16,
          minHeight: 56,
        };
      default: // medium
        return {
          paddingHorizontal: 24,
          paddingVertical: 12,
          minHeight: 44,
        };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 14;
      case 'large':
        return 18;
      default:
        return 16;
    }
  };

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;

    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });

    if (rippleEffect) {
      rippleScale.value = withTiming(1, { duration: 200 });
      rippleOpacity.value = withTiming(0.3, { duration: 200 });
    }
  }, [disabled, loading, rippleEffect]);

  const handlePressOut = useCallback(() => {
    if (disabled || loading) return;

    scale.value = withSpring(1, { damping: 15, stiffness: 300 });

    if (rippleEffect) {
      rippleOpacity.value = withTiming(0, { duration: 300 });
      rippleScale.value = withTiming(0, { duration: 300 });
    }
  }, [disabled, loading, rippleEffect]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;

    // Add a subtle bounce effect
    scale.value = withSpring(1.05, { damping: 10, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    });

    // Call the onPress callback
    runOnJS(onPress)();
  }, [disabled, loading, onPress]);

  const buttonStyles = [
    styles.button,
    getVariantStyles(),
    getSizeStyles(),
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    {
      fontSize: getTextSize(),
      color: variant === 'outline' ? semanticColors.primary : colors.text.inverse,
    },
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      <Animated.View style={[styles.buttonContent, animatedStyle]}>
        {icon && <Animated.View style={styles.icon}>{icon}</Animated.View>}
        <Text style={textStyles}>
          {loading ? 'Loading...' : title}
        </Text>
      </Animated.View>

      {rippleEffect && (
        <Animated.View
          style={[styles.ripple, rippleStyle]}
          pointerEvents="none"
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  disabledText: {
    color: colors.text.muted,
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  icon: {
    marginRight: 8,
  },
  ripple: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.text.inverse,
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },
});

export default AnimatedButton;