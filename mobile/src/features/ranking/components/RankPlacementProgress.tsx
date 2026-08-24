import { Text, View } from 'react-native';

import { gradeAccent } from '../grades';
import type { RankSeasonState } from '../types';
import { journeyStyles as styles } from './SeasonJourney.styles';

type RankPlacementProgressProps = {
  state: RankSeasonState;
};

export function RankPlacementProgress({ state }: RankPlacementProgressProps) {
  const target = Math.max(1, state.grade.objectif_placements);
  const complete = Math.max(0, Math.min(target, target - state.placementsRemaining));
  const progress = Math.max(0, Math.min(1, state.grade.progression));
  const accent = gradeAccent(state.grade);
  const nextGrade = state.grade.prochain_libelle?.toUpperCase();
  const progressWidth = `${Math.max(2, Math.round(progress * 100))}%` as `${number}%`;

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
          {state.provisional ? (
            <>
              <Text style={styles.metricLabel}>PROGRESSION PLACEMENT</Text>
              <View style={styles.placementProgressRow}>
                <View style={styles.placementDots}>
                  {Array.from({ length: target }, (_, index) => {
                    const completed = index < complete;
                    return (
                      <View
                        key={index}
                        accessible
                        accessibilityLabel={`Verdict ${index + 1} sur ${target} : ${completed ? 'terminé' : 'en attente'}`}
                        style={[styles.placementDot, completed && styles.placementDotComplete]}
                      />
                    );
                  })}
                </View>
                <Text style={styles.placementCount}>{complete} / {target}</Text>
              </View>
            </>
          ) : (
            <>
              <Text numberOfLines={2} style={styles.metricLabel}>
                {nextGrade ? `PROGRESSION VERS ${nextGrade}` : 'PALIER SAISONNIER MAXIMAL'}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: progressWidth, backgroundColor: accent }]} />
              </View>
              <Text style={[styles.progressPercent, { color: accent }]}>{Math.round(progress * 100)} %</Text>
            </>
          )}
        </View>
      </View>

      <Text style={styles.metricHint}>
        {state.provisional
          ? `${state.placementsRemaining} VERDICT${state.placementsRemaining > 1 ? 'S' : ''} POUR RÉVÉLER TON GRADE`
          : nextMilestone(state).toUpperCase()}
      </Text>
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
