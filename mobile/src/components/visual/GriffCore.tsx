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

import { GriffMark } from '@/src/components/brand/GriffLogo';
import { colors, fonts } from '@/src/theme';

type GriffCoreProps = {
  size?: number;
  compact?: boolean;
  label?: string;
  styleKey?: string | null;
  accent?: string | null;
};

export default function GriffCore({
  size = 244,
  compact = false,
  label = 'CORE // ACTIF',
  styleKey,
  accent,
}: GriffCoreProps) {
  const reduceMotion = useReducedMotion();
  const palette = corePalette(styleKey, accent);
  const orbit = useSharedValue(0);
  const float = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      orbit.value = 0.08;
      float.value = 0;
      pulse.value = 0.3;
      return;
    }

    orbit.value = withRepeat(withTiming(1, { duration: 13_000, easing: Easing.linear }), -1, false);
    float.value = withRepeat(withTiming(1, { duration: 2_600, easing: Easing.inOut(Easing.quad) }), -1, true);
    pulse.value = withRepeat(withTiming(1, { duration: 1_900, easing: Easing.inOut(Easing.sin) }), -1, true);

    return () => {
      cancelAnimation(orbit);
      cancelAnimation(float);
      cancelAnimation(pulse);
    };
  }, [float, orbit, pulse, reduceMotion]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit.value * 360}deg` }],
  }));
  const reverseOrbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit.value * -240}deg` }],
  }));
  const coreStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: float.value * -7 },
      { scale: 1 + pulse.value * 0.018 },
      { rotate: `${-7 + float.value * 14}deg` },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.24 + pulse.value * 0.2,
    transform: [{ scale: 0.94 + pulse.value * 0.13 }],
  }));

  const inner = Math.round(size * 0.49);
  const middle = Math.round(size * 0.68);

  return (
    <View
      accessibilityLabel="Noyau GRIFF actif"
      accessibilityRole="image"
      style={[styles.stage, { width: size, height: size }]}
    >
      <Animated.View style={[
        styles.glow,
        glowStyle,
        {
          width: middle,
          height: middle,
          borderRadius: middle / 2,
          backgroundColor: palette.accent,
          boxShadow: `0 0 40px ${withAlpha(palette.accent, '70')}`,
        },
      ]} />

      <Animated.View style={[styles.orbit, orbitStyle, { width: size * 0.92, height: size * 0.92, borderRadius: size / 2 }]}>
        <View style={[styles.orbitNode, { top: size * 0.02, left: size * 0.43, backgroundColor: palette.accent, boxShadow: `0 0 9px ${withAlpha(palette.accent, 'CC')}` }]} />
        <View style={[styles.orbitNodeMuted, { bottom: size * 0.07, right: size * 0.11 }]} />
      </Animated.View>

      <Animated.View style={[styles.orbitInner, reverseOrbitStyle, { width: size * 0.72, height: size * 0.72, borderRadius: size / 2 }]}>
        <View style={[styles.orbitDash, { top: -2, left: size * 0.24, backgroundColor: palette.accent }]} />
      </Animated.View>

      <View style={[styles.axis, { width: size * 0.82, transform: [{ rotate: '-31deg' }] }]} />
      <View style={[styles.axisMuted, { width: size * 0.72, transform: [{ rotate: '44deg' }] }]} />

      <Animated.View style={[styles.coreWrap, coreStyle, { width: inner, height: inner, borderRadius: inner * 0.34 }]}>
        <LinearGradient
          colors={palette.gradient}
          end={{ x: 0.92, y: 1 }}
          start={{ x: 0.08, y: 0 }}
          style={[styles.core, { borderRadius: inner * 0.34, borderColor: palette.highlight }]}
        >
          <View style={styles.coreReflection} />
          <GriffMark size={inner * 0.74} style={{ tintColor: palette.ink }} />
          <View style={styles.coreCut} />
        </LinearGradient>
      </Animated.View>

      {!compact ? (
        <View style={[styles.status, { borderColor: withAlpha(palette.accent, '55') }]}>
          <View style={[styles.statusDot, { backgroundColor: palette.accent }]} />
          <Text style={[styles.statusText, { color: palette.accent }]}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

function corePalette(styleKey?: string | null, accent?: string | null) {
  const resolvedAccent = /^#[0-9a-f]{6}$/i.test(accent ?? '') ? String(accent).toUpperCase() : colors.volt;
  if (styleKey === 'core-plasma') {
    return { accent: resolvedAccent, gradient: ['#FFE2FA', '#FF5DDF', '#8335B7', '#25102D'] as const, highlight: '#FFD0F7', ink: '#160817' };
  }
  if (styleKey === 'core-holo') {
    return { accent: resolvedAccent, gradient: ['#ECFFFF', '#54D9FF', '#757BFF', '#172046'] as const, highlight: '#D4FCFF', ink: '#07121A' };
  }
  if (styleKey === 'core-eclipse') {
    return { accent: resolvedAccent, gradient: ['#FFFFFF', '#D8DCE2', '#6C7280', '#0C0F14'] as const, highlight: '#FFFFFF', ink: '#050608' };
  }
  return { accent: resolvedAccent, gradient: ['#F8FFC7', colors.volt, '#9EB315', '#242A08'] as const, highlight: '#F7FFB4', ink: '#090C0E' };
}

function withAlpha(color: string, alpha: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alpha}` : color;
}

const styles = StyleSheet.create({
  stage: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  orbit: { position: 'absolute', borderWidth: 1, borderColor: '#38431D' },
  orbitInner: { position: 'absolute', borderWidth: 1, borderColor: '#273139', borderStyle: 'dashed' },
  orbitNode: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  orbitNodeMuted: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: '#66717B' },
  orbitDash: { position: 'absolute', width: 26, height: 4, borderRadius: 3 },
  axis: { position: 'absolute', height: 1, backgroundColor: '#556221' },
  axisMuted: { position: 'absolute', height: 1, backgroundColor: '#273139' },
  coreWrap: { overflow: 'hidden', boxShadow: '0 13px 25px rgba(232,255,61,.38)', elevation: 12 },
  core: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  coreReflection: { position: 'absolute', top: -18, left: -8, width: '86%', height: '52%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,.36)', transform: [{ rotate: '-18deg' }] },
  coreCut: { position: 'absolute', right: -15, bottom: -18, width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(4,7,8,.22)' },
  status: { position: 'absolute', bottom: 1, minHeight: 27, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, backgroundColor: '#0B100E', borderWidth: 1, borderColor: '#344018' },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontFamily: fonts.bold, fontSize: 7, letterSpacing: 1.1 },
});
