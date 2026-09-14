import { ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, fonts, layout, radius, spacing } from '@/src/theme';

import { gradeAccent } from '../grades';
import type { RankSeasonState } from '../types';
import { rankEmblemSource } from './RankEmblem';

const ARENA = require('../../../../assets/rank/season-rank-arena-v3.jpg');
const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');

type Props = {
  onChooseMatch: () => void;
  state: RankSeasonState;
};

export function RankSeasonHero({ onChooseMatch, state }: Props) {
  const { width } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const cardWidth = measuredWidth || Math.min(width, layout.contentMaxWidth) - spacing.md * 2;
  const compact = cardWidth <= 328;
  const accent = gradeAccent(state.grade);
  const grade = state.grade.libelle?.toUpperCase() || 'BRONZE';
  const firstCall = state.settledCalls === 0;
  const pendingRank = firstCall || !state.rank;
  const nextThreshold = state.grade.prochain_minimum;
  const progress = Math.max(0, Math.min(1, state.grade.progression));
  const position = pendingRank ? null : `RANG #${formatNumber(state.rank!)}`;
  const accessiblePosition = state.classifiedPlayers && position
    ? `${position}, sur ${formatNumber(state.classifiedPlayers)} joueurs classés`
    : position;
  const progressValue = nextThreshold == null
    ? `${formatNumber(state.frags)} FRAGS`
    : `${formatNumber(state.frags)} / ${formatNumber(nextThreshold)} FRAGS`;

  return (
    <View
      onLayout={({ nativeEvent }) => setMeasuredWidth(nativeEvent.layout.width)}
      style={[styles.root, { height: Math.round(cardWidth * 1.03) }]}
      testID="rank-season-hero"
    >
      <Image accessible={false} resizeMode="stretch" source={ARENA} style={styles.background} />

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.emblemStage}
      >
        <Image resizeMode="contain" source={rankEmblemSource(state.grade.cle)} style={styles.emblem} />
      </View>

      <View
        accessible
        accessibilityLabel={`${grade}, grade actuel. ${formatNumber(state.frags)} Frags.${accessiblePosition ? ` ${accessiblePosition}.` : ''}`}
        style={styles.gradeConsole}
      >
        <Text style={[styles.eyebrow, compact && styles.eyebrowCompact]}>GRADE ACTUEL</Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          numberOfLines={1}
          style={[styles.grade, compact && styles.gradeCompact]}
        >
          {grade}
        </Text>
        <Text style={[styles.frags, compact && styles.fragsCompact]}>
          {formatNumber(state.frags)} <Text style={styles.unit}>{state.frags > 1 ? 'FRAGS' : 'FRAG'}</Text>
        </Text>
        {position ? (
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={[styles.position, { color: accent }]}>
            {position}
          </Text>
        ) : null}
      </View>

      <View style={styles.progressBlock}>
        <View
          accessible
          accessibilityLabel={state.grade.prochain_libelle ? `Progression vers ${state.grade.prochain_libelle}` : 'Palier saisonnier maximal'}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100), text: progressValue }}
          style={styles.progressTrack}
          testID="rank-season-progress"
        >
          <View style={[styles.progressFill, { backgroundColor: accent, width: `${progress * 100}%` }]} />
          {progress === 0 ? <View style={styles.progressOrigin} /> : null}
        </View>
        <Text numberOfLines={1} style={[styles.progressValue, compact && styles.progressValueCompact]}>{progressValue}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onChooseMatch}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.actionText}>
          {firstCall ? 'FAIRE MON PREMIER CALL' : 'FAIRE UN CALL'}
        </Text>
        <ChevronRight color={colors.canvas} size={compact ? 21 : 24} strokeWidth={3.5} />
      </Pressable>
    </View>
  );
}

function formatNumber(value: number) {
  return NUMBER_FORMATTER.format(value);
}

const styles = StyleSheet.create({
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  root: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: '#020A10',
    borderWidth: 1,
    borderColor: '#3B6375',
  },
  emblemStage: {
    position: 'absolute',
    top: '4.2%',
    left: '21%',
    right: '21%',
    height: '40%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblem: {
    width: '100%',
    height: '100%',
  },
  gradeConsole: {
    position: 'absolute',
    top: '48%',
    left: '17%',
    right: '17%',
    alignItems: 'center',
  },
  eyebrow: {
    fontFamily: fonts.displayBold,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 0.5,
  },
  eyebrowCompact: {
    fontSize: 10,
  },
  grade: {
    width: '100%',
    marginTop: -1,
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 39,
    lineHeight: 40,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  gradeCompact: {
    fontSize: 35,
    lineHeight: 36,
  },
  frags: {
    marginTop: -2,
    fontFamily: fonts.display,
    color: colors.text,
    fontSize: 18,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  fragsCompact: {
    fontSize: 16,
    lineHeight: 18,
  },
  unit: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  position: {
    width: '100%',
    marginTop: 1,
    fontFamily: fonts.displayBold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.35,
    textAlign: 'center',
  },
  progressBlock: {
    position: 'absolute',
    top: '69.7%',
    left: '22%',
    right: '22%',
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: '#20323E',
    borderWidth: 1,
    borderColor: '#375162',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  progressOrigin: {
    position: 'absolute',
    left: -1,
    top: -1,
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: '#F4A261',
  },
  progressValue: {
    marginTop: 3,
    fontFamily: fonts.displayBold,
    color: colors.text,
    fontSize: 17,
    lineHeight: 19,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  progressValueCompact: {
    fontSize: 15,
    lineHeight: 17,
  },
  action: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    bottom: '2.8%',
    minHeight: 49,
    paddingLeft: 26,
    paddingRight: 14,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.volt,
    shadowColor: colors.volt,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  actionText: {
    flex: 1,
    color: colors.canvas,
    fontFamily: fonts.display,
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
