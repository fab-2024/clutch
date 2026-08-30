import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/src/theme';

import { gradeAccent, isZeroRank, ZERO_RANK_ACCENT } from '../grades';
import type { RankSeasonState } from '../types';
import { RankEmblem } from './RankEmblem';

type RankSnapshotProps = {
  seasonName?: string;
  state: RankSeasonState;
};

const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');

export function RankSnapshot({ seasonName, state }: RankSnapshotProps) {
  const { width } = useWindowDimensions();
  const compact = width <= 340;
  const starting = isZeroRank(state.frags);
  const accent = starting ? ZERO_RANK_ACCENT : gradeAccent(state.grade);
  const grade = starting ? 'DÉPART' : state.grade.libelle?.toUpperCase() || 'CLASSÉ';
  const progress = Math.max(0, Math.min(1, state.grade.progression));
  const progressWidth = `${Math.round(progress * 100)}%` as `${number}%`;
  const milestone = nextMilestone(state);
  const position = state.rank ? `rang ${state.rank}` : 'rang en attente';

  return (
    <View
      accessibilityLabel={`${grade}, ${formatNumber(state.frags)} Frags, ${position}. ${milestone}`}
      accessible
      style={[styles.root, compact && styles.rootCompact]}
      testID="rank-snapshot"
    >
      <View style={[styles.signal, { backgroundColor: accent }]} />
      <RankEmblem grade={state.grade} size={compact ? 42 : 66} />

      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.eyebrow, compact && styles.eyebrowCompact, { color: accent }]}>
          {seasonName ? seasonName.toUpperCase() : 'SAISON EN COURS'}
        </Text>
        <View style={[styles.gradeRow, compact && styles.gradeRowCompact]}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={[styles.grade, compact && styles.gradeCompact]}
          >
            {grade}
          </Text>
          <Text style={styles.frags}>{formatNumber(state.frags)} FRAGS</Text>
        </View>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { backgroundColor: accent, width: progressWidth }]} />
        </View>
        <Text numberOfLines={2} style={styles.milestone}>{milestone.toUpperCase()}</Text>
      </View>

      <View style={[styles.position, compact && styles.positionCompact]}>
        <Text numberOfLines={1} style={[styles.rank, compact && styles.rankCompact, { color: accent }]}>
          {state.rank ? `#${state.rank}` : '—'}
        </Text>
        <Text numberOfLines={2} style={styles.rankMeta}>
          {state.classifiedPlayers ? `SUR ${formatNumber(state.classifiedPlayers)}` : 'GLOBAL'}
        </Text>
      </View>
    </View>
  );
}

export function nextMilestone(state: RankSeasonState) {
  const grade = state.grade;
  if (!grade.prochain_libelle) return 'Palier saisonnier maximal atteint';
  const missingFrags = Math.max(0, Number(grade.prochain_minimum ?? state.frags) - state.frags);
  const missingCalls = Math.max(0, Number(grade.prochains_pronostics_restants ?? 0));
  if (missingFrags > 0 && missingCalls > 0) {
    return `${formatNumber(missingFrags)} Frags et ${missingCalls} verdicts avant ${grade.prochain_libelle}`;
  }
  if (missingCalls > 0) return `${missingCalls} verdicts avant ${grade.prochain_libelle}`;
  return `${formatNumber(missingFrags)} Frags avant ${grade.prochain_libelle}`;
}

function formatNumber(value: number) {
  return NUMBER_FORMATTER.format(Number(value || 0));
}

const styles = StyleSheet.create({
  root: {
    position: 'relative',
    minHeight: 128,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  rootCompact: {
    minHeight: 138,
    marginHorizontal: spacing.sm,
    paddingRight: spacing.sm,
    gap: spacing.xs,
  },
  signal: {
    position: 'absolute',
    top: spacing.sm,
    bottom: spacing.sm,
    left: 0,
    width: 3,
    borderRadius: 2,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...typography.eyebrow,
  },
  eyebrowCompact: {
    fontSize: 9,
  },
  gradeRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  gradeRowCompact: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    gap: 0,
  },
  grade: {
    ...typography.sectionTitle,
    flexShrink: 1,
    color: colors.text,
  },
  gradeCompact: {
    fontSize: 17,
    lineHeight: 19,
  },
  frags: {
    ...typography.metadata,
    flexShrink: 0,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 4,
    marginTop: spacing.sm,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.borderSubtle,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  milestone: {
    ...typography.metadata,
    marginTop: spacing.xs,
    color: colors.textSecondary,
  },
  position: {
    width: 76,
    alignItems: 'flex-end',
  },
  positionCompact: {
    width: 50,
  },
  rank: {
    ...typography.metric,
    fontSize: 30,
    lineHeight: 31,
    width: '100%',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  rankCompact: {
    fontSize: 28,
    lineHeight: 29,
  },
  rankMeta: {
    ...typography.eyebrow,
    marginTop: 2,
    color: colors.textSecondary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
