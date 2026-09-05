import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, fonts, radius, spacing, typography } from '@/src/theme';

import { gradeAccent, gradeDefinition } from '../grades';
import type { RankSeasonState } from '../types';
import { RankEmblem } from './RankEmblem';

type NextHorizonCardProps = {
  expanded: boolean;
  onToggleJourney: () => void;
  state: RankSeasonState;
};

const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');

export function NextHorizonCard({ expanded, onToggleJourney, state }: NextHorizonCardProps) {
  const compact = useWindowDimensions().width <= 360;
  const current = gradeDefinition(state.grade);
  const next = gradeDefinition(state.grade.prochaine_cle);
  const currentLabel = (state.grade.libelle ?? current?.label ?? 'Bronze').toUpperCase();
  const nextLabel = (state.grade.prochain_libelle ?? next?.label)?.toUpperCase();
  const nextThreshold = state.grade.prochain_minimum ?? next?.minimum;
  const verdictsRemaining = Math.max(0, Number(state.grade.prochains_pronostics_restants ?? 0));
  const currentAccent = gradeAccent(state.grade);
  const nextGrade = next ? {
    cle: next.key,
    libelle: next.label,
    minimum: next.minimum,
    ordre: Number(state.grade.ordre ?? 0) + 1,
  } : null;
  const horizonLabel = nextLabel && nextThreshold != null
    ? `${currentLabel}, grade actuel. ${nextLabel}, prochain grade à ${formatNumber(nextThreshold)} Frags${verdictsRemaining ? ` et ${verdictsRemaining} verdicts` : ''}.`
    : `${currentLabel}, grade actuel. Sommet saisonnier atteint.`;

  return (
    <View style={styles.root} testID="rank-next-horizon">
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PROCHAIN HORIZON</Text>
        <Pressable
          accessibilityLabel={expanded ? 'Réduire le parcours de saison' : 'Voir le parcours complet de la saison'}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onToggleJourney}
          style={({ pressed }) => [styles.journeyAction, pressed && styles.pressed]}
        >
          <Text style={styles.journeyActionText}>{expanded ? 'RÉDUIRE LE PARCOURS' : 'VOIR LE PARCOURS'}</Text>
          <Text style={styles.journeyActionArrow}>{expanded ? '⌃' : '›'}</Text>
        </Pressable>
      </View>

      <View accessibilityLabel={horizonLabel} accessible style={[styles.horizon, compact && styles.horizonCompact]}>
        <View style={styles.gradePanel}>
          <View
            style={[
              styles.emblemHalo,
              compact && styles.emblemHaloCompact,
              { borderColor: currentAccent + '88', boxShadow: `0 0 22px ${currentAccent}44` },
            ]}
          >
            <RankEmblem decorative grade={state.grade} size={compact ? 66 : 78} />
          </View>
          <View style={styles.gradeCopy}>
            <View style={styles.gradeLine}>
              <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={styles.currentGrade}>
                {currentLabel}
              </Text>
              <Text style={styles.separator}>·</Text>
              <Text style={[styles.status, { color: currentAccent }]}>ACTUEL</Text>
            </View>
          </View>
        </View>

        <View pointerEvents="none" style={styles.connector}>
          <View style={styles.connectorLine} />
          <View style={[styles.connectorDiamond, { borderColor: currentAccent }]} />
          <View style={styles.connectorLine} />
        </View>

        <View style={[styles.gradePanel, styles.nextPanel]}>
          {nextGrade ? (
            <View style={[styles.emblemHalo, compact && styles.emblemHaloCompact, styles.nextHalo]}>
              <RankEmblem decorative grade={nextGrade} size={compact ? 62 : 74} />
            </View>
          ) : (
            <View style={[styles.emblemHalo, compact && styles.emblemHaloCompact, styles.nextHalo]}>
              <Text style={[styles.summitGlyph, { color: currentAccent }]}>◆</Text>
            </View>
          )}
          <View style={styles.gradeCopy}>
            {nextLabel && nextThreshold != null ? (
              <>
                <View style={styles.gradeLine}>
                  <Text adjustsFontSizeToFit minimumFontScale={0.68} numberOfLines={1} style={styles.nextGrade}>
                    {nextLabel}
                  </Text>
                  <Text style={styles.separator}>·</Text>
                  <Text style={styles.nextStatus}>PROCHAIN</Text>
                </View>
                <Text style={styles.threshold}>{formatNumber(nextThreshold)} FRAGS</Text>
                {verdictsRemaining ? (
                  <Text style={styles.verdictRequirement}>+ {verdictsRemaining} VERDICTS</Text>
                ) : null}
              </>
            ) : (
              <>
                <Text numberOfLines={1} style={styles.nextGrade}>SOMMET</Text>
                <Text style={[styles.threshold, { color: currentAccent }]}>ATTEINT</Text>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function formatNumber(value: number) {
  return NUMBER_FORMATTER.format(Number(value || 0));
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  header: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eyebrow: {
    fontFamily: fonts.displayBold,
    color: '#58C0DB',
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: 0.55,
  },
  journeyAction: {
    minHeight: 32,
    paddingLeft: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  journeyActionText: {
    fontFamily: fonts.displayBold,
    color: '#58C0DB',
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.45,
  },
  journeyActionArrow: {
    color: '#58C0DB',
    fontFamily: fonts.bold,
    fontSize: 19,
    lineHeight: 20,
  },
  horizon: {
    position: 'relative',
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.lg,
    backgroundColor: 'rgba(4,15,24,.68)',
    borderWidth: 1,
    borderColor: 'rgba(46,78,96,.34)',
    boxShadow: '0 14px 34px rgba(0,0,0,.3)',
  },
  horizonCompact: {
    minHeight: 104,
  },
  gradePanel: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextPanel: {
    opacity: 0.82,
  },
  emblemHalo: {
    width: 88,
    height: 88,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 44,
    backgroundColor: 'rgba(5,17,26,.72)',
    borderWidth: 1,
  },
  emblemHaloCompact: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  nextHalo: {
    borderColor: 'rgba(83,132,157,.38)',
    boxShadow: 'none',
  },
  gradeCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 4,
  },
  gradeLine: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  currentGrade: {
    flexShrink: 1,
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  nextGrade: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontFamily: fonts.display,
    fontSize: 15,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  separator: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  status: {
    flexShrink: 0,
    fontFamily: fonts.displayBold,
    fontSize: 12,
    lineHeight: 15,
  },
  nextStatus: {
    flexShrink: 0,
    color: colors.textMuted,
    fontFamily: fonts.displayBold,
    fontSize: 10,
    lineHeight: 13,
  },
  threshold: {
    ...typography.eyebrow,
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.45,
    fontVariant: ['tabular-nums'],
  },
  verdictRequirement: {
    ...typography.eyebrow,
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 0.35,
    fontVariant: ['tabular-nums'],
  },
  connector: {
    position: 'absolute',
    zIndex: 3,
    top: '50%',
    left: '50%',
    width: 28,
    height: 10,
    marginTop: -5,
    marginLeft: -14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectorLine: {
    height: 1,
    flex: 1,
    backgroundColor: 'rgba(96,136,157,.22)',
  },
  connectorDiamond: {
    width: 9,
    height: 9,
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#07131C',
    borderWidth: 1,
  },
  summitGlyph: {
    fontSize: 25,
  },
  pressed: {
    opacity: 0.68,
  },
});
