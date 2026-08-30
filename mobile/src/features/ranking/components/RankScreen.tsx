import { router } from 'expo-router';
import { memo, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import { FEATURE_STATE_COPY, FeatureStateView } from '@/src/components/ui/FeatureStateView';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import ProfileHeaderButton from '@/src/features/profile/components/ProfileHeaderButton';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import { loadRankDashboard } from '../api';
import {
  gradeAccent,
  isZeroRank,
  SEASONAL_GRADE_LADDER,
  type SeasonalGradeDefinition,
  ZERO_RANK_ACCENT,
} from '../grades';
import type {
  RankDashboard,
  RankLeaderboardRow,
  RankMovement,
  RankRules,
  RankScope,
} from '../types';
import { RankEmblem } from './RankEmblem';
import { RankSnapshot } from './RankSnapshot';
import { SeasonJourneyCard } from './SeasonJourneyCard';

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
const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');

type RankScreenProps = {
  previewData?: RankDashboard;
  previewReduceMotion?: boolean;
};

export default function RankScreen({ previewData, previewReduceMotion }: RankScreenProps) {
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

  const header = (
    <RankHeader
      dashboard={dashboard}
      error={error}
      loading={loading}
      onRetry={() => void load()}
      onSection={setSection}
      preview={Boolean(previewData)}
      section={section}
    />
  );

  if (!loading && dashboard && section === 'leaderboards') {
    return (
      <Screen>
        <LeaderboardList
          dashboard={dashboard}
          header={header}
          onRefresh={() => void load(true)}
          onScope={setScope}
          refreshing={refreshing}
          scope={scope}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
        showsVerticalScrollIndicator={false}
      >
        {header}

        {loading ? <RankSkeleton /> : null}
        {!loading && dashboard && section === 'season' ? (
          <SeasonSection dashboard={dashboard} reduceMotionOverride={previewReduceMotion} />
        ) : null}
        {!loading && dashboard && section === 'rewards' ? <RewardsSection dashboard={dashboard} /> : null}
      </ScrollView>
    </Screen>
  );
}

function RankHeader({
  dashboard,
  error,
  loading,
  onRetry,
  onSection,
  preview,
  section,
}: {
  dashboard: RankDashboard | null;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
  onSection: (section: Section) => void;
  preview: boolean;
  section: Section;
}) {
  const compact = useWindowDimensions().width <= 340;

  return (
    <View style={styles.headerStack}>
      <GriffHeader leading={<ProfileHeaderButton preview={preview} />} variant="wallet" />

      <View style={styles.intro}>
        <Text style={styles.eyebrow}>RANK // SAISON</Text>
        <Text style={styles.title}>SUIS TA SAISON.</Text>
        <Text style={styles.subtitle}>Ton rating Frags mesure ta saison. Les Volts restent un solde cosmétique séparé.</Text>
      </View>

      {loading ? <RankSnapshotSkeleton /> : dashboard?.state ? (
        <RankSnapshot seasonName={dashboard.season?.name} state={dashboard.state} />
      ) : null}

      <View accessibilityRole="tablist" style={styles.tabs}>
        {SECTIONS.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === item.key }}
            onPress={() => onSection(item.key)}
            style={[styles.tab, section === item.key && styles.tabActive]}
          >
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.68}
              numberOfLines={1}
              style={[
                styles.tabText,
                compact && styles.tabTextCompact,
                section === item.key && styles.tabTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <FeatureStateView
          compact
          domain="rank"
          onRetry={onRetry}
          presentation="inline"
          style={styles.stateInset}
          testID="rank-error-state"
          variant="error"
        />
      ) : null}
    </View>
  );
}

