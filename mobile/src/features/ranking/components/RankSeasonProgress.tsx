import { Text, View } from 'react-native';

import { gradeAccent, isZeroRank, ZERO_RANK_ACCENT } from '../grades';
import type { RankSeasonState } from '../types';
import { journeyStyles as styles } from './SeasonJourney.styles';

type RankSeasonProgressProps = {
  state: RankSeasonState;
};

export function RankSeasonProgress({ state }: RankSeasonProgressProps) {
  const progress = Math.max(0, Math.min(1, state.grade.progression));
  const accent = isZeroRank(state.frags) ? ZERO_RANK_ACCENT : gradeAccent(state.grade);
  const nextGrade = state.grade.prochain_libelle?.toUpperCase();
  const progressWidth = `${Math.round(progress * 100)}%` as `${number}%`;

  return (
    <View style={styles.metrics}>
      <View style={styles.metricColumns}>
        <View style={styles.metricColumn}>
          <Text style={styles.metricLabel}>RATING ACTUEL</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.ratingValue}>
            {formatNumber(state.frags)}
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricColumn}>
          <Text numberOfLines={2} style={styles.metricLabel}>
            {nextGrade ? `PROGRESSION VERS ${nextGrade}` : 'PALIER SAISONNIER MAXIMAL'}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth, backgroundColor: accent }]} />
          </View>
          <Text style={[styles.progressPercent, { color: accent }]}>{Math.round(progress * 100)} %</Text>
        </View>
      </View>

      <Text style={styles.metricHint}>{nextMilestone(state).toUpperCase()}</Text>
    </View>
  );
}

function nextMilestone(state: RankSeasonState) {
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
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}
