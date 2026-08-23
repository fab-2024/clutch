import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClutchHeader } from '@/src/components/layout/ClutchHeader';
import { Screen } from '@/src/components/layout/Screen';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import { loadRankDashboard } from '../api';
import {
  gradeAccent,
  SEASONAL_GRADE_LADDER,
  type SeasonalGradeDefinition,
  type SeasonalGradeState,
} from '../grades';
import type {
  RankDashboard,
  RankLeaderboardRow,
  RankMovement,
  RankRules,
  RankScope,
} from '../types';
import { RankEmblem } from './RankEmblem';

type Section = 'season' | 'leaderboards' | 'rewards';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'season', label: 'Ma saison' },
  { key: 'leaderboards', label: 'Classements' },
  { key: 'rewards', label: 'Récompenses' },
];

const SCOPES: { key: RankScope; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'cercle', label: 'Cercle' },
  { key: 'faction', label: 'Faction' },
];

export default function RankScreen({ previewData }: { previewData?: RankDashboard }) {
  const [dashboard, setDashboard] = useState<RankDashboard | null>(previewData ?? null);
  const [section, setSection] = useState<Section>('season');
  const [scope, setScope] = useState<RankScope>('global');
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (previewData) {
      setDashboard(previewData);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setDashboard(await loadRankDashboard());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de charger Rank.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [previewData]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (previewData) return;
    const day = new Date().toISOString().slice(0, 10);
    void trackAnalyticsEvent({ type: 'rank_consulte', idempotencyKey: 'rank:' + day }).catch(() => undefined);
  }, [previewData]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
        showsVerticalScrollIndicator={false}
      >
        <ClutchHeader />

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>RANK // SAISON</Text>
          <Text style={styles.title}>LAISSE TA TRACE.</Text>
          <Text style={styles.subtitle}>Ton rating Frags mesure ta saison. Les Volts restent un solde cosmétique séparé.</Text>
        </View>

        <View accessibilityRole="tablist" style={styles.tabs}>
          {SECTIONS.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: section === item.key }}
              onPress={() => setSection(item.key)}
              style={[styles.tab, section === item.key && styles.tabActive]}
            >
              <Text style={[styles.tabText, section === item.key && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void load()}>
              <Text style={styles.retry}>RÉESSAYER</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? <RankSkeleton /> : null}
        {!loading && dashboard && section === 'season' ? <SeasonSection dashboard={dashboard} /> : null}
        {!loading && dashboard && section === 'leaderboards' ? (
          <LeaderboardSection dashboard={dashboard} scope={scope} onScope={setScope} />
        ) : null}
        {!loading && dashboard && section === 'rewards' ? <RewardsSection dashboard={dashboard} /> : null}
      </ScrollView>
    </Screen>
  );
}

