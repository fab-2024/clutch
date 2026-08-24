import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

export type RelicScenePoint = {
  x: number;
  y: number;
};

type SupporterArrivalOverlayProps = {
  amount: number;
  end: RelicScenePoint | null;
  phase: SharedValue<number>;
  reduceMotion: boolean;
  start: RelicScenePoint | null;
};

export function SupporterArrivalOverlay({
  amount,
  end,
  phase,
  reduceMotion,
  start,
}: SupporterArrivalOverlayProps) {
  const size = amount >= 6 ? 14 : amount >= 2 ? 11 : 8;
  const flightStyle = useAnimatedStyle(() => {
    if (!start || !end || reduceMotion) return { opacity: 0 };
    const flight = interpolate(phase.value, [.125, .5], [0, 1], Extrapolation.CLAMP);
    const oneMinus = 1 - flight;
    const direction = start.x >= end.x ? -1 : 1;
    const controlX = start.x + (end.x - start.x) * .46 + direction * 28;
    const controlY = Math.min(start.y, end.y) - 42;
    const x = oneMinus * oneMinus * start.x
      + 2 * oneMinus * flight * controlX
      + flight * flight * end.x;
    const y = oneMinus * oneMinus * start.y
      + 2 * oneMinus * flight * controlY
      + flight * flight * end.y;
    const opacity = interpolate(
      phase.value,
      [.1, .145, .44, .58, .68],
      [0, 1, 1, .38, 0],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [
        { translateX: x - size / 2 },
        { translateY: y - size / 2 },
        { scale: interpolate(phase.value, [.125, .34, .5], [.72, 1, .78], Extrapolation.CLAMP) },
      ],
    };
  }, [end, reduceMotion, size, start]);
  const amountStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, .04, .23, .31], [0, 1, .9, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(phase.value, [0, .3], [3, -9], Extrapolation.CLAMP) },
      { scale: interpolate(phase.value, [0, .08, .3], [.86, 1.05, 1], Extrapolation.CLAMP) },
    ],
  }));
  const reducedStyle = useAnimatedStyle(() => {
    if (!end || !reduceMotion) return { opacity: 0 };
    return {
      opacity: interpolate(phase.value, [0, .12, .62, 1], [0, .72, .32, 0], Extrapolation.CLAMP),
      transform: [{ translateX: end.x - size / 2 }, { translateY: end.y + 28 - size / 2 }],
    };
  }, [end, reduceMotion, size]);

  if (!start || !end) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.drop, { height: size, width: size, borderRadius: size / 2 }, flightStyle]}>
        <LinearGradient
          colors={['#FFFFFF', '#FFD875', '#E8A33D']}
          end={{ x: .75, y: 1 }}
          start={{ x: .25, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.dropCore} />
      </Animated.View>
      <Animated.View style={[styles.drop, { height: size, width: size, borderRadius: size / 2 }, reducedStyle]}>
        <View style={styles.reducedCore} />
      </Animated.View>
      <Animated.View style={[styles.amount, { left: start.x - 16, top: start.y - 16 }, amountStyle]}>
        <Text style={styles.amountText}>+{amount}</Text>
      </Animated.View>
    </View>
  );
}

export function SupporterCounterPulse({
  children,
  phase,
}: PropsWithChildren<{ phase: SharedValue<number> }>) {
  const motion = useAnimatedStyle(() => ({
    transform: [{
      scale: interpolate(phase.value, [0, .08, .24, .34], [1, 1.09, 1.025, 1], Extrapolation.CLAMP),
    }],
  }));
  return <Animated.View style={motion}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  drop: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(142,244,250,.76)',
    boxShadow: '0 0 12px rgba(61,222,232,.42), 0 0 18px rgba(236,169,69,.24)',
  },
  dropCore: {
    position: 'absolute',
    width: '32%',
    height: '32%',
    left: '20%',
    top: '16%',
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,.96)',
  },
  reducedCore: {
    width: '100%',
    height: '100%',
    borderRadius: 99,
    backgroundColor: 'rgba(242,178,71,.9)',
    boxShadow: '0 0 13px rgba(49,215,226,.46)',
  },
  amount: {
    position: 'absolute',
    minWidth: 32,
    alignItems: 'center',
  },
  amountText: {
    color: '#F0F7C4',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
