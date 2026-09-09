import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { colors, typography } from '@/src/theme';
import { pulse, rockFrame, TITAN_ARTBOARD, TITAN_ROCKS, TITAN_WAVE_DURATION, unit } from './timeline';

const REST = require('../../../../../assets/shop/effects/titan-wave/rest.png');
const FISSURES = require('../../../../../assets/shop/effects/titan-wave/fissures.png');
const ROCK_IMAGES = [
  require('../../../../../assets/shop/effects/titan-wave/rock-1.png'),
  require('../../../../../assets/shop/effects/titan-wave/rock-2.png'),
  require('../../../../../assets/shop/effects/titan-wave/rock-3.png'),
  require('../../../../../assets/shop/effects/titan-wave/rock-4.png'),
];

type Props = { active?: boolean; presentation?: 'detail' | 'scene'; replaySignal?: number; /** Development storyboard only. */ previewTimeMs?: number; reduceMotionOverride?: boolean };

export default function TitanWavePreview({ active = true, presentation = 'detail', replaySignal = 0, previewTimeMs, reduceMotionOverride }: Props) {
  const [reduced, setReduced] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [playing, setPlaying] = useState(false);
  const busy = useRef(false);
  const started = useRef(false);
  const clock = useSharedValue(0);
  const scene = presentation === 'scene';
  const replaySeen = useRef(replaySignal);
  const motionReduced = reduceMotionOverride ?? reduced;
  const enabled = active && foreground && !motionReduced;
  const scale = scene ? Math.min(layout.width / 768, layout.height / 512) : Math.min(layout.width / (TITAN_ARTBOARD.width - 118), (layout.height - 25) / (TITAN_ARTBOARD.height - 102));
  const ready = scale > 0;
  const finish = useCallback(() => { busy.current = false; setPlaying(false); }, []);

  const play = useCallback(() => {
    if (!enabled || !ready || busy.current || previewTimeMs !== undefined) return;
    busy.current = true;
    setPlaying(true);
    cancelAnimation(clock);
    clock.value = 0;
    clock.value = withTiming(TITAN_WAVE_DURATION, { duration: TITAN_WAVE_DURATION, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(finish)();
    });
  }, [clock, enabled, finish, previewTimeMs, ready]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduced(value); }).catch(() => undefined);
    const app = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active');
      if (state !== 'active') {
        cancelAnimation(clock);
        clock.value = 0;
        busy.current = false;
        setPlaying(false);
      }
    });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; app.remove(); motion.remove(); };
  }, [clock]);
  useEffect(() => {
    if (!enabled || previewTimeMs !== undefined) {
      cancelAnimation(clock);
      clock.value = enabled ? Math.max(0, Math.min(TITAN_WAVE_DURATION, previewTimeMs ?? 0)) : 0;
      busy.current = false;
      setPlaying(false);
      return;
    }
    if (ready && !started.current) { started.current = true; play(); }
  }, [clock, enabled, play, previewTimeMs, ready]);
  useEffect(() => {
    if (replaySeen.current === replaySignal) return;
    replaySeen.current = replaySignal;
    play();
  }, [play, replaySignal]);
  useEffect(() => () => { cancelAnimation(clock); busy.current = false; }, [clock]);

  const fissuresStyle = useAnimatedStyle(() => ({ opacity: pulse(clock.value, 0, 280, 1480) * .95 }));
  const heartStyle = useAnimatedStyle(() => ({ opacity: pulse(clock.value, 80, 300, 680) * .85,
    transform: [{ scale: .7 + unit(clock.value / 300) * .3 }] }));
  const ringStyle = useAnimatedStyle(() => {
    const p = unit((clock.value - 250) / 520);
    return { opacity: pulse(clock.value, 250, 390, 850), transform: [{ translateY: p * 63 }, { scaleX: .12 + p * .88 }, { scaleY: (.12 + p * .88) * .4375 }] };
  });

  return <Pressable pointerEvents={scene ? "none" : "auto"} accessible={!scene} accessibilityElementsHidden={scene} importantForAccessibility={scene ? "no-hide-descendants" : "auto"} accessibilityRole={scene ? undefined : 'button'} accessibilityLabel={scene ? undefined : 'Rejouer l’Onde Titanide'}
    accessibilityHint={motionReduced ? 'Illustration statique, réduction des animations activée' : 'Joue une onde de choc de 1,6 seconde'}
    accessibilityState={{ disabled: !enabled || playing, busy: playing }}
    disabled={scene || !enabled || playing || previewTimeMs !== undefined} onPress={play}
    onLayout={(event) => { const { width, height } = event.nativeEvent.layout; setLayout({ width, height }); }}
    style={styles.root} testID="titan-wave-preview">
    {ready ? <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', width: 768, height: 512,
        left: (layout.width - 768) / 2, top: (layout.height - (scene ? 0 : 25) - 512) / 2,
        transform: [{ scale }] }}>
      {!scene ? <Image source={REST} resizeMode="contain" style={styles.art} testID="titan-wave-rest" /> : null}
      {!scene ? <Animated.View style={[styles.art, fissuresStyle]} testID="titan-wave-fissures"><Image source={FISSURES} resizeMode="contain" style={styles.art} /></Animated.View> : null}
      <Animated.View style={[styles.heart, heartStyle]}><Svg width="80" height="36" viewBox="0 0 80 36"><Defs><RadialGradient id="titan-core"><Stop offset="0" stopColor="#FFEAC0" /><Stop offset={0.28} stopColor="#FFB326" stopOpacity={0.9} /><Stop offset="1" stopColor="#FF6A00" stopOpacity="0" /></RadialGradient></Defs><Ellipse cx="40" cy="18" rx="40" ry="18" fill="url(#titan-core)" /></Svg></Animated.View>
      <Animated.View style={[styles.ring, ringStyle]} testID="titan-wave-ring"><View style={styles.ringInner} /></Animated.View>
      {TITAN_ROCKS.map((rock, index) => <Rock key={index} clock={clock} index={index} rock={rock} />)}
      {[0, 1, 2, 3, 4, 5].map((index) => <Spark key={index} index={index} clock={clock} />)}
    </View> : null}
    {!scene ? <Text style={styles.hint}>{motionReduced ? 'Animations réduites' : playing ? 'Onde Titanide' : 'Toucher pour rejouer'}</Text> : null}
  </Pressable>;
}

