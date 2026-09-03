import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { fonts } from '@/src/theme';

export function LiveBadge({ scale = 1 }: { scale?: number }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    cancelAnimation(opacity);
    opacity.value = 1;
    if (reduceMotion) return;

    opacity.value = withRepeat(
      withTiming(.45, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityLabel="Match en direct"
      accessible
      style={[
        styles.badge,
        { minHeight: 27 * scale, minWidth: 58 * scale, paddingHorizontal: 10 * scale },
        animatedStyle,
      ]}
      testID="match-live-badge"
    >
      <LinearGradient
        colors={['#F52B39', '#D00920', '#990A17']}
        end={{ x: .5, y: 1 }}
        start={{ x: .5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.highlight} />
      <Text style={[styles.text, { fontSize: 13 * scale, lineHeight: 16 * scale }]}>LIVE</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FF5963',
    backgroundColor: '#D00920',
    boxShadow: '0 4px 14px rgba(212,9,32,.34)',
  },
  highlight: {
    position: 'absolute',
    top: 1,
    left: '20%',
    right: '20%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,.35)',
  },
  text: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontStyle: 'italic',
    letterSpacing: .3,
    textShadowColor: 'rgba(70,0,8,.72)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
