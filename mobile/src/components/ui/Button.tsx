import { forwardRef, type ReactNode } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors, layout, radius, spacing, typography } from '@/src/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'compact' | 'default';

type ButtonProps = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  label: string;
  leading?: ReactNode;
  loading?: boolean;
  onPress: () => void;
  size?: ButtonSize;
  testID?: string;
  trailing?: ReactNode;
  variant?: ButtonVariant;
};

export const Button = forwardRef<View, ButtonProps>(function Button({
  accessibilityHint,
  accessibilityLabel,
  disabled = false,
  fullWidth = false,
  label,
  leading,
  loading = false,
  onPress,
  size = 'default',
  testID,
  trailing,
  variant = 'primary',
}, ref) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const unavailable = disabled || loading;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    if (reduceMotion || unavailable) return;
    scale.value = withTiming(0.985, {
      duration: 90,
      easing: Easing.out(Easing.quad),
    });
  }

  function handlePressOut() {
    if (reduceMotion || unavailable) return;
    scale.value = withTiming(1, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });
  }

  return (
    <Animated.View style={[styles.wrapper, fullWidth && styles.fullWidth, animatedStyle]}>
      <Pressable
        accessibilityHint={accessibilityHint}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        accessibilityState={{ busy: loading, disabled: unavailable }}
        aria-busy={loading}
        aria-disabled={unavailable}
        disabled={unavailable}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        ref={ref}
        style={({ pressed }) => [
          styles.base,
          size === 'compact' ? styles.compact : styles.default,
          variantStyles[variant].container,
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          pressed && !unavailable && styles.pressed,
        ]}
        testID={testID}
      >
        <View style={[styles.content, loading && styles.loadingContent]}>
          {leading ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{leading}</View> : null}
          <Text
            numberOfLines={2}
            style={[styles.label, variantStyles[variant].label, disabled && styles.labelDisabled]}
          >
            {label}
          </Text>
          {trailing ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{trailing}</View> : null}
        </View>
        {loading ? (
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.loader}>
            <ActivityIndicator color={disabled ? colors.textDisabled : variantStyles[variant].spinner} size="small" />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  base: {
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  compact: {
    minHeight: layout.compactControlHeight,
  },
  default: {
    minHeight: layout.controlHeight,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingContent: {
    opacity: 0,
  },
  label: {
    ...typography.control,
    flexShrink: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  loader: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.borderSubtle,
  },
  pressed: {
    opacity: 0.82,
  },
  primary: {
    backgroundColor: colors.volt,
    borderColor: colors.volt,
  },
  secondary: {
    backgroundColor: colors.surfaceInteractive,
    borderColor: colors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  destructive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  labelOnAccent: {
    color: colors.background,
  },
  labelOnSurface: {
    color: colors.text,
  },
  labelDisabled: {
    color: colors.textDisabled,
  },
});

const variantStyles: Record<ButtonVariant, { container: ViewStyle; label: TextStyle; spinner: string }> = {
  primary: { container: styles.primary, label: styles.labelOnAccent, spinner: colors.background },
  secondary: { container: styles.secondary, label: styles.labelOnSurface, spinner: colors.text },
  ghost: { container: styles.ghost, label: styles.labelOnSurface, spinner: colors.text },
  destructive: { container: styles.destructive, label: styles.labelOnAccent, spinner: colors.background },
};
