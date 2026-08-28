import { useEffect, type PropsWithChildren } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, type RadiusToken } from '@/src/theme';

type SkeletonTone = 'base' | 'highlight' | 'subtle';

type SkeletonProps = Omit<ViewProps, 'children'> & {
  height?: ViewStyle['height'];
  radius?: RadiusToken;
  style?: StyleProp<ViewStyle>;
  tone?: SkeletonTone;
  width?: ViewStyle['width'];
};

type SkeletonGroupProps = PropsWithChildren<Omit<ViewProps, 'children' | 'style'> & {
  label?: string;
  reduceMotionOverride?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Skeleton({
  height,
  radius: radiusToken = 'md',
  style,
  tone = 'base',
  width,
  ...viewProps
}: SkeletonProps) {
  return (
    <View
      {...viewProps}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.block,
        toneStyles[tone],
        { borderRadius: radius[radiusToken] },
        height === undefined ? null : { height },
        width === undefined ? null : { width },
        style,
      ]}
    />
  );
}

export function SkeletonGroup({
  children,
  label,
  reduceMotionOverride,
  style,
  ...viewProps
}: SkeletonGroupProps) {
  const systemReduceMotion = useReducedMotion();
  const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
  const opacity = useSharedValue(reduceMotion ? 0.82 : 0.96);

  useEffect(() => {
    cancelAnimation(opacity);
    if (reduceMotion) {
      opacity.value = 0.82;
      return;
    }

    opacity.value = withRepeat(
      withTiming(0.58, {
        duration: 920,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );

    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const announcesProgress = Boolean(label);

  return (
    <Animated.View
      {...viewProps}
      accessibilityLabel={label}
      accessibilityLiveRegion={announcesProgress ? 'polite' : undefined}
      accessibilityRole={announcesProgress ? 'progressbar' : undefined}
      accessibilityState={announcesProgress ? { busy: true } : undefined}
      aria-busy={announcesProgress ? true : undefined}
      accessible={announcesProgress}
      style={[style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surfaceRaised,
  },
  base: {
    backgroundColor: colors.surfaceRaised,
  },
  highlight: {
    backgroundColor: colors.surfaceInteractive,
  },
  subtle: {
    backgroundColor: colors.borderSubtle,
  },
});

const toneStyles: Record<SkeletonTone, object> = {
  base: styles.base,
  highlight: styles.highlight,
  subtle: styles.subtle,
};
