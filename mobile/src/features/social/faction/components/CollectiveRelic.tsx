import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type {
  CommunityMutationPresentation,
  FactionProgress,
  RelicContainer,
} from '@/src/features/social/faction/types';
import {
  communityFormForLevel,
  shouldPresentRelicMutation,
} from '@/src/features/social/faction/utils';

import { relicStyles as styles } from './CollectiveRelic.styles';

const RELIC_ASSETS: Record<RelicContainer, number> = {
  ampoule: require('../../../../../assets/social/relic-evolution/ampoule.png'),
  fiole: require('../../../../../assets/social/relic-evolution/fiole.png'),
  flacon: require('../../../../../assets/social/relic-evolution/flacon.png'),
  reacteur: require('../../../../../assets/social/relic-evolution/reacteur.png'),
  reliquaire: require('../../../../../assets/social/relic-evolution/reliquaire.png'),
};

type CollectiveRelicProps = {
  accent: string;
  mutation?: CommunityMutationPresentation | null;
  onMutationPresented?: (eventId: string) => Promise<void> | void;
  progress: FactionProgress;
  reduceMotionOverride?: boolean;
};

type BubbleSpec = { delay: number; id: string; left: number; size: number; travel: number };
type ParticleSpec = { color: string; id: string; size: number; x: number; y: number };

const BUBBLES: BubbleSpec[] = [
  { id: 'a', left: 42, size: 7, delay: 0, travel: 74 },
  { id: 'b', left: 55, size: 10, delay: .08, travel: 92 },
  { id: 'c', left: 48, size: 6, delay: .18, travel: 114 },
  { id: 'd', left: 62, size: 8, delay: .25, travel: 82 },
  { id: 'e', left: 36, size: 11, delay: .31, travel: 126 },
  { id: 'f', left: 52, size: 7, delay: .4, travel: 137 },
  { id: 'g', left: 67, size: 6, delay: .46, travel: 102 },
  { id: 'h', left: 31, size: 8, delay: .54, travel: 118 },
  { id: 'i', left: 58, size: 5, delay: .59, travel: 151 },
  { id: 'j', left: 44, size: 9, delay: .64, travel: 132 },
];

const PARTICLES: ParticleSpec[] = [
  { id: 'p1', x: -118, y: -95, size: 5, color: '#E8FF3D' },
  { id: 'p2', x: 105, y: -82, size: 4, color: '#D59B42' },
  { id: 'p3', x: -88, y: -18, size: 7, color: '#8FE7E9' },
  { id: 'p4', x: 124, y: 4, size: 5, color: '#E8FF3D' },
  { id: 'p5', x: -118, y: 78, size: 4, color: '#D59B42' },
  { id: 'p6', x: 94, y: 96, size: 7, color: '#7DD4DA' },
  { id: 'p7', x: -55, y: -132, size: 4, color: '#E8FF3D' },
  { id: 'p8', x: 45, y: -145, size: 5, color: '#D59B42' },
  { id: 'p9', x: -48, y: 126, size: 6, color: '#83D8DC' },
  { id: 'p10', x: 39, y: 142, size: 4, color: '#E8FF3D' },
];

