import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInUp,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { RankRules, RankSeason, RankSeasonState } from '../types';
import { RankSeasonProgress } from './RankSeasonProgress';
import { SeasonJourneyLadder } from './SeasonJourneyLadder';
import { journeyStyles as styles } from './SeasonJourney.styles';

const ATMOSPHERE_ASSET = require('../../../../assets/rank/season-journey-atmosphere.png');

type SeasonJourneyCardProps = {
  onChooseMatch: () => void;
  onToggleRules: () => void;
  reduceMotionOverride?: boolean;
  rules: RankRules;
  rulesVisible: boolean;
  season: RankSeason;
  state: RankSeasonState;
};

export function SeasonJourneyCard({
  onChooseMatch,
  onToggleRules,
  reduceMotionOverride,
  rules,
  rulesVisible,
  season,
  state,
}: SeasonJourneyCardProps) {
  const systemReduceMotion = useReducedMotion();
  const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
  const pulse = useSharedValue(0);
  const reveal = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    reveal.value = reduceMotion
      ? 1
      : withTiming(1, { duration: 980, easing: Easing.out(Easing.cubic) });
    pulse.value = reduceMotion
      ? 0
      : withRepeat(
        withTiming(1, { duration: 2_400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );

    return () => {
      cancelAnimation(pulse);
      cancelAnimation(reveal);
      pulse.value = 0;
      reveal.value = 1;
    };
  }, [pulse, reduceMotion, reveal]);

  return (
    <View style={styles.card}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={ATMOSPHERE_ASSET}
        style={styles.atmosphere}
      />
      <LinearGradient
        colors={['rgba(6,28,40,.08)', 'rgba(8,39,53,.02)', 'rgba(2,12,20,.48)']}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
        start={{ x: 0.5, y: 0 }}
        style={styles.atmosphereVeil}
      />
      <View pointerEvents="none" style={styles.leftVignette} />
      <View pointerEvents="none" style={styles.rightVignette} />

      <Animated.View entering={reduceMotion ? FadeIn.duration(180) : FadeIn.duration(420)} style={styles.header}>
        <Text numberOfLines={1} style={styles.title}>PARCOURS DE SAISON</Text>
        <View style={styles.headerMeta}>
          <Text ellipsizeMode="tail" numberOfLines={1} style={styles.seasonName}>
            {season.name.toUpperCase()}
          </Text>
          <Pressable
            accessibilityLabel={`${rulesVisible ? 'Masquer' : 'Afficher'} les règles du rating`}
            accessibilityRole="button"
            onPress={onToggleRules}
            style={({ pressed }) => [
              styles.infoButton,
              rulesVisible && styles.infoButtonActive,
              pressed && styles.actionPressed,
            ]}
          >
            <Text style={styles.infoGlyph}>i</Text>
          </Pressable>
        </View>
      </Animated.View>

      <SeasonJourneyLadder
        pulse={pulse}
        reduceMotion={reduceMotion}
        reveal={reveal}
        state={state}
      />

      <Animated.View entering={reduceMotion ? FadeIn.duration(180) : FadeInUp.delay(620).duration(460)}>
        <RankSeasonProgress state={state} />
      </Animated.View>

      <Animated.View entering={reduceMotion ? FadeIn.duration(180) : FadeInUp.delay(760).duration(440)}>
        <Pressable
          accessibilityLabel="Choisir un match classé"
          accessibilityRole="button"
          onPress={onChooseMatch}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>CHOISIR UN MATCH</Text>
          <Text style={styles.actionArrow}>›</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
