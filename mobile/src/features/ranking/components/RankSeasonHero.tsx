import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { useId, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';

import { colors, fonts, layout, radius, spacing } from '@/src/theme';

import { gradeAccent } from '../grades';
import type { RankSeasonState } from '../types';
import { rankEmblemSource } from './RankEmblem';
import { nextMilestone } from './RankSnapshot';

const ATMOSPHERE = require('../../../../assets/rank/season-journey-atmosphere.png');
const PEDESTAL = require('../../../../assets/rank/rank-tier-pedestal-v1.png');
const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');

type Props = {
  onChooseMatch: () => void;
  state: RankSeasonState;
};

export function RankSeasonHero({ onChooseMatch, state }: Props) {
  const haloId = useId();
  const { width } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const cardWidth = measuredWidth || Math.min(width, layout.contentMaxWidth) - spacing.md * 2;
  const compact = cardWidth <= 328;
  const accent = gradeAccent(state.grade);
  const grade = state.grade.libelle?.toUpperCase() || 'BRONZE';
  const gradeSize = Math.min(74, (cardWidth * 0.46 - (compact ? 12 : 18) - 2) / (grade.length * 0.48));
  const firstCall = state.settledCalls === 0;
  const pendingRank = firstCall || !state.rank;
  const nextThreshold = state.grade.prochain_minimum;
  const progress = Math.max(0, Math.min(1, state.grade.progression));
  const milestone = nextMilestone(state);
  const position = pendingRank ? 'Rang en attente' : `Rang ${formatNumber(state.rank!)} sur ${formatNumber(state.classifiedPlayers)}`;

  return (
    <View onLayout={({ nativeEvent }) => setMeasuredWidth(nativeEvent.layout.width)} style={styles.root} testID="rank-season-hero">
      <View style={[styles.main, compact && styles.mainCompact]}>
        <Image accessible={false} resizeMode="cover" source={ATMOSPHERE} style={styles.atmosphere} />
        <LinearGradient
          colors={['rgba(3,13,20,0)', 'rgba(3,13,20,.55)', '#030D14']}
          end={{ x: 1, y: 0.5 }}
          pointerEvents="none"
          start={{ x: 0, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.artwork}
        >
          <Svg height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 220 300" width="100%">
            <Defs>
              <RadialGradient id={haloId}>
                <Stop offset="0" stopColor="#16869E" stopOpacity={0.5} />
                <Stop offset="0.55" stopColor="#116277" stopOpacity={0.24} />
                <Stop offset="1" stopColor="#116277" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx="110" cy="137" fill={`url(#${haloId})`} r="112" />
            <Circle cx="110" cy="126" fill="none" r="99" stroke="#37C8C9" strokeOpacity={0.13} />
            <Circle cx="110" cy="126" fill="none" r="88" stroke="#37C8C9" strokeOpacity={0.13} strokeDasharray="2 5" />
            <Circle cx="110" cy="126" fill="none" r="78" stroke="#37C8C9" strokeOpacity={0.12} />
            <Path d="M110 18V228 M7 126H213 M37 53L183 199 M37 199L183 53" stroke="#37C8C9" strokeOpacity={0.09} />
            <Ellipse cx="110" cy="280" fill="none" rx="107" ry="17" stroke={accent} strokeOpacity={0.14} />
          </Svg>
          <Image resizeMode="contain" source={PEDESTAL} style={styles.pedestal} />
          <Image resizeMode="contain" source={rankEmblemSource(state.grade.cle)} style={styles.emblem} />
        </View>

        <View style={[styles.copy, compact && styles.copyCompact]}>
          <View accessible accessibilityLabel={`${grade}, grade actuel. ${formatNumber(state.frags)} Frags. ${position}.`}>
            <Text style={styles.eyebrow}>GRADE ACTUEL</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.55} numberOfLines={1} style={[styles.grade, { fontSize: gradeSize, lineHeight: gradeSize * 1.1 }]}>
              {grade}
            </Text>
            <Text style={styles.frags}>
              {formatNumber(state.frags)} <Text style={styles.unit}>{state.frags > 1 ? 'FRAGS' : 'FRAG'}</Text>
            </Text>
            <Text style={[styles.position, { color: accent }]}>
              {pendingRank ? 'RANG EN ATTENTE' : `RANG #${formatNumber(state.rank!)}`}
            </Text>
            {!pendingRank ? <Text style={styles.population}>SUR {formatNumber(state.classifiedPlayers)} JOUEURS</Text> : null}
          </View>

          <View style={styles.progressBlock}>
            <View
              accessible
              accessibilityLabel={state.grade.prochain_libelle ? `Progression vers ${state.grade.prochain_libelle}` : 'Palier saisonnier maximal'}
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100), text: milestone }}
              style={styles.progressTrack}
              testID="rank-season-progress"
            >
              <View style={[styles.progressFill, { backgroundColor: accent, width: `${progress * 100}%` }]} />
              {progress === 0 ? <View style={[styles.progressOrigin, { backgroundColor: accent }]} /> : null}
            </View>
            {nextThreshold != null ? (
              <Text style={styles.progressValue}>
                {formatNumber(state.frags)} <Text style={styles.progressTarget}>/ {formatNumber(nextThreshold)} FRAGS</Text>
              </Text>
            ) : null}
            <Text style={styles.milestone}>{milestone.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onChooseMatch}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text style={styles.actionText}>{firstCall ? 'FAIRE MON PREMIER CALL' : 'FAIRE UN CALL'}</Text>
        <ChevronRight color={colors.canvas} size={23} strokeWidth={3} />
      </Pressable>
    </View>
  );
}