function SeasonSection({
  dashboard,
  reduceMotionOverride,
}: {
  dashboard: RankDashboard;
  reduceMotionOverride?: boolean;
}) {
  const [showRules, setShowRules] = useState(false);
  const state = dashboard.state;

  if (!dashboard.season || !state) {
    return <EmptyState title="INTERSAISON." copy="La prochaine saison réactivera les Frags et les classements." />;
  }

  const accent = isZeroRank(state.frags) ? ZERO_RANK_ACCENT : gradeAccent(state.grade);

  return (
    <View style={styles.sectionStack}>
      <SeasonJourneyCard
        onChooseMatch={() => router.push('/(tabs)/matches')}
        onToggleRules={() => setShowRules((visible) => !visible)}
        reduceMotionOverride={reduceMotionOverride}
        rules={dashboard.rules}
        rulesVisible={showRules}
        season={dashboard.season}
        state={state}
      />

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
        <RuleItem label="DÉPART" value={formatNumber(rules.base)} />
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

function LeaderboardList({
  dashboard,
  header,
  onRefresh,
  scope,
  onScope,
  refreshing,
}: {
  dashboard: RankDashboard;
  header: ReactNode;
  onRefresh: () => void;
  scope: RankScope;
  onScope: (scope: RankScope) => void;
  refreshing: boolean;
}) {
  const rows = dashboard.leaderboards[scope];
  const me = rows.find((row) => row.me) ?? null;
  const scopeLabel = SCOPES.find((item) => item.key === scope)?.label ?? scope;
  const renderRow = useCallback(({ index, item }: ListRenderItemInfo<RankLeaderboardRow>) => (
    <LeaderboardRow
      first={index === 0}
      last={index === rows.length - 1}
      row={item}
    />
  ), [rows.length]);

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={rows}
      initialNumToRender={10}
      keyExtractor={(row) => row.id}
      ListEmptyComponent={<LeaderboardEmpty scope={scope} />}
      ListFooterComponent={(
        <Text style={styles.boardRule}>TRIÉ PAR FRAGS · PRÉCISION UTILISÉE UNIQUEMENT EN CAS D’ÉGALITÉ</Text>
      )}
      ListHeaderComponent={(
        <>
          {header}
          <View style={styles.leaderboardHeader}>
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

            <View style={styles.boardHeading}>
              <View>
                <Text style={styles.cardEyebrow}>LADDER · {scopeLabel.toUpperCase()}</Text>
                <Text style={styles.cardTitle}>LE CLASSEMENT.</Text>
              </View>
              <Text style={styles.boardCount}>{rows.length}</Text>
            </View>
          </View>
        </>
      )}
      maxToRenderPerBatch={10}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.volt} />}
      removeClippedSubviews
      renderItem={renderRow}
      showsVerticalScrollIndicator={false}
      testID="rank-leaderboard-list"
      windowSize={7}
    />
  );
}

function LeaderboardEmpty({ scope }: { scope: RankScope }) {
  const copy = scope === 'cercle'
    ? 'Ajoute des amis pour créer ton classement de Cercle.'
    : scope === 'faction'
      ? 'Choisis une faction pour rejoindre ce classement.'
      : 'Les premiers joueurs classés apparaîtront après leur prochain verdict.';
  const action = scope === 'cercle'
    ? { label: 'OUVRIR LE CERCLE', route: '/(tabs)/social/friends' as const }
    : scope === 'faction'
      ? { label: 'VOIR LES FACTIONS', route: '/(tabs)/social/faction' as const }
      : null;

  return (
    <FeatureStateView
      action={action ? { label: action.label, onPress: () => router.push(action.route) } : undefined}
      compact
      description={copy}
      domain="rank"
      style={styles.stateInset}
      testID="rank-leaderboard-empty"
      title="Aucun joueur dans ce classement"
      variant="empty"
    />
  );
}