export default function CollectiveRelic({
  accent,
  mutation,
  onMutationPresented,
  progress,
  reduceMotionOverride,
}: CollectiveRelicProps) {
  const systemReduceMotion = useReducedMotion();
  const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
  const currentForm = progress.current;
  const [displayForm, setDisplayForm] = useState(currentForm);
  const [focused, setFocused] = useState(false);
  const [routeActive, setRouteActive] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [reveal, setReveal] = useState<CommunityMutationPresentation | null>(null);
  const activeRef = useRef(false);
  const lastPlayedEventRef = useRef<string | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const idle = useSharedValue(0);
  const reaction = useSharedValue(0);
  const heartbeat = useSharedValue(0);
  const mutationPhase = useSharedValue(0);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current = timersRef.current.filter((candidate) => candidate !== timer);
      callback();
    }, delay);
    timersRef.current.push(timer);
  }, []);

  const stopAnimations = useCallback(() => {
    cancelAnimation(idle);
    cancelAnimation(reaction);
    cancelAnimation(heartbeat);
    cancelAnimation(mutationPhase);
  }, [heartbeat, idle, mutationPhase, reaction]);

  const startIdle = useCallback(() => {
    cancelAnimation(idle);
    idle.value = 0;
    if (reduceMotion) return;
    idle.value = withRepeat(
      withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [idle, reduceMotion]);

  useFocusEffect(useCallback(() => {
    setRouteActive(true);
    startIdle();
    return () => {
      clearTimers();
      stopAnimations();
      activeRef.current = false;
      setIsAnimating(false);
      setReveal(null);
      setRouteActive(false);
    };
  }, [clearTimers, startIdle, stopAnimations]));

  useEffect(() => {
    if (!activeRef.current) setDisplayForm(currentForm);
  }, [currentForm, routeActive]);

  useEffect(() => () => {
    clearTimers();
    stopAnimations();
  }, [clearTimers, stopAnimations]);

  const haptic = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS === 'web') return;
    void Haptics.impactAsync(style).catch(() => undefined);
  }, []);

  const awaken = useCallback(() => {
    if (activeRef.current || progress.level === 0) return;
    activeRef.current = true;
    setIsAnimating(true);
    clearTimers();
    reaction.value = 0;
    heartbeat.value = 0;

    if (reduceMotion) {
      reaction.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
      heartbeat.value = withSequence(
        withTiming(.55, { duration: 120 }),
        withTiming(0, { duration: 260 }),
      );
      haptic(Haptics.ImpactFeedbackStyle.Light);
      schedule(() => {
        reaction.value = 0;
        activeRef.current = false;
        setIsAnimating(false);
      }, 460);
      return;
    }

    reaction.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) });
    heartbeat.value = withSequence(
      withTiming(.38, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 120 }),
      withTiming(1, { duration: 230, easing: Easing.out(Easing.back(2)) }),
      withTiming(0, { duration: 970, easing: Easing.out(Easing.quad) }),
    );
    schedule(() => haptic(Haptics.ImpactFeedbackStyle.Light), 145);
    schedule(() => haptic(Haptics.ImpactFeedbackStyle.Medium), 390);
    schedule(() => {
      reaction.value = 0;
      activeRef.current = false;
      setIsAnimating(false);
    }, 1530);
  }, [clearTimers, heartbeat, haptic, progress.level, reaction, reduceMotion, schedule]);

  const playMutation = useCallback((event: CommunityMutationPresentation) => {
    if (activeRef.current) return;
    activeRef.current = true;
    setIsAnimating(true);
    setReveal(null);
    clearTimers();
    stopAnimations();
    setDisplayForm(communityFormForLevel(event.from_level));
    reaction.value = 0;
    heartbeat.value = 0;
    mutationPhase.value = 0;

    const swap = () => {
      setDisplayForm(communityFormForLevel(event.to_level));
      setReveal(event);
      haptic(Haptics.ImpactFeedbackStyle.Heavy);
    };
    const finish = () => {
      mutationPhase.value = 0;
      setReveal(null);
      activeRef.current = false;
      setIsAnimating(false);
      lastPlayedEventRef.current = event.id;
      startIdle();
      if (onMutationPresented) {
        void Promise.resolve(onMutationPresented(event.id)).catch(() => undefined);
      }
    };

    if (reduceMotion) {
      mutationPhase.value = withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) });
      schedule(swap, 250);
      schedule(finish, 720);
      return;
    }

    mutationPhase.value = withSequence(
      withTiming(.42, { duration: 720, easing: Easing.in(Easing.cubic) }),
      withTiming(.47, { duration: 180, easing: Easing.linear }),
      withTiming(.68, { duration: 360, easing: Easing.out(Easing.back(1.6)) }),
      withTiming(1, { duration: 1160, easing: Easing.out(Easing.cubic) }),
    );
    heartbeat.value = withSequence(
      withTiming(.2, { duration: 760 }),
      withTiming(0, { duration: 150 }),
      withTiming(1.28, { duration: 250, easing: Easing.out(Easing.back(2.2)) }),
      withTiming(0, { duration: 1120, easing: Easing.out(Easing.quad) }),
    );
    schedule(swap, 1_055);
    schedule(finish, 2_520);
  }, [clearTimers, heartbeat, haptic, mutationPhase, onMutationPresented, reaction, reduceMotion, schedule, startIdle, stopAnimations]);

  useEffect(() => {
    if (!routeActive || isAnimating || !shouldPresentRelicMutation(mutation, lastPlayedEventRef.current)) return;
    playMutation(mutation!);
  }, [isAnimating, mutation, playMutation, routeActive]);

  const intensity = displayForm.intensity;
  const bubbleCount = Math.max(2, Math.round(2 + intensity * 8));
  const finalState = displayForm.state === 'awakened';
  const stageLabel = progress.level === 0
    ? 'Cœur dormant, une première charge collective est nécessaire'
    : `${displayForm.name}, charge collective ${progress.charge} sur ${progress.objective}`;

  const imageStyle = useAnimatedStyle(() => {
    const phase = mutationPhase.value;
    const mutationOpacity = interpolate(phase, [0, .44, .55, .7, 1], [1, .72, 0, 1, 1], Extrapolation.CLAMP);
    const mutationScale = interpolate(phase, [0, .42, .56, .72, 1], [1, .88, 1.12, 1.035, 1], Extrapolation.CLAMP);
    const awakenedLift = finalState ? idle.value * -4 : 0;
    return {
      opacity: (displayForm.state === 'dormant' ? .26 : .62 + intensity * .34) * mutationOpacity,
      transform: [
        { perspective: 900 },
        { translateY: -3 + idle.value * 5 + awakenedLift },
        { rotateZ: `${-.32 + idle.value * .64 + heartbeat.value * intensity * .22}deg` },
        { scale: displayForm.visualScale * mutationScale * (1 + heartbeat.value * .035) },
      ],
    };
  }, [displayForm.state, displayForm.visualScale, finalState, intensity]);

  const coreStyle = useAnimatedStyle(() => {
    const pulse = Math.max(heartbeat.value, Math.sin(reaction.value * Math.PI) * .68);
    const mutationPulse = interpolate(mutationPhase.value, [.35, .56, .78], [0, 1.45, .18], Extrapolation.CLAMP);
    return {
      bottom: displayForm.coreBottom + (finalState ? idle.value * 5 : 0),
      opacity: displayForm.state === 'dormant' ? .03 : .12 + intensity * .22 + pulse * .56 + mutationPulse * .32,
      transform: [{ scale: .72 + intensity * .14 + pulse * .5 + mutationPulse * .42 }],
    };
  }, [displayForm.coreBottom, displayForm.state, finalState, intensity]);

  const waveStyle = useAnimatedStyle(() => {
    const wake = Math.sin(reaction.value * Math.PI);
    const mutationWake = interpolate(mutationPhase.value, [.2, .48, .72, 1], [0, -.35, 1.6, 0], Extrapolation.CLAMP);
    return {
      bottom: displayForm.coreBottom + 17,
      opacity: Math.max(0, wake * (.26 + intensity * .5) + Math.abs(mutationWake) * .4),
      transform: [{ scale: .45 + reaction.value * 1.35 + mutationWake }],
    };
  }, [displayForm.coreBottom, intensity]);

  const veinStyle = useAnimatedStyle(() => ({
    bottom: displayForm.coreBottom + 5,
    opacity: displayForm.state === 'dormant'
      ? 0
      : .08 + heartbeat.value * .72 + Math.sin(reaction.value * Math.PI) * .44,
    transform: [{ scaleY: .72 + heartbeat.value * .34 }],
  }), [displayForm.coreBottom, displayForm.state]);

  const auraStyle = useAnimatedStyle(() => {
    const impact = interpolate(mutationPhase.value, [.42, .56, .78], [0, 1, 0], Extrapolation.CLAMP);
    return { opacity: impact * .82, transform: [{ scale: .45 + impact * 1.45 }] };
  });

  const vaporStyle = useAnimatedStyle(() => ({
    opacity: intensity >= .7 ? .05 + Math.sin(reaction.value * Math.PI) * .44 + mutationPhase.value * .14 : 0,
    transform: [{ translateY: -reaction.value * 25 }, { scaleX: .68 + reaction.value * .42 }],
  }), [intensity]);

  const arcStyle = useAnimatedStyle(() => ({
    opacity: intensity >= .95 ? Math.sin(reaction.value * Math.PI * 2) * .28 + mutationPhase.value * .22 : 0,
    transform: [{ scale: .72 + heartbeat.value * .3 }, { rotateZ: `${idle.value * 5 - 2.5}deg` }],
  }), [intensity]);

  const crackStyle = useAnimatedStyle(() => {
    const impact = interpolate(mutationPhase.value, [.35, .58, 1], [0, .95, .22], Extrapolation.CLAMP);
    return { opacity: finalState ? Math.max(.18, impact) : mutation?.awakened ? impact : 0 };
  }, [finalState, mutation?.awakened]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(mutationPhase.value, [.5, .63, .94, 1], [0, 1, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(mutationPhase.value, [.5, .68], [8, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <Pressable
      accessibilityHint={progress.level === 0 ? 'Requiert une première charge collective' : 'Joue une réaction brève du cœur et du liquide'}
      accessibilityLabel={stageLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isAnimating || progress.level === 0 }}
      disabled={isAnimating || progress.level === 0}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
      onPress={awaken}
      style={({ pressed }) => [styles.stage, focused && styles.stageFocused, pressed && !isAnimating && styles.stagePressed]}
    >
      <LinearGradient
        colors={['#080D11', '#000000', '#000000', '#070A0C']}
        locations={[0, .17, .84, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.backgroundAura} />
      <Animated.View style={[styles.mutationAura, auraStyle, { backgroundColor: `${accent}55`, boxShadow: `0 0 72px ${accent}99` }]} />
      <Animated.Image resizeMode="contain" source={RELIC_ASSETS[displayForm.container]} style={[styles.image, imageStyle]} />

      <Animated.View style={[styles.coreGlow, coreStyle, { backgroundColor: `${accent}70`, boxShadow: `0 0 29px ${accent}A8` }]}>
        <View style={styles.coreSpark} />
      </Animated.View>
      <Animated.View style={[styles.liquidWave, waveStyle]} />
      <Animated.View style={[styles.veinField, veinStyle]}>
        <View style={[styles.vein, { transform: [{ rotateZ: '-21deg' }] }]} />
        <View style={[styles.vein, { height: 96 }]} />
        <View style={[styles.vein, { transform: [{ rotateZ: '24deg' }] }]} />
      </Animated.View>

      {BUBBLES.slice(0, bubbleCount).map((bubble) => (
        <RelicBubble
          key={bubble.id}
          bubble={bubble}
          coreBottom={displayForm.coreBottom}
          intensity={intensity}
          mutationPhase={mutationPhase}
          reaction={reaction}
        />
      ))}
      {PARTICLES.map((particle) => (
        <RelicParticle key={particle.id} coreBottom={displayForm.coreBottom} mutationPhase={mutationPhase} particle={particle} />
      ))}

      <Animated.View style={[styles.vapor, vaporStyle, { bottom: displayForm.coreBottom + 130 }]} />
      <Animated.View style={[styles.arc, arcStyle, { bottom: displayForm.coreBottom + 3 }]} />
      <Animated.View style={[styles.crackField, crackStyle, { bottom: displayForm.coreBottom - 4 }]}>
        <View style={[styles.crack, { left: 71, top: 18, transform: [{ rotateZ: '17deg' }] }]} />
        <View style={[styles.crack, { left: 49, top: 63, height: 49, transform: [{ rotateZ: '-39deg' }] }]} />
        <View style={[styles.crack, { right: 48, top: 64, height: 52, transform: [{ rotateZ: '42deg' }] }]} />
      </Animated.View>

      <LinearGradient
        colors={['rgba(0,0,0,.22)', 'rgba(0,0,0,0)', 'rgba(0,0,0,.18)']}
        locations={[0, .52, 1]}
        style={styles.vignette}
      />

      {reveal ? (
        <Animated.View style={[styles.reveal, revealStyle]}>
          <Text style={styles.revealEyebrow}>{reveal.awakened ? 'ÉVEIL TOTAL' : `MUTATION · FORME ${communityFormForLevel(reveal.to_level).code}`}</Text>
          <Text style={styles.revealName}>{reveal.name.toUpperCase()}</Text>
          {reveal.reward > 0 ? (
            <Text style={styles.revealReward}>RÉCOMPENSE COLLECTIVE · +{reveal.reward.toLocaleString('fr-FR')} VOLTS</Text>
          ) : reveal.awakened ? (
            <Text style={styles.revealReward}>RÉCOMPENSE COLLECTIVE · ÉTAT ÉVEILLÉ DÉBLOQUÉ</Text>
          ) : null}
        </Animated.View>
      ) : null}

      <View style={[styles.hint, isAnimating && styles.hintDisabled]}>
        <View style={styles.hintDot} />
        <Text style={styles.hintText}>{isAnimating ? 'LE CŒUR RÉPOND…' : progress.level === 0 ? 'CŒUR DORMANT' : 'TOUCHE POUR RÉVEILLER LE CŒUR'}</Text>
      </View>
    </Pressable>
  );
}

function RelicBubble({
  bubble,
  coreBottom,
  intensity,
  mutationPhase,
  reaction,
}: {
  bubble: BubbleSpec;
  coreBottom: number;
  intensity: number;
  mutationPhase: SharedValue<number>;
  reaction: SharedValue<number>;
}) {
  const motion = useAnimatedStyle(() => {
    const wake = Math.max(0, Math.min(1, (reaction.value - bubble.delay) / Math.max(.01, 1 - bubble.delay)));
    const suction = interpolate(mutationPhase.value, [0, .45, .58, 1], [0, 1, -.35, 0], Extrapolation.CLAMP);
    return {
      opacity: Math.max(0, Math.sin(wake * Math.PI) * (.38 + intensity * .55) + Math.abs(suction) * .45),
      transform: [
        { translateX: suction * (50 - bubble.left) * .8 },
        { translateY: -wake * bubble.travel + suction * 28 },
        { scale: .58 + wake * .55 - suction * .16 },
      ],
    };
  }, [bubble.delay, bubble.left, bubble.travel, intensity]);

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          bottom: coreBottom + 10,
          left: `${bubble.left}%`,
          width: bubble.size,
          height: bubble.size,
          borderRadius: bubble.size / 2,
        },
        motion,
      ]}
    >
      <LinearGradient colors={['rgba(255,247,217,.64)', 'rgba(217,151,56,.12)', 'rgba(24,8,2,.34)']} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={styles.bubbleHighlight} />
      <View style={styles.bubbleDepth} />
    </Animated.View>
  );
}

function RelicParticle({
  coreBottom,
  mutationPhase,
  particle,
}: {
  coreBottom: number;
  mutationPhase: SharedValue<number>;
  particle: ParticleSpec;
}) {
  const motion = useAnimatedStyle(() => {
    const phase = mutationPhase.value;
    if (phase <= 0) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: .5 }] };
    const beforeImpact = phase < .5;
    const local = beforeImpact ? phase / .5 : (phase - .5) / .5;
    const distance = beforeImpact ? 1 - local : local * 1.45;
    return {
      opacity: beforeImpact ? interpolate(local, [0, .25, 1], [0, .45, .95]) : 1 - local,
      transform: [
        { translateX: particle.x * distance },
        { translateY: particle.y * distance },
        { scale: beforeImpact ? .55 + local * .4 : 1 + local * .55 },
      ],
    };
  }, [particle.x, particle.y]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          bottom: coreBottom + 22,
          width: particle.size,
          height: particle.size,
          marginLeft: -particle.size / 2,
          backgroundColor: particle.color,
        },
        motion,
      ]}
    />
  );
}
