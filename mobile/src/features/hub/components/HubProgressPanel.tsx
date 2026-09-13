import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Flame from 'lucide-react-native/icons/flame';
import { useId } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { formatNumber } from '@/src/lib/i18n';
import { RankEmblem } from '@/src/features/ranking/components/RankEmblem';
import { gradeAccent } from '@/src/features/ranking/grades';
import { useCallStreak } from '@/src/features/retention/context';
import { nextStreakTarget } from '@/src/features/retention/presentation';
import type { CallStreakState } from '@/src/features/retention/types';
import { colors, fonts, radius } from '@/src/theme';

import type { HubData } from '../types';

type Props = {
  hub: HubData;
  loading: boolean;
  previewState?: CallStreakState;
};

const SEGMENT_COUNT = 7;

function HubStreakFlame({ size }: { size: number }) {
  const gradientId = useId().replace(/:/g, '');
  const innerGradientId = `${gradientId}-inner`;
  const glowId = `${gradientId}-glow`;

  return (
    <Svg height={size * 1.18} viewBox="0 0 160 210" width={size}>
      <Defs>
        <SvgLinearGradient id={gradientId} x1="24" x2="137" y1="194" y2="18" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FF2412" />
          <Stop offset="48%" stopColor="#FF4C12" />
          <Stop offset="1" stopColor="#FF9A30" />
        </SvgLinearGradient>
        <SvgLinearGradient id={innerGradientId} x1="72" x2="109" y1="174" y2="77" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FFBC45" />
          <Stop offset="48%" stopColor="#FF5B16" />
          <Stop offset="1" stopColor="#FF2B11" />
        </SvgLinearGradient>
        <RadialGradient id={glowId} cx="50%" cy="58%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#FF4C10" stopOpacity=".42" />
          <Stop offset="54%" stopColor="#FF2A0D" stopOpacity=".15" />
          <Stop offset="1" stopColor="#FF220B" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Path d="M8 28h144v174H8z" fill={`url(#${glowId})`} />
      <Path
        d="M106 8c-12 29-2 47 17 69 18 21 28 42 22 67-6 26-27 48-56 58 17-18 24-37 19-55-4-15-15-25-20-38-4-11-3-25 4-43-22 20-28 41-22 60 4 14 2 25-7 35-8 9-19 13-30 20C13 173 5 155 9 137c4-20 21-33 29-52 7 9 8 18 5 29 16-12 20-27 13-44-10-26 5-48 50-62Z"
        fill="rgba(49,8,7,.58)"
        stroke={`url(#${gradientId})`}
        strokeLinejoin="round"
        strokeWidth="6"
      />
      <Path
        d="M86 78c-3 20 12 30 18 44 8 19-1 40-25 58 7-17 4-29-6-39-8-9-10-19-4-31 4-10 10-19 17-32Z"
        fill="rgba(255,70,15,.16)"
        stroke={`url(#${innerGradientId})`}
        strokeLinejoin="round"
        strokeWidth="5"
      />
      <Path d="M111 35c-4 18 8 28 17 41" fill="none" opacity=".92" stroke="#FFD086" strokeLinecap="round" strokeWidth="2.5" />
      <Path d="M26 142c-1 16 8 28 22 35" fill="none" opacity=".72" stroke="#FF8A31" strokeLinecap="round" strokeWidth="2" />
    </Svg>
  );
}