function SeasonSection({ dashboard }: { dashboard: RankDashboard }) {
  const [showRules, setShowRules] = useState(false);
  const state = dashboard.state;

  if (!dashboard.season || !state) {
    return <EmptyState title="INTERSAISON." copy="La prochaine saison réactivera les Frags, placements et classements." />;
  }

  const accent = gradeAccent(state.grade);
  const placementTarget = state.grade.objectif_placements;
  const completed = Math.max(0, placementTarget - state.placementsRemaining);
  const progress = state.provisional ? completed / placementTarget : state.grade.progression;
  const progressWidth = (Math.max(2, Math.round(progress * 100)) + '%') as `${number}%`;
  const accuracy = state.settledCalls ? Math.round((state.wonCalls / state.settledCalls) * 100) : 0;
  const next = nextMilestone(state.frags, state.grade);

  return (
    <View style={styles.sectionStack}>
      <View style={[styles.seasonHero, { borderColor: accent + '66' }]}>
        <View style={[styles.heroAura, { backgroundColor: accent }]} />
        <View style={styles.seasonHeading}>
          <View>
            <Text style={[styles.seasonKicker, { color: accent }]}>{dashboard.season.name.toUpperCase()}</Text>
            <Text style={styles.seasonLabel}>RATING DE SAISON</Text>
          </View>
          <Pressable
            accessibilityLabel="Afficher les règles du rating"
            accessibilityRole="button"
            onPress={() => setShowRules((visible) => !visible)}
            style={({ pressed }) => [styles.infoButton, { borderColor: accent + '55' }, pressed && styles.pressed]}
          >
            <Text style={[styles.infoGlyph, { color: accent }]}>i</Text>
          </Pressable>
        </View>

        <View style={styles.emblemStage}>
          <RankEmblem grade={state.grade} placement={state.provisional} size={136} />
          <Text style={styles.gradeName}>
            {state.provisional ? 'PLACEMENT' : state.grade.libelle?.toUpperCase() || 'NON CLASSÉ'}
          </Text>
        </View>

        <View style={styles.ratingRow}>
          <Text style={styles.rating}>{formatNumber(state.frags)}</Text>
          <View style={styles.ratingCopy}>
            <Text style={[styles.ratingUnit, { color: accent }]}>FRAGS</Text>
            <Text style={styles.ratingMeaning}>RATING</Text>
          </View>
        </View>

        {state.provisional ? (
          <PlacementProgress complete={completed} target={placementTarget} accent={accent} />
        ) : (
          <>
            <View style={styles.nextRow}>
              <Text style={styles.next}>{next.toUpperCase()}</Text>
              <Text style={[styles.progressPercent, { color: accent }]}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.trackFill, { width: progressWidth, backgroundColor: accent }]} />
            </View>
          </>
        )}

        <View style={styles.heroMetrics}>
          <Metric label="GLOBAL" value={state.provisional ? '—' : state.rank ? '#' + state.rank : '—'} />
          <Metric label="PRÉCISION" value={state.settledCalls ? accuracy + '%' : '—'} />
          <Metric label="RECORD" value={formatNumber(state.peakFrags)} />
        </View>
      </View>

      {showRules ? <RulesCard rules={dashboard.rules} /> : null}

      <RecentMovements movements={dashboard.recentMovements} />

      <View style={styles.recordCard}>
        <View style={styles.cardHeading}>
          <View>
            <Text style={styles.cardEyebrow}>TRACE DE SAISON</Text>
            <Text style={styles.cardTitle}>Ton meilleur passage reste inscrit.</Text>
          </View>
          <Text style={[styles.recordAccent, { color: accent }]}>◆</Text>
        </View>
        <View style={styles.recordRow}>
          <Metric label="MEILLEUR GRADE" value={state.bestGrade?.libelle?.toUpperCase() || state.grade.libelle?.toUpperCase() || '—'} />
          <Metric label="MEILLEUR RANG" value={state.bestRank ? '#' + state.bestRank : '—'} />
          <Metric label="CLASSÉS" value={formatNumber(state.classifiedPlayers)} />
        </View>
      </View>
    </View>
  );
}

