import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type {
  CommunityFaction,
  CommunityMutationPresentation,
  FactionProgress,
} from '@/src/features/social/faction/types';
import { communityFormForLevel } from '@/src/features/social/faction/utils';

import { relicStyles as styles } from './CollectiveRelic.styles';
import RelicPedestal, {
  RelicPedestalBack,
  RelicPedestalFrontLip,
} from './RelicPedestal';

const RELIC_ASSET = require('../../../../../assets/social/faction-relic-v5.png');
const ARCH_ASSET = require('../../../../../assets/social/faction-relic-arch.png');
const TWO_PI = Math.PI * 2;

type CollectiveRelicProps = {
  accent: string;
  faction: CommunityFaction | null;
  mutation?: CommunityMutationPresentation | null;
  onMutationPresented?: (eventId: string) => Promise<void> | void;
  progress: FactionProgress;
  reduceMotionOverride?: boolean;
};

export default function CollectiveRelic({
  accent,
  faction,
  mutation,
  onMutationPresented,
  progress,
  reduceMotionOverride,
}: CollectiveRelicProps) {
  const systemReduceMotion = useReducedMotion();
  const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
  const [routeActive, setRouteActive] = useState(false);
  const [reveal, setReveal] = useState<CommunityMutationPresentation | null>(null);
  const handledMutation = useRef<string | null>(null);
  const idle = useSharedValue(0);
  const reaction = useSharedValue(0);
  const stageLabel = faction
    ? `Relique ${progress.current.name} de ${faction.nom}, ${progress.charge} supporter${progress.charge > 1 ? 's' : ''} sur ${progress.objective}`
    : 'Relique de faction en attente de couleurs';

  const stopIdle = useCallback(() => {
    cancelAnimation(idle);
    cancelAnimation(reaction);
  }, [idle, reaction]);

  const startIdle = useCallback(() => {
    stopIdle();
    idle.value = 0;
    reaction.value = 0;
    if (reduceMotion) return;
    idle.value = withRepeat(
      withTiming(1, { duration: 6_400, easing: Easing.linear }),
      -1,
      false,
    );
  }, [idle, reaction, reduceMotion, stopIdle]);

  useFocusEffect(useCallback(() => {
    setRouteActive(true);
    startIdle();
    return () => {
      stopIdle();
      setRouteActive(false);
      setReveal(null);
    };
  }, [startIdle, stopIdle]));

  useEffect(() => {
    if (!routeActive || !mutation || mutation.id === handledMutation.current) return undefined;
    setReveal(mutation);
    if (!reduceMotion) {
      reaction.value = withSequence(
        withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 760, easing: Easing.out(Easing.quad) }),
      );
    }
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    const timer = setTimeout(() => {
      handledMutation.current = mutation.id;
      setReveal(null);
      if (onMutationPresented) {
        void Promise.resolve(onMutationPresented(mutation.id)).catch(() => undefined);
      }
    }, reduceMotion ? 900 : 1_450);
    return () => clearTimeout(timer);
  }, [mutation, onMutationPresented, reaction, reduceMotion, routeActive]);

  const imageMotion = useAnimatedStyle(() => ({
    transform: [
      { translateY: reduceMotion ? 0 : Math.sin(idle.value * TWO_PI) * 1.6 },
      { scale: 1 + reaction.value * .018 },
    ],
  }), [reduceMotion]);
  const liquidMotion = useAnimatedStyle(() => {
    const breath = reduceMotion ? 0 : Math.sin(idle.value * TWO_PI);
    return {
      opacity: .68 + breath * .12 + reaction.value * .18,
      transform: [{ scaleX: 1 + reaction.value * .04 }, { scaleY: 1 + breath * .035 + reaction.value * .06 }],
    };
  }, [reduceMotion]);
  const coreMotion = useAnimatedStyle(() => {
    const pulse = reduceMotion ? 0 : (Math.sin(idle.value * TWO_PI) + 1) / 2;
    return {
      opacity: .68 + pulse * .22 + reaction.value * .1,
      transform: [{ scale: .94 + pulse * .08 + reaction.value * .18 }],
    };
  }, [reduceMotion]);
  const bubbleLargeMotion = useAnimatedStyle(() => bubbleMotion(idle.value, .08, reduceMotion), [reduceMotion]);
  const bubbleSmallMotion = useAnimatedStyle(() => bubbleMotion(idle.value, .54, reduceMotion), [reduceMotion]);

  const awaken = useCallback(() => {
    if (progress.level === 0) return;
    if (!reduceMotion) {
      reaction.value = 0;
      reaction.value = withSequence(
        withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 520, easing: Easing.out(Easing.quad) }),
      );
    }
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  }, [progress.level, reaction, reduceMotion]);

  return (
    <Pressable
      accessibilityHint={progress.level === 0 ? 'La première charge collective est nécessaire' : 'Déclenche une brève réaction du cœur'}
      accessibilityLabel={stageLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: progress.level === 0 }}
      disabled={progress.level === 0}
      onPress={awaken}
      style={({ pressed }) => [styles.stage, pressed && styles.stagePressed]}
    >
      <LinearGradient
        colors={['rgba(2,10,19,.96)', 'rgba(3,28,40,.7)', 'rgba(2,8,14,.18)']}
        locations={[0, .54, 1]}
        style={styles.sceneBackdrop}
      />

      <View pointerEvents="none" style={styles.haloCanvas}>
        <LinearGradient
          colors={['rgba(5,31,49,.1)', 'rgba(6,55,72,.46)', 'rgba(3,10,18,0)']}
          end={{ x: .5, y: 1 }}
          start={{ x: .5, y: 0 }}
          style={styles.coldAura}
        />
        <LinearGradient
          colors={['rgba(42,220,232,0)', 'rgba(29,185,203,.13)', 'rgba(8,74,91,0)']}
          locations={[0, .52, 1]}
          style={styles.glassHalo}
        />
        <View style={styles.amberAura} />
        <View style={styles.wireLeft} />
        <View style={styles.wireRight} />
        <LinearGradient
          colors={['rgba(2,10,18,0)', 'rgba(2,10,18,.78)', 'rgba(2,8,14,1)']}
          locations={[0, .72, 1]}
          style={styles.haloFade}
        />
      </View>

      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={ARCH_ASSET}
        style={styles.arch}
      />

      <RelicPedestalBack />

      <View pointerEvents="none" style={styles.vesselCanvas}>
        <Animated.Image resizeMode="contain" source={RELIC_ASSET} style={[styles.image, imageMotion]} />

        <Animated.View pointerEvents="none" style={[styles.liquidMotion, liquidMotion]}>
          <LinearGradient
            colors={['rgba(30,213,224,0)', 'rgba(27,213,223,.28)', 'rgba(9,128,148,.46)']}
            locations={[0, .46, 1]}
            style={styles.liquidGlow}
          />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.coreGlow,
            coreMotion,
            {
              backgroundColor: 'rgba(232,143,55,.48)',
              boxShadow: '0 0 32px rgba(241,147,47,.68)',
            },
          ]}
        >
          <View style={styles.coreSpark} />
        </Animated.View>
        <Animated.View style={[styles.bubble, styles.bubbleLarge, bubbleLargeMotion]}><View style={styles.bubbleHighlight} /></Animated.View>
        <Animated.View style={[styles.bubble, styles.bubbleSmall, bubbleSmallMotion]}><View style={styles.bubbleHighlight} /></Animated.View>
      </View>

      <View pointerEvents="none" style={styles.contactLightLayer}>
        <LinearGradient
          colors={['rgba(35,214,231,0)', 'rgba(32,207,224,.14)', 'rgba(71,238,246,.42)']}
          locations={[0, .55, 1]}
          style={styles.contactBloom}
        />
        <View style={styles.contactCore} />
      </View>

      <RelicPedestalFrontLip />
      <View pointerEvents="none" style={styles.contactCopperReflection} />
      <RelicPedestal accent={accent} faction={faction} />

      {reveal ? (
        <View accessibilityLiveRegion="polite" style={styles.reveal}>
          <Text style={styles.revealEyebrow}>MUTATION · FORME {communityFormForLevel(reveal.to_level).code}</Text>
          <Text style={styles.revealName}>{reveal.name.toUpperCase()}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function bubbleMotion(phase: number, offset: number, reduceMotion: boolean) {
  if (reduceMotion) return { opacity: .42, transform: [{ translateY: 0 }] };
  const local = (phase + offset) % 1;
  return {
    opacity: Math.sin(local * Math.PI) * .7,
    transform: [{ translateY: -local * 30 }, { scale: .8 + local * .28 }],
  };
}