export function HubProgressPanel({ hub, loading, previewState }: Props) {
  const streak = useCallStreak();
  const state = previewState ?? streak.state;
  const { isCompactWidth } = useResponsiveLayout();
  const target = state ? nextStreakTarget(state) : null;
  const remaining = target?.remaining ?? null;
  const current = state?.current ?? null;
  const streakRatio = target && current !== null
    ? Math.max(0, Math.min(1, current / target.days))
    : 0;
  const filledSegments = Math.round(streakRatio * SEGMENT_COUNT);
  const reward = target?.volts !== null && target?.volts !== undefined
    ? `${formatNumber(target.volts)} Volts`
    : 'Badge de série';

  const grade = hub.frags?.grade;
  const gradeLabel = loading ? '—' : grade?.libelle || 'Non classé';
  const frags = loading || !hub.frags ? null : hub.frags.frags;
  const nextThreshold = grade?.prochain_minimum ?? grade?.plafond;
  const accent = loading ? colors.textSecondary : gradeAccent(grade);
  const rankProgress = Math.max(0, Math.min(1, grade?.progression ?? 0));
  const nextRank = loading || !grade
    ? 'Progression à confirmer'
    : grade.prochain_libelle
      ? `Prochain rang · ${grade.prochain_libelle}`
      : 'Rang maximal atteint';

  return (
    <View style={styles.panel} testID="hub-progress-panel">
      <LinearGradient
        colors={['rgba(11,34,47,.98)', 'rgba(5,18,27,.99)', 'rgba(3,13,20,.99)']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.textureOne} />
      <View pointerEvents="none" style={styles.textureTwo} />

      <Pressable
        accessibilityHint="Ouvre le calendrier et les récompenses de ta série"
        accessibilityLabel={state && target
          ? `Série actuelle, ${state.current} jours. Plus que ${target.remaining} jours avant le palier ${target.days} jours, ${reward}.`
          : 'Série actuelle, progression à confirmer'}
        accessibilityRole="button"
        onPress={() => router.push(previewState ? '/streak-preview' : '/streak')}
        style={({ pressed }) => [styles.streakSection, pressed && styles.pressed]}
        testID="call-streak-card"
      >
        <View style={[styles.streakIdentity, isCompactWidth && styles.streakIdentityCompact]}>
          <Text style={styles.eyebrow}>SÉRIE ACTUELLE</Text>
          <View style={styles.streakArt}>
            <View style={styles.flameGlow}>
              <HubStreakFlame size={isCompactWidth ? 78 : 90} />
            </View>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={.62}
              numberOfLines={1}
              style={[styles.streakDays, isCompactWidth && styles.streakDaysCompact]}
              testID="hub-streak-days"
            >
              {current === null ? '—' : formatNumber(current)}
            </Text>
            <Text style={styles.streakUnit}>JOURS</Text>
          </View>
        </View>

        <View style={styles.streakDivider} />

        <View style={styles.streakDetails}>
          <Text adjustsFontSizeToFit minimumFontScale={.72} numberOfLines={1} style={styles.remaining}>
            {remaining === null
              ? 'Progression à confirmer'
              : remaining === 0
                ? 'Palier atteint'
                : `Plus que ${remaining} jour${remaining > 1 ? 's' : ''}`}
          </Text>
          <Text numberOfLines={2} style={styles.streakSubtitle}>Maintiens ta série jusqu’au prochain palier.</Text>

          <View style={styles.segmentLine}>
            <View
              accessibilityLabel={target ? `Progression de la série : ${current ?? 0} sur ${target.days} jours` : 'Progression de la série à confirmer'}
              accessibilityRole="progressbar"
              accessibilityValue={target ? { min: 0, max: target.days, now: Math.min(current ?? 0, target.days) } : undefined}
              style={styles.segments}
            >
              {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
                <View
                  key={index}
                  style={[
                    styles.segment,
                    index < filledSegments && styles.segmentFilled,
                    index === filledSegments - 1 && styles.segmentHot,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.segmentCount}>{current === null || !target ? '— / —' : `${Math.min(current, target.days)} / ${target.days}`}</Text>
          </View>

          <View style={styles.rewardPill}>
            <View style={styles.rewardIcon}><Flame color="#FF5B1D" size={16} strokeWidth={2.1} /></View>
            <View style={styles.rewardDivider} />
            <Text adjustsFontSizeToFit minimumFontScale={.75} numberOfLines={1} style={styles.rewardText}>
              {target ? `Palier ${target.days} jours · ${reward}` : 'Prochain palier à confirmer'}
            </Text>
          </View>
        </View>
      </Pressable>

      <View style={styles.horizontalDivider} />

      <Pressable
        accessibilityLabel={`Ouvrir ma saison, rang ${gradeLabel}, ${frags === null ? 'progression à confirmer' : `${formatNumber(frags)} Frags`}. ${nextRank}`}
        accessibilityRole="button"
        onPress={() => router.push('/(tabs)/rank')}
        style={({ pressed }) => [styles.rankSection, pressed && styles.pressed]}
        testID="hub-season-ranking"
      >
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.rankEmblem}>
          <RankEmblem decorative grade={grade} size={isCompactWidth ? 65 : 74} />
        </View>

        <View style={styles.rankIdentity}>
          <Text style={styles.rankEyebrow}>RANG ACTUEL</Text>
          <Text numberOfLines={1} style={[styles.rankGrade, { color: accent }]}>{gradeLabel}</Text>
          <Text numberOfLines={2} style={styles.seasonName}>{hub.seasonName ?? 'Saison en cours'}</Text>
        </View>

        <View style={styles.rankDivider} />

        <View style={styles.rankProgress}>
          <View style={styles.rankMetricLine}>
            <Text adjustsFontSizeToFit minimumFontScale={.7} numberOfLines={1} style={styles.rankMetric}>
              {frags === null ? '—' : formatNumber(frags)}
              {nextThreshold ? <Text style={styles.rankMetricMuted}> / {formatNumber(nextThreshold)}</Text> : null}
              <Text style={styles.rankMetricUnit}> Frags</Text>
            </Text>
            <ChevronRight color="#F4F6F7" size={28} strokeWidth={2.8} />
          </View>
          <Text numberOfLines={1} style={styles.nextRank}>{nextRank}</Text>
          <View
            accessibilityLabel="Progression vers le prochain rang"
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(rankProgress * 100) }}
            style={styles.rankTrack}
          >
            <View style={[styles.rankFill, { backgroundColor: accent, width: `${rankProgress * 100}%` }]} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#23404E',
    backgroundColor: '#071923',
  },
  textureOne: {
    position: 'absolute',
    left: -56,
    top: 54,
    width: 250,
    height: 36,
    backgroundColor: 'rgba(62,97,112,.08)',
    transform: [{ rotate: '-32deg' }],
  },
  textureTwo: {
    position: 'absolute',
    right: -80,
    bottom: 26,
    width: 260,
    height: 48,
    backgroundColor: 'rgba(26,70,88,.07)',
    transform: [{ rotate: '-30deg' }],
  },
  streakSection: {
    minHeight: 150,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  streakIdentity: { width: 115, flexShrink: 0 },
  streakIdentityCompact: { width: 104 },
  eyebrow: { color: '#C3CBD0', fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 1.1 },
  streakArt: { flex: 1, minHeight: 110, alignItems: 'center', justifyContent: 'center' },
  flameGlow: {
    position: 'absolute',
    left: -5,
    bottom: 1,
    shadowColor: '#FF3D0D',
    shadowOpacity: .76,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  streakDays: {
    position: 'absolute',
    right: 1,
    top: 4,
    width: 78,
    color: '#F7F4ED',
    fontFamily: fonts.display,
    fontSize: 82,
    lineHeight: 88,
    letterSpacing: -3,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,.96)',
    textShadowOffset: { width: 2, height: 4 },
    textShadowRadius: 4,
  },
  streakDaysCompact: { fontSize: 72, lineHeight: 80, width: 70 },
  streakUnit: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    color: '#F6F1E8',
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: -.3,
    textShadowColor: 'rgba(0,0,0,.96)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  streakDivider: { width: 1, marginLeft: 8, marginRight: 12, backgroundColor: '#E1662B' },
  streakDetails: { flex: 1, minWidth: 0, justifyContent: 'center' },
  remaining: { color: '#F7F7F5', fontFamily: fonts.bold, fontSize: 20, lineHeight: 24, letterSpacing: -.35 },
  streakSubtitle: { marginTop: 3, color: '#D4D9DC', fontFamily: fonts.medium, fontSize: 12, lineHeight: 15 },
  segmentLine: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  segments: { flex: 1, flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 8, borderRadius: 3, backgroundColor: '#193241' },
  segmentFilled: { backgroundColor: '#FF2D17' },
  segmentHot: { backgroundColor: '#FF7A1B' },
  segmentCount: { color: '#F4F5F4', fontFamily: fonts.medium, fontSize: 12, lineHeight: 15 },
  rewardPill: {
    minHeight: 34,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#F04C1B',
    paddingHorizontal: 8,
  },
  rewardIcon: { width: 20, alignItems: 'center' },
  rewardDivider: { height: 21, width: 1, marginHorizontal: 7, backgroundColor: '#DB6C3D' },
  rewardText: { flex: 1, color: '#ECEFF0', fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },
  horizontalDivider: { height: 1.5, marginHorizontal: 10, backgroundColor: '#D76C39' },
  rankSection: {
    minHeight: 91,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  rankEmblem: { width: 70, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  rankIdentity: { width: 91, flexShrink: 0, paddingLeft: 3 },
  rankEyebrow: { color: '#7F8D96', fontFamily: fonts.medium, fontSize: 9, lineHeight: 12, letterSpacing: 1.15 },
  rankGrade: { marginTop: 1, fontFamily: fonts.bold, fontSize: 18, lineHeight: 21 },
  seasonName: { marginTop: 2, color: '#B9C1C6', fontFamily: fonts.medium, fontSize: 9, lineHeight: 12 },
  rankDivider: { width: 1, height: 61, marginHorizontal: 10, backgroundColor: '#E1662B' },
  rankProgress: { flex: 1, minWidth: 0 },
  rankMetricLine: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rankMetric: { flex: 1, color: '#F4F5F4', fontFamily: fonts.bold, fontSize: 17, lineHeight: 21 },
  rankMetricMuted: { color: '#B6BDC2', fontFamily: fonts.medium },
  rankMetricUnit: { color: '#E5E8EA', fontFamily: fonts.medium, fontSize: 14 },
  nextRank: { marginTop: 1, color: '#AEB8BE', fontFamily: fonts.medium, fontSize: 9, lineHeight: 12 },
  rankTrack: { height: 6, marginTop: 7, overflow: 'hidden', borderRadius: 4, borderWidth: 1, borderColor: '#C85E2D', backgroundColor: '#14242D' },
  rankFill: { height: '100%', borderRadius: 3 },
  pressed: { opacity: .82 },
});