function MyPositionCard({ row, scope }: { row: RankLeaderboardRow; scope: string }) {
  const starting = isZeroRank(row.frags);
  const accent = starting ? ZERO_RANK_ACCENT : gradeAccent(row.grade);
  const accuracy = row.settledCalls ? Math.round((row.wonCalls / row.settledCalls) * 100) : 0;

  return (
    <View style={[styles.meCard, { borderColor: accent + '88', backgroundColor: accent + '14' }]}>
      <RankEmblem grade={row.grade} size={84} />
      <View style={styles.meIdentity}>
        <Text style={[styles.meEyebrow, { color: accent }]}>TA POSITION</Text>
        <Text style={styles.meGrade}>{row.grade.libelle?.toUpperCase() || 'CLASSÉ'}</Text>
        <Text style={styles.meMeta}>{formatNumber(row.frags)} FRAGS · {accuracy}% PRÉCISION</Text>
      </View>
      <View style={styles.meRankBlock}>
        <Text style={[styles.meRank, { color: accent }]}>{row.rank ? '#' + row.rank : '—'}</Text>
        <Text style={styles.meScope}>{scope.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const LeaderboardRow = memo(function LeaderboardRow({
  first,
  last,
  row,
}: {
  first: boolean;
  last: boolean;
  row: RankLeaderboardRow;
}) {
  const starting = isZeroRank(row.frags);
  const accent = starting ? ZERO_RANK_ACCENT : gradeAccent(row.grade);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/u/[pseudo]', params: { pseudo: row.pseudo } })}
      style={({ pressed }) => [
        styles.boardRow,
        first && styles.boardRowFirst,
        last && styles.boardRowLast,
        row.me && styles.boardRowMe,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.boardRank, row.me && styles.boardRankMe]}>{row.rank ? String(row.rank) : '—'}</Text>
      <RankEmblem grade={row.grade} size={46} />
      <View style={styles.boardIdentity}>
        <Text numberOfLines={1} style={styles.boardPseudo}>{row.pseudo}{row.me ? ' · TOI' : ''}</Text>
        <Text style={[styles.boardGrade, { color: accent }]}>{row.grade.libelle?.toUpperCase() || 'CLASSÉ'}</Text>
      </View>
      <View style={styles.boardScore}>
        <Text style={styles.boardFrags}>{formatNumber(row.frags)}</Text>
        <Text style={styles.boardUnit}>FRAGS</Text>
      </View>
    </Pressable>
  );
});

function RewardsSection({ dashboard }: { dashboard: RankDashboard }) {
  const compact = useWindowDimensions().width <= 340;
  const state = dashboard.state;
  const bestOrder = Number(state?.bestGrade?.ordre ?? state?.grade.ordre ?? -1);

  return (
    <View style={styles.sectionStack}>
      <View style={[styles.rewardIntro, compact && styles.rewardIntroCompact]}>
        <View style={[styles.rewardIntroMark, compact && styles.rewardIntroMarkCompact]}>
          <RankEmblem grade={state?.bestGrade ?? state?.grade} size={compact ? 88 : 104} />
        </View>
        <View style={styles.rewardIntroCopy}>
          <Text style={styles.cardEyebrow}>MEILLEUR GRADE ATTEINT</Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.72} numberOfLines={1} style={styles.rewardTitle}>
            {state?.bestGrade?.libelle?.toUpperCase() || state?.grade.libelle?.toUpperCase() || 'BRONZE'}
          </Text>
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
    objectif_placements: 0,
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
    <SkeletonGroup label={FEATURE_STATE_COPY.rank.loading.title} style={styles.skeleton} testID="rank-season-loading">
      <View style={styles.skeletonJourneyHeader}>
        <Skeleton height={12} radius="pill" width={96} />
        <Skeleton height={10} radius="pill" tone="subtle" width={104} />
      </View>
      <View style={styles.skeletonJourney}>
        {[0, 1, 2].map((item) => (
          <View key={item} style={styles.skeletonTier}>
            <View style={styles.skeletonTierCopy}>
              <Skeleton height={10} radius="pill" width={62 + item * 8} />
              <Skeleton height={7} radius="pill" tone="subtle" width={88} />
            </View>
            <Skeleton height={82} radius="lg" width={82} />
          </View>
        ))}
      </View>
      <View style={styles.skeletonMetrics}>
        <View style={styles.skeletonMetricColumn}>
          <Skeleton height={9} radius="pill" tone="subtle" width={76} />
          <Skeleton height={35} radius="sm" width={92} />
        </View>
        <View style={styles.skeletonMetricColumn}>
          <Skeleton height={9} radius="pill" tone="subtle" width={104} />
          <Skeleton height={7} radius="pill" width="100%" />
        </View>
      </View>
    </SkeletonGroup>
  );
}

function RankSnapshotSkeleton() {
  return (
    <SkeletonGroup label={FEATURE_STATE_COPY.rank.loading.title} style={styles.snapshotSkeleton} testID="rank-snapshot-loading">
      <Skeleton height={66} radius="lg" width={66} />
      <View style={styles.snapshotSkeletonCopy}>
        <Skeleton height={8} radius="pill" tone="subtle" width="44%" />
        <Skeleton height={20} radius="sm" width="72%" />
        <Skeleton height={4} radius="pill" width="100%" />
        <Skeleton height={8} radius="pill" tone="subtle" width="84%" />
      </View>
      <View style={styles.snapshotSkeletonRank}>
        <Skeleton height={32} radius="sm" width={58} />
        <Skeleton height={8} radius="pill" tone="subtle" width={50} />
      </View>
    </SkeletonGroup>
  );
}

function formatNumber(value: number) {
  return NUMBER_FORMATTER.format(Number(value || 0));
}

function gradeRange(grade: SeasonalGradeDefinition) {
  const range = grade.maximum == null
    ? formatNumber(grade.minimum) + '+ FRAGS'
    : formatNumber(grade.minimum) + '–' + formatNumber(grade.maximum) + ' FRAGS';
  return grade.minimumVerdicts ? range + ' · ' + grade.minimumVerdicts + ' VERDICTS' : range;
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingBottom: layout.tabBarContentInset,
    gap: 17,
  },
  listContent: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  headerStack: {
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
    fontSize: 11,
  },
  tabTextCompact: {
    fontSize: 9,
  },
  tabTextActive: {
    color: '#080A0C',
  },
  stateInset: { marginHorizontal: spacing.md },
  sectionStack: {
    gap: 13,
    marginHorizontal: spacing.md,
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
    gap: 12,
  },
  movementCount: {
    minWidth: 30,
    color: colors.textSecondary,
    fontFamily: fonts.bold,
    textAlign: 'center',
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
    fontSize: 11,
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
  leaderboardHeader: {
    marginHorizontal: spacing.md,
    paddingTop: 17,
    paddingBottom: 13,
    gap: 13,
  },
  boardHeading: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  boardCount: {
    ...typography.metricSmall,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
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
  boardRow: {
    minHeight: 75,
    marginHorizontal: spacing.md,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceLow,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSubtle,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  boardRowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  boardRowLast: {
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
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
  boardRule: {
    ...typography.eyebrow,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: layout.tabBarContentInset,
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
  rewardIntroCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  rewardIntroMark: {
    width: 94,
    alignItems: 'center',
  },
  rewardIntroMarkCompact: {
    width: '100%',
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
    gap: 14,
    borderRadius: 30,
    backgroundColor: '#0D1218',
    borderWidth: 1,
    borderColor: colors.border,
  },
  snapshotSkeleton: { minHeight: 128, marginHorizontal: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderSubtle },
  snapshotSkeletonCopy: { flex: 1, minWidth: 0, gap: 8 },
  snapshotSkeletonRank: { width: 66, alignItems: 'flex-end', gap: 7 },
  skeletonJourneyHeader: { minHeight: 32, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  skeletonJourney: { flex: 1, justifyContent: 'space-around' },
  skeletonTier: { minHeight: 98, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  skeletonTierCopy: { flex: 1, gap: 8 },
  skeletonMetrics: { minHeight: 94, paddingTop: 14, flexDirection: 'row', gap: 24, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  skeletonMetricColumn: { flex: 1, justifyContent: 'center', gap: 12 },
  pressed: {
    opacity: 0.72,
  },
});