function formatNumber(value: number) {
  return NUMBER_FORMATTER.format(value);
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: radius.lg,
    backgroundColor: '#030D14',
  },
  main: { minHeight: 280, flexDirection: 'row' },
  mainCompact: { minHeight: 260 },
  atmosphere: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '72%', opacity: 0.52 },
  artwork: { position: 'absolute', top: 6, bottom: 4, left: 0, width: '54%' },
  pedestal: { position: 'absolute', bottom: 5, left: '-5%', width: '110%', height: '40%' },
  emblem: { position: 'absolute', top: '8%', left: '-2%', width: '104%', height: '72%' },
  copy: { width: '46%', marginLeft: '54%', paddingTop: 29, paddingBottom: 25, paddingRight: 18 },
  copyCompact: { paddingTop: 26, paddingRight: 12 },
  eyebrow: { fontFamily: fonts.displayBold, color: colors.textMuted, fontSize: 14, lineHeight: 18 },
  grade: { marginVertical: 15, fontFamily: fonts.display, color: colors.text, letterSpacing: -1, transform: [{ scaleY: 1.6 }] },
  frags: { fontFamily: fonts.displayBold, color: colors.text, fontSize: 28, lineHeight: 31, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 18, color: colors.textSecondary },
  position: { marginTop: 10, fontFamily: fonts.displayBold, fontSize: 15, lineHeight: 18, letterSpacing: 0.4 },
  population: { marginTop: 3, fontFamily: fonts.displayBold, color: colors.textMuted, fontSize: 12, lineHeight: 15 },
  progressBlock: { marginTop: 18, gap: 9 },
  progressTrack: { height: 6, borderRadius: radius.pill, backgroundColor: '#1A2A32', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.pill },
  progressOrigin: { position: 'absolute', width: 6, height: 6, borderRadius: radius.pill },
  progressValue: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24, color: colors.text, fontVariant: ['tabular-nums'] },
  progressTarget: { fontSize: 16, color: colors.textSecondary },
  milestone: { marginTop: 3, fontFamily: fonts.displayBold, fontSize: 13, lineHeight: 17, color: colors.textMuted },
  action: { minHeight: 48, marginHorizontal: spacing.md, paddingVertical: 12, paddingLeft: 26, paddingRight: 14, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.volt },
  actionText: { flex: 1, textAlign: 'center', color: colors.canvas, fontFamily: fonts.display, fontSize: 18, lineHeight: 22 },
  pressed: { opacity: 0.8 },
});
