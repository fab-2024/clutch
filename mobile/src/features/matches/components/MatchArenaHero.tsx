import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { LiveBadge } from '@/src/components/ui/LiveBadge';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { resolveTeamAccent } from '@/src/utils/teamColors';
import type { MatchJourneySnapshot } from '../matchJourney';
import type { ArenaMatch, MatchProjection, ProjectionChoice } from '../types';
import { gameLabel, type MatchPhase } from '../utils';
import { formatMatchDate, formatTime, ProbabilityBar, ProjectionMeta } from './MatchCenterSections';
import { styles } from './MatchCenterScreen.styles';

const ARENA_HANDOFF_DURATION_MS = 320;
const REDUCED_HANDOFF_DURATION_MS = 140;

type MatchArenaHeroProps = {
  choiceA: ProjectionChoice | null;
  choiceB: ProjectionChoice | null;
  compact: boolean;
  match: ArenaMatch;
  mode?: 'full' | 'picker';
  motionEnabled: boolean;
  phase: MatchPhase;
  previewProgress?: number;
  projection: MatchProjection | null;
  reduceMotion: boolean;
  snapshot: MatchJourneySnapshot | null;
};

export function MatchArenaHero({
  choiceA,
  choiceB,
  compact,
  match,
  mode = 'full',
  motionEnabled,
  phase,
  previewProgress,
  projection,
  reduceMotion,
  snapshot,
}: MatchArenaHeroProps) {
  const snapshotMatches = snapshot?.matchId === match.id;
  const picker = mode === 'picker';
  const handoff = Boolean(motionEnabled && snapshotMatches);
  const fixedProgress = previewProgress == null ? null : clamp(previewProgress, 0, 1);
  const progress = useSharedValue(fixedProgress ?? (handoff ? 0 : 1));
  const accentA = resolveTeamAccent({ name: match.equipe_a, tag: match.tag_a, provided: snapshotMatches ? snapshot?.accentA : null });
  const accentB = resolveTeamAccent({ name: match.equipe_b, tag: match.tag_b, provided: snapshotMatches ? snapshot?.accentB : null });
  const logoA = (snapshotMatches ? snapshot?.logoA : null) ?? match.logo_a ?? null;
  const logoB = (snapshotMatches ? snapshot?.logoB : null) ?? match.logo_b ?? null;

  useEffect(() => {
    cancelAnimation(progress);
    if (fixedProgress != null) {
      progress.value = fixedProgress;
      return;
    }
    if (!handoff) {
      progress.value = 1;
      return;
    }

    progress.value = 0;
    progress.value = withTiming(1, {
      duration: reduceMotion ? REDUCED_HANDOFF_DURATION_MS : ARENA_HANDOFF_DURATION_MS,
      easing: Easing.bezier(.2, 0, 0, 1),
    });
    return () => cancelAnimation(progress);
  }, [fixedProgress, handoff, match.id, progress, reduceMotion]);

  const rootStyle = useAnimatedStyle(() => {
    const value = progress.value;
    if (reduceMotion) return { opacity: interpolate(value, [0, 1], [.82, 1]) };
    return {
      opacity: interpolate(value, [0, .18, 1], [.9, 1, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(value, [0, 1], [16, 0], Extrapolation.CLAMP) },
        { scale: interpolate(value, [0, 1], [.955, 1], Extrapolation.CLAMP) },
      ],
    };
  });
  const metaStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, .42, 1], [.18, .76, 1], Extrapolation.CLAMP),
    transform: reduceMotion ? [] : [{ translateY: interpolate(progress.value, [0, 1], [-5, 0], Extrapolation.CLAMP) }],
  }));
  const dateStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, .42, 1], [.18, .76, 1], Extrapolation.CLAMP),
  }));
  const leftTeamStyle = useAnimatedStyle(() => reduceMotion ? {} : ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-17, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [1.17, 1], Extrapolation.CLAMP) },
    ],
  }));
  const rightTeamStyle = useAnimatedStyle(() => reduceMotion ? {} : ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [17, 0], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [1.17, 1], Extrapolation.CLAMP) },
    ],
  }));
  const detailStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, .3, 1], [.2, .38, 1], Extrapolation.CLAMP),
    transform: reduceMotion ? [] : [{ translateY: interpolate(progress.value, [.44, 1], [7, 0], Extrapolation.CLAMP) }],
  }));
  const watermarkStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [.12, .035], Extrapolation.CLAMP),
  }));
  const showProjection = Boolean(choiceA && choiceB && phase !== 'finished' && phase !== 'cancelled');

  return (
    <Animated.View
      style={[styles.hero, compact && styles.heroLandscape, picker && styles.heroPicker, rootStyle]}
      testID={handoff ? 'match-arena-handoff' : 'match-arena-hero'}
    >
      <LinearGradient
        colors={[withAlpha(accentA, .2), '#0D1218', withAlpha(accentB, .18)]}
        end={{ x: 1, y: .55 }}
        pointerEvents="none"
        start={{ x: 0, y: .45 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(4,8,12,.12)', 'rgba(5,9,13,.42)', 'rgba(5,8,11,.94)']}
        end={{ x: .5, y: 1 }}
        pointerEvents="none"
        start={{ x: .5, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.heroAccent} />

      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.heroWatermarks}>
        <Animated.View style={[styles.heroWatermark, styles.heroWatermarkLeft, picker && styles.heroWatermarkPicker, watermarkStyle]}>
          <TeamLogo accent={accentA} contentScale={1} frameless name={match.equipe_a} size={compact || picker ? 112 : 148} tag={match.tag_a} uri={logoA} />
        </Animated.View>
        <Animated.View style={[styles.heroWatermark, styles.heroWatermarkRight, picker && styles.heroWatermarkPicker, watermarkStyle]}>
          <TeamLogo accent={accentB} contentScale={1} frameless name={match.equipe_b} size={compact || picker ? 112 : 148} tag={match.tag_b} uri={logoB} />
        </Animated.View>
      </View>

      <Animated.View style={[styles.metaRow, metaStyle]}>
        <View style={styles.metaLeft}>
          <View style={styles.gameDot} />
          <Text style={styles.metaText}>{gameLabel(match.jeu)}</Text>
          <Text style={styles.metaDivider}>·</Text>
          <Text numberOfLines={1} style={styles.eventText}>{match.evenement}</Text>
        </View>
        <View style={styles.boPill}><Text style={styles.boText}>BO{match.format}</Text></View>
      </Animated.View>

      <Animated.Text style={[styles.dateText, picker && styles.dateTextPicker, phase === 'live' && styles.dateLive, dateStyle]}>
        {formatMatchDate(match)}
      </Animated.Text>

      <View style={[styles.duel, compact && styles.duelLandscape, picker && styles.duelPicker]}>
        <ArenaHeroTeam
          accent={accentA}
          animatedStyle={leftTeamStyle}
          compact={compact}
          condensed={picker}
          logo={logoA}
          name={match.equipe_a}
          probability={choiceA?.proba}
          score={match.score_a}
          tag={match.tag_a}
          winner={match.statut === 'termine' && Number(match.score_a) > Number(match.score_b)}
        />
        <Animated.View style={[styles.duelCenter, detailStyle]}>
          {phase === 'live' ? <LiveBadge /> : <Text style={styles.vsLabel}>{phaseLabel(phase)}</Text>}
          <Text style={styles.vs}>{phase === 'finished' || phase === 'cancelled' ? '—' : 'VS'}</Text>
          <Text style={styles.kickoff}>{formatTime(match.debut)}</Text>
        </Animated.View>
        <ArenaHeroTeam
          accent={accentB}
          animatedStyle={rightTeamStyle}
          compact={compact}
          condensed={picker}
          logo={logoB}
          name={match.equipe_b}
          probability={choiceB?.proba}
          score={match.score_b}
          tag={match.tag_b}
          winner={match.statut === 'termine' && Number(match.score_b) > Number(match.score_a)}
        />
      </View>

      {!picker && showProjection && choiceA && choiceB ? (
        <Animated.View style={detailStyle}>
          <ProbabilityBar a={choiceA} b={choiceB} tagA={match.tag_a} tagB={match.tag_b} />
        </Animated.View>
      ) : null}

      {!picker && projection && phase !== 'finished' && phase !== 'cancelled' ? (
        <Animated.View style={detailStyle}>
          <ProjectionMeta projection={projection} />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function ArenaHeroTeam({
  accent,
  animatedStyle,
  compact,
  condensed,
  logo,
  name,
  probability,
  score,
  tag,
  winner,
}: {
  accent: string;
  animatedStyle: object;
  compact: boolean;
  condensed: boolean;
  logo: string | null | undefined;
  name: string;
  probability?: number;
  score: number | null;
  tag: string;
  winner: boolean;
}) {
  const outcome = score !== null
    ? `, score ${score}${winner ? ', vainqueur' : ''}`
    : probability !== undefined
      ? `, probabilité ${Math.round(Number(probability) * 100)} pour cent`
      : '';

  return (
    <Animated.View
      accessibilityLabel={`${name}${outcome}`}
      accessible
      style={[styles.heroTeam, compact && styles.heroTeamLandscape, condensed && styles.heroTeamPicker, animatedStyle]}
    >
      <View style={[styles.heroTeamMark, compact && styles.heroTeamMarkLandscape, condensed && styles.heroTeamMarkPicker, { borderColor: withAlpha(accent, winner ? .82 : .44), backgroundColor: withAlpha(accent, winner ? .16 : .08) }]}>
        <View pointerEvents="none" style={[styles.heroTeamGlow, { backgroundColor: accent }]} />
        <TeamLogo accent={accent} contentScale={1.02} frameless name={name} size={compact || condensed ? 52 : 67} tag={tag} uri={logo} />
      </View>
      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.heroTeamTag, condensed && styles.heroTeamTagPicker, winner && { color: accent }]}>{tag}</Text>
      <Text numberOfLines={condensed ? 1 : 2} style={[styles.heroTeamName, condensed && styles.heroTeamNamePicker]}>{name}</Text>
      {score !== null ? <Text style={[styles.heroScore, winner && { color: accent }]}>{score}</Text> : null}
      {score === null && probability !== undefined ? <Text style={styles.heroProbability}>{Math.round(Number(probability) * 100)}%</Text> : null}
    </Animated.View>
  );
}

function phaseLabel(phase: MatchPhase) {
  if (phase === 'finished') return 'FINAL';
  if (phase === 'cancelled') return 'ANNULÉ';
  if (phase === 'live') return 'LIVE';
  return 'VERSUS';
}

function withAlpha(color: string, alpha: number) {
  const normalized = resolveTeamAccent({ provided: color });
  const channel = Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, '0');
  return `${normalized}${channel}`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}