function PlacementProgress({ complete, target, accent }: { complete: number; target: number; accent: string }) {
  return (
    <View style={styles.placementBlock}>
      <View accessibilityLabel={complete + ' placements terminés sur ' + target} style={styles.placementDots}>
        {Array.from({ length: target }, (_, index) => (
          <View
            key={index}
            style={[
              styles.placementDot,
              {
                backgroundColor: index < complete ? accent : 'transparent',
                borderColor: index < complete ? accent : '#4B5660',
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.next}>{Math.max(0, target - complete)} VERDICTS AVANT LA RÉVÉLATION</Text>
    </View>
  );
}

function RulesCard({ rules }: { rules: RankRules }) {
  return (
    <View style={styles.rulesCard}>
      <View style={styles.cardHeading}>
        <View>
          <Text style={styles.cardEyebrow}>RÈGLES DU RATING</Text>
          <Text style={styles.cardTitle}>Simple à lire, impossible à acheter.</Text>
        </View>
        <Text style={styles.rulesVersion}>V1</Text>
      </View>
      <View style={styles.rulesGrid}>
        <RuleItem label="BASE" value={formatNumber(rules.base)} />
        <RuleItem label="PLACEMENTS" value={String(rules.placements)} />
        <RuleItem label="K PLACEMENT" value={String(rules.placementK)} />
        <RuleItem label="K CLASSÉ" value={String(rules.rankedK)} />
      </View>
      <Text style={styles.rulesNote}>Le mouvement est calculé au verdict avec la difficulté du call figée à sa fermeture.</Text>
    </View>
  );
}

function RuleItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.ruleItem}>
      <Text style={styles.ruleValue}>{value}</Text>
      <Text style={styles.ruleLabel}>{label}</Text>
    </View>
  );
}

function RecentMovements({ movements }: { movements: RankMovement[] }) {
  return (
    <View style={styles.movementCard}>
      <View style={styles.cardHeading}>
        <View>
          <Text style={styles.cardEyebrow}>DERNIERS MOUVEMENTS</Text>
          <Text style={styles.cardTitle}>Chaque verdict laisse une trace.</Text>
        </View>
        <Text style={styles.movementCount}>{movements.length}</Text>
      </View>
      {movements.length ? (
        <View style={styles.movementList}>
          {movements.map((movement) => <MovementRow key={movement.id} movement={movement} />)}
        </View>
      ) : (
        <Text style={styles.emptyCopy}>Tes prochains verdicts réglés apparaîtront ici.</Text>
      )}
    </View>
  );
}

function MovementRow({ movement }: { movement: RankMovement }) {
  const won = movement.status === 'gagne';
  return (
    <View style={styles.movementRow}>
      <View style={[styles.movementSignal, won ? styles.movementWon : styles.movementLost]} />
      <View style={styles.movementIdentity}>
        <Text style={styles.movementMatch}>{movement.teamA} <Text style={styles.movementVs}>VS</Text> {movement.teamB}</Text>
        <Text style={styles.movementStatus}>{won ? 'BON CALL' : 'CALL MANQUÉ'}{movement.game ? ' · ' + movement.game.toUpperCase() : ''}</Text>
      </View>
      <Text style={[styles.movementDelta, won ? styles.deltaWon : styles.deltaLost]}>
        {movement.deltaFrags > 0 ? '+' : ''}{movement.deltaFrags}
      </Text>
    </View>
  );
}

function LeaderboardSection({
  dashboard,
  scope,
  onScope,
}: {
  dashboard: RankDashboard;
  scope: RankScope;
  onScope: (scope: RankScope) => void;
}) {
  const rows = dashboard.leaderboards[scope];
  const me = rows.find((row) => row.me) ?? null;
  const scopeLabel = SCOPES.find((item) => item.key === scope)?.label ?? scope;

  return (
    <View style={styles.sectionStack}>
      <View accessibilityRole="tablist" style={styles.scopeTabs}>
        {SCOPES.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: scope === item.key }}
            onPress={() => onScope(item.key)}
            style={[styles.scopeTab, scope === item.key && styles.scopeTabActive]}
          >
            <Text style={[styles.scopeText, scope === item.key && styles.scopeTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {me ? <MyPositionCard row={me} scope={scopeLabel} /> : null}
      {!me && scope === 'global' && dashboard.state?.provisional ? (
        <View style={styles.placementNotice}>
          <RankEmblem placement size={42} />
          <View style={styles.placementNoticeCopy}>
            <Text style={styles.placementNoticeTitle}>TA PLACE EST EN CONSTRUCTION</Text>
            <Text style={styles.emptyCopy}>{dashboard.state.placementsRemaining} verdicts avant ton entrée dans le Global.</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.board}>
        {rows.map((row) => <LeaderboardRow key={row.id} row={row} />)}
        {!rows.length ? (
          <Text style={styles.emptyBoard}>
            {scope === 'cercle'
              ? 'Ajoute des amis pour créer ton classement de Cercle.'
              : scope === 'faction'
                ? 'Choisis une faction pour rejoindre ce classement.'
                : 'Aucun joueur classé pour le moment.'}
          </Text>
        ) : null}
      </View>
      <Text style={styles.boardRule}>TRIÉ PAR FRAGS · PRÉCISION UTILISÉE UNIQUEMENT EN CAS D’ÉGALITÉ</Text>
    </View>
  );
}

function MyPositionCard({ row, scope }: { row: RankLeaderboardRow; scope: string }) {
  const accent = gradeAccent(row.grade);
  const accuracy = row.settledCalls ? Math.round((row.wonCalls / row.settledCalls) * 100) : 0;

  return (
    <View style={[styles.meCard, { borderColor: accent + '88', backgroundColor: accent + '14' }]}>
      <View style={[styles.meAura, { backgroundColor: accent }]} />
      <RankEmblem grade={row.grade} placement={row.provisional} size={84} />
      <View style={styles.meIdentity}>
        <Text style={[styles.meEyebrow, { color: accent }]}>TA POSITION</Text>
        <Text style={styles.meGrade}>{row.provisional ? 'PLACEMENT' : row.grade.libelle?.toUpperCase() || 'CLASSÉ'}</Text>
        <Text style={styles.meMeta}>
          {row.provisional
            ? row.settledCalls + '/' + row.grade.objectif_placements + ' PLACEMENTS'
            : formatNumber(row.frags) + ' FRAGS · ' + accuracy + '% PRÉCISION'}
        </Text>
      </View>
      <View style={styles.meRankBlock}>
        <Text style={[styles.meRank, { color: accent }]}>{row.provisional ? '—' : row.rank ? '#' + row.rank : '—'}</Text>
        <Text style={styles.meScope}>{scope.toUpperCase()}</Text>
      </View>
    </View>
  );
}

function LeaderboardRow({ row }: { row: RankLeaderboardRow }) {
  const accent = gradeAccent(row.grade);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/u/[pseudo]', params: { pseudo: row.pseudo } })}
      style={({ pressed }) => [styles.boardRow, row.me && styles.boardRowMe, pressed && styles.pressed]}
    >
      <Text style={[styles.boardRank, row.me && styles.boardRankMe]}>
        {row.provisional ? '—' : row.rank ? String(row.rank) : '—'}
      </Text>
      <RankEmblem grade={row.grade} placement={row.provisional} size={46} />
      <View style={styles.boardIdentity}>
        <Text numberOfLines={1} style={styles.boardPseudo}>{row.pseudo}{row.me ? ' · TOI' : ''}</Text>
        <Text style={[styles.boardGrade, { color: row.provisional ? colors.textMuted : accent }]}>
          {row.provisional
            ? row.settledCalls + '/' + row.grade.objectif_placements + ' PLACEMENTS'
            : row.grade.libelle?.toUpperCase() || 'CLASSÉ'}
        </Text>
      </View>
      <View style={styles.boardScore}>
        <Text style={styles.boardFrags}>{formatNumber(row.frags)}</Text>
        <Text style={styles.boardUnit}>FRAGS</Text>
      </View>
    </Pressable>
  );
}

function RewardsSection({ dashboard }: { dashboard: RankDashboard }) {
  const state = dashboard.state;
  const bestOrder = Number(state?.bestGrade?.ordre ?? (state?.provisional ? -1 : state?.grade.ordre ?? -1));

  return (
    <View style={styles.sectionStack}>
      <View style={styles.rewardIntro}>
        <View style={styles.rewardIntroMark}>
          <RankEmblem grade={state?.bestGrade ?? state?.grade} placement={!state || state.provisional} size={104} />
        </View>
        <View style={styles.rewardIntroCopy}>
          <Text style={styles.cardEyebrow}>MEILLEUR GRADE ATTEINT</Text>
          <Text style={styles.rewardTitle}>{state?.bestGrade?.libelle?.toUpperCase() || state?.grade.libelle?.toUpperCase() || 'À RÉVÉLER'}</Text>
          <Text style={styles.rewardCopy}>{dashboard.reward.detail}</Text>
        </View>
      </View>

      <View style={styles.ladder}>
        {SEASONAL_GRADE_LADDER.map((grade, index) => (
          <RewardTier
            key={grade.key}
            grade={grade}
            last={index === SEASONAL_GRADE_LADDER.length - 1}
            state={grade.minimum <= (state?.frags ?? 0) && Number(state?.grade.ordre ?? -1) === index ? 'current' : index <= bestOrder ? 'unlocked' : 'locked'}
          />
        ))}
      </View>

      <View style={styles.conservationCard}>
        <Text style={styles.cardEyebrow}>FIN DE SAISON</Text>
        <Text style={styles.cardTitle}>Ton rating repart. Ta marque reste.</Text>
        <Text style={styles.cardCopy}>La récompense dépend du meilleur grade atteint. XP, objets, badges historiques et records restent sur ton profil.</Text>
      </View>
    </View>
  );
}

function RewardTier({
  grade,
  state,
  last,
}: {
  grade: SeasonalGradeDefinition;
  state: 'locked' | 'unlocked' | 'current';
  last: boolean;
}) {
  const visible = state !== 'locked';
  const gradeState = {
    classe: true,
    objectif_placements: 5,
    placements_restants: 0,
    progression: visible ? 1 : 0,
    cle: grade.key,
    libelle: grade.label,
    ordre: SEASONAL_GRADE_LADDER.indexOf(grade),
    minimum: grade.minimum,
  };

  return (
    <View style={styles.tierLine}>
      <View style={styles.tierRail}>
        <View style={[styles.tierNode, { borderColor: grade.accent, backgroundColor: visible ? grade.accent : '#0B1015' }]} />
        {!last ? <View style={[styles.tierConnector, visible && { backgroundColor: grade.accent + '66' }]} /> : null}
      </View>
      <View
        style={[
          styles.tierCard,
          { borderColor: state === 'current' ? grade.accent + 'AA' : grade.accent + '35' },
          state === 'current' && { backgroundColor: grade.accent + '10' },
          state === 'locked' && styles.tierLocked,
        ]}
      >
        <RankEmblem grade={gradeState} size={72} />
        <View style={styles.tierCopy}>
          <View style={styles.tierTitleRow}>
            <Text style={[styles.tierGrade, { color: grade.accent }]}>{grade.label.toUpperCase()}</Text>
            <Text style={styles.tierThreshold}>
              {gradeRange(grade)}
            </Text>
          </View>
          <Text style={styles.tierReward}>{grade.rewardType} · {grade.rewardName}</Text>
          <Text style={styles.tierDetail}>{grade.rewardDetail}</Text>
        </View>
        <Text style={[styles.tierStatus, state !== 'locked' && { color: grade.accent }]}>
          {state === 'current' ? 'ACTUEL' : state === 'unlocked' ? 'ACQUIS' : 'VERROUILLÉ'}
        </Text>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardCopy}>{copy}</Text>
    </View>
  );
}

function RankSkeleton() {
  return (
    <View style={styles.skeleton}>
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonEmblem} />
      <View style={styles.skeletonMetric} />
      <View style={styles.skeletonLine} />
    </View>
  );
}

function nextMilestone(frags: number, grade: SeasonalGradeState) {
  if (!grade.prochain_libelle) return 'Palier saisonnier maximal atteint';
  const missingFrags = Math.max(0, Number(grade.prochain_minimum ?? frags) - frags);
  const missingCalls = Math.max(0, Number(grade.prochains_pronostics_restants ?? 0));
  if (missingFrags > 0 && missingCalls > 0) {
    return missingFrags + ' Frags et ' + missingCalls + ' verdicts avant ' + grade.prochain_libelle;
  }
  if (missingCalls > 0) return missingCalls + ' verdicts avant ' + grade.prochain_libelle;
  return missingFrags + ' Frags avant ' + grade.prochain_libelle;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

function gradeRange(grade: SeasonalGradeDefinition) {
  if (grade.key === 'mythique') return '1 650+ · 30 VERDICTS';
  return formatNumber(grade.minimum) + '–' + formatNumber(grade.maximum ?? grade.minimum) + ' FRAGS';
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingBottom: layout.tabBarContentInset,
    gap: 17,
  },
  intro: {
    marginHorizontal: spacing.md,
    gap: 7,
  },
  eyebrow: {
    ...typography.eyebrow,
    color: colors.volt,
    letterSpacing: 1,
  },
  title: {
    ...typography.displayLarge,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    maxWidth: 390,
    color: colors.textMuted,
  },
  tabs: {
    marginHorizontal: spacing.md,
    padding: 4,
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: '#0B1015',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    minHeight: 43,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  tabActive: {
    backgroundColor: colors.volt,
  },
  tabText: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 12,
  },
  tabTextActive: {
    color: '#080A0C',
  },
  error: {
    marginHorizontal: spacing.md,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: radius.md,
    backgroundColor: '#1A1012',
    borderWidth: 1,
    borderColor: '#4A2027',
  },
  errorText: {
    ...typography.body,
    flex: 1,
    color: '#FF9AA2',
  },
  retry: {
    ...typography.action,
    color: colors.volt,
  },
  sectionStack: {
    gap: 13,
    marginHorizontal: spacing.md,
  },
  seasonHero: {
    position: 'relative',
    minHeight: 520,
    padding: 18,
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: '#090E13',
    borderWidth: 1,
  },
  heroAura: {
    position: 'absolute',
    top: -250,
    alignSelf: 'center',
    width: 500,
    height: 500,
    borderRadius: 250,
    opacity: 0.12,
  },
  seasonHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seasonKicker: {
    ...typography.eyebrow,
    letterSpacing: 0.8,
  },
  seasonLabel: {
    ...typography.label,
    marginTop: 3,
    color: colors.textMuted,
  },
  infoButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#080C10',
    borderWidth: 1,
  },
  infoGlyph: {
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  emblemStage: {
    marginTop: 16,
    alignItems: 'center',
  },
  gradeName: {
    ...typography.displayMedium,
    marginTop: 2,
    color: colors.text,
    textAlign: 'center',
  },
  ratingRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 9,
  },
  rating: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 67,
    lineHeight: 69,
    letterSpacing: -3,
    fontVariant: ['tabular-nums'],
  },
  ratingCopy: {
    marginBottom: 9,
  },
  ratingUnit: {
    ...typography.label,
  },
  ratingMeaning: {
    ...typography.eyebrow,
    marginTop: 1,
    color: colors.textMuted,
  },
  placementBlock: {
    marginTop: 19,
    alignItems: 'center',
    gap: 10,
  },
  placementDots: {
    flexDirection: 'row',
    gap: 9,
  },
  placementDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  nextRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  next: {
    ...typography.label,
    flex: 1,
    color: colors.textSubtle,
  },
  progressPercent: {
    ...typography.label,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 7,
    marginTop: 9,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: '#222A32',
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
  },
  heroMetrics: {
    minHeight: 69,
    marginTop: 'auto',
    paddingTop: 16,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#273039',
  },
  metric: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    ...typography.metricSmall,
    color: colors.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    ...typography.eyebrow,
    marginTop: 3,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cardHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardEyebrow: {
    ...typography.eyebrow,
    color: colors.volt,
  },
  cardTitle: {
    ...typography.cardTitle,
    marginTop: 4,
    color: colors.text,
  },
  cardCopy: {
    ...typography.body,
    color: colors.textMuted,
  },
  rulesCard: {
    padding: 17,
    gap: 13,
    borderRadius: 24,
    backgroundColor: '#10160E',
    borderWidth: 1,
    borderColor: '#3B471D',
  },
  rulesVersion: {
    ...typography.eyebrow,
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: '#080A0C',
    borderRadius: 10,
    backgroundColor: colors.volt,
    overflow: 'hidden',
  },
  rulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ruleItem: {
    width: '48.8%',
    minHeight: 67,
    padding: 11,
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: '#080D0A',
    borderWidth: 1,
    borderColor: '#2D3820',
  },
  ruleValue: {
    ...typography.metricSmall,
    color: colors.text,
  },
  ruleLabel: {
    ...typography.eyebrow,
    marginTop: 3,
    color: colors.textMuted,
  },
  rulesNote: {
    ...typography.body,
    color: colors.textMuted,
  },
  movementCard: {
    padding: 17,
    gap: 12,
    borderRadius: 24,
    backgroundColor: '#0B1015',
    borderWidth: 1,
    borderColor: colors.border,
  },
  movementCount: {
    minWidth: 30,
    paddingHorizontal: 8,
    paddingVertical: 5,
    color: colors.text,
    fontFamily: fonts.bold,
    textAlign: 'center',
    borderRadius: 11,
    backgroundColor: '#171F27',
    overflow: 'hidden',
  },
  movementList: {
    overflow: 'hidden',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#202A33',
  },
  movementRow: {
    minHeight: 67,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#080D12',
    borderBottomWidth: 1,
    borderBottomColor: '#1C242C',
  },
  movementSignal: {
    width: 5,
    height: 29,
    borderRadius: 3,
  },
  movementWon: {
    backgroundColor: colors.volt,
  },
  movementLost: {
    backgroundColor: '#FF6978',
  },
  movementIdentity: {
    flex: 1,
    minWidth: 0,
  },
  movementMatch: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  movementVs: {
    color: colors.textMuted,
    fontSize: 10,
  },
  movementStatus: {
    ...typography.eyebrow,
    marginTop: 3,
    color: colors.textMuted,
  },
  movementDelta: {
    fontFamily: fonts.display,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
  },
  deltaWon: {
    color: colors.volt,
  },
  deltaLost: {
    color: '#FF7E8A',
  },
  emptyCopy: {
    ...typography.body,
    color: colors.textMuted,
  },
  recordCard: {
    padding: 17,
    gap: 13,
    borderRadius: 24,
    backgroundColor: '#0B1015',
    borderWidth: 1,
    borderColor: colors.border,
  },
  recordAccent: {
    fontSize: 19,
  },
  recordRow: {
    minHeight: 70,
    flexDirection: 'row',
  },
  scopeTabs: {
    padding: 4,
    flexDirection: 'row',
    borderRadius: 17,
    backgroundColor: '#0B1015',
    borderWidth: 1,
    borderColor: colors.border,
  },
  scopeTab: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  scopeTabActive: {
    backgroundColor: '#1B2412',
  },
  scopeText: {
    ...typography.label,
    color: colors.textMuted,
  },
  scopeTextActive: {
    color: colors.volt,
  },
  meCard: {
    position: 'relative',
    minHeight: 126,
    padding: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 24,
    borderWidth: 1,
  },
  meAura: {
    position: 'absolute',
    top: -90,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.1,
  },
  meIdentity: {
    flex: 1,
    minWidth: 0,
  },
  meEyebrow: {
    ...typography.eyebrow,
  },
  meGrade: {
    ...typography.cardTitle,
    marginTop: 3,
    color: colors.text,
  },
  meMeta: {
    ...typography.eyebrow,
    marginTop: 4,
    color: colors.textMuted,
  },
  meRankBlock: {
    alignItems: 'flex-end',
  },
  meRank: {
    fontFamily: fonts.display,
    fontSize: 38,
    lineHeight: 40,
    fontVariant: ['tabular-nums'],
  },
  meScope: {
    ...typography.eyebrow,
    marginTop: 2,
    color: colors.textMuted,
  },
  placementNotice: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 20,
    backgroundColor: '#0B1015',
    borderWidth: 1,
    borderColor: '#303A43',
  },
  placementNoticeCopy: {
    flex: 1,
    gap: 3,
  },
  placementNoticeTitle: {
    ...typography.label,
    color: colors.text,
  },
  board: {
    overflow: 'hidden',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boardRow: {
    minHeight: 75,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0B1015',
    borderBottomWidth: 1,
    borderBottomColor: '#1C242C',
  },
  boardRowMe: {
    backgroundColor: '#11170E',
  },
  boardRank: {
    width: 28,
    color: colors.textMuted,
    fontFamily: fonts.display,
    fontSize: 20,
    textAlign: 'center',
  },
  boardRankMe: {
    color: colors.volt,
  },
  boardIdentity: {
    flex: 1,
    minWidth: 0,
  },
  boardPseudo: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  boardGrade: {
    ...typography.eyebrow,
    marginTop: 3,
  },
  boardScore: {
    alignItems: 'flex-end',
  },
  boardFrags: {
    ...typography.metricSmall,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  boardUnit: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  emptyBoard: {
    ...typography.body,
    padding: 18,
    color: colors.textMuted,
    backgroundColor: '#0B1015',
  },
  boardRule: {
    ...typography.eyebrow,
    color: colors.textSubtle,
    textAlign: 'center',
  },
  rewardIntro: {
    minHeight: 180,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 28,
    backgroundColor: '#0A0F13',
    borderWidth: 1,
    borderColor: '#3C4720',
  },
  rewardIntroMark: {
    width: 94,
    alignItems: 'center',
  },
  rewardIntroCopy: {
    flex: 1,
    minWidth: 0,
  },
  rewardTitle: {
    ...typography.displayMedium,
    marginTop: 4,
    color: colors.text,
  },
  rewardCopy: {
    ...typography.body,
    marginTop: 7,
    color: colors.textMuted,
  },
  ladder: {
    paddingTop: 4,
  },
  tierLine: {
    minHeight: 132,
    flexDirection: 'row',
  },
  tierRail: {
    width: 23,
    alignItems: 'center',
  },
  tierNode: {
    width: 11,
    height: 11,
    marginTop: 28,
    zIndex: 1,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  tierConnector: {
    position: 'absolute',
    top: 39,
    bottom: -1,
    width: 1,
    backgroundColor: '#28323B',
  },
  tierCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 116,
    marginBottom: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 21,
    backgroundColor: '#0B1015',
    borderWidth: 1,
  },
  tierLocked: {
    opacity: 0.58,
  },
  tierCopy: {
    flex: 1,
    minWidth: 0,
  },
  tierTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  tierGrade: {
    ...typography.label,
  },
  tierThreshold: {
    ...typography.eyebrow,
    color: colors.textMuted,
    textAlign: 'right',
  },
  tierReward: {
    ...typography.bodyStrong,
    marginTop: 5,
    color: colors.text,
  },
  tierDetail: {
    ...typography.eyebrow,
    marginTop: 4,
    color: colors.textMuted,
  },
  tierStatus: {
    ...typography.eyebrow,
    position: 'absolute',
    top: 10,
    right: 10,
    color: colors.textSubtle,
  },
  conservationCard: {
    padding: 18,
    gap: 6,
    borderRadius: 24,
    backgroundColor: '#10160E',
    borderWidth: 1,
    borderColor: '#3B471D',
  },
  emptyState: {
    marginHorizontal: spacing.md,
    padding: 20,
    gap: 8,
    borderRadius: 24,
    backgroundColor: '#0B1015',
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeleton: {
    minHeight: 520,
    marginHorizontal: spacing.md,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 30,
    backgroundColor: '#0D1218',
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonLine: {
    width: '58%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1A222A',
  },
  skeletonEmblem: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#161E26',
  },
  skeletonMetric: {
    width: '72%',
    height: 78,
    borderRadius: 18,
    backgroundColor: '#161E26',
  },
  pressed: {
    opacity: 0.72,
  },
});