function Rock({ clock, index, rock }: { clock: SharedValue<number>; index: number; rock: (typeof TITAN_ROCKS)[number] }) {
  const animated = useAnimatedStyle(() => {
    const frame = rockFrame(clock.value, rock.delay);
    return { opacity: frame.opacity, transform: [{ translateY: -rock.lift * frame.height },
      { translateX: rock.drift * frame.progress }, { rotate: `${rock.turn * frame.progress}deg` }] };
  });
  return <Animated.View style={[styles.rock, { left: rock.x, top: rock.y, width: rock.width, height: rock.height }, animated]}>
    <Image source={ROCK_IMAGES[index]} resizeMode="contain" style={styles.art} />
  </Animated.View>;
}
function Spark({ clock, index }: { clock: SharedValue<number>; index: number }) {
  const animated = useAnimatedStyle(() => {
    const p = unit((clock.value - 300 - index * 28) / 950);
    const angle = index * Math.PI / 3;
    return { opacity: pulse(clock.value, 300 + index * 28, 470 + index * 28, 1330),
      transform: [{ translateX: Math.cos(angle) * 175 * p }, { translateY: Math.sin(angle) * 55 * p - 60 * 4 * p * (1 - p) }] };
  });
  return <Animated.View style={[styles.spark, index % 2 === 0 && { backgroundColor: '#79E7F4' }, animated]} />;
}
const styles = StyleSheet.create({
  root: { width: '100%', height: '100%', overflow: 'hidden' },
  art: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  heart: { position: 'absolute', left: 344, top: 204, width: 80, height: 36 },
  ring: { position: 'absolute', left: 112, top: -50, width: 544, height: 544, borderRadius: 300, borderWidth: 8, borderColor: '#76EAFE' },
  ringInner: { flex: 1, margin: 5, borderWidth: 3, borderRadius: 300, borderColor: '#1B748C' },
  rock: { position: 'absolute' },
  spark: { position: 'absolute', width: 4, height: 4, borderRadius: 2, left: 382, top: 222, backgroundColor: '#FFB23B' },
  hint: { position: 'absolute', bottom: 7, alignSelf: 'center', ...typography.caption, color: colors.textMuted },
});
