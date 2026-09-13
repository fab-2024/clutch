import { router } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
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

import { SOCIAL_ROUTES } from '@/src/features/social/routes';
import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import { FEATURE_STATE_COPY, FeatureStateView } from '@/src/components/ui/FeatureStateView';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { loadProfileData } from '@/src/features/profile/api';
import type { ProfileData } from '@/src/features/profile/types';
import PlayerAvatar from '@/src/features/profile/avatars/PlayerAvatar';
import { PlayerIdentityCard, IdentitySurface, equippedIdentityStyle } from '@/src/features/profile/identity/PlayerIdentityCard';
import ProfileHeaderButton from '@/src/features/profile/components/ProfileHeaderButton';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';
import { resolveTeamAccent } from '@/src/utils/teamColors';

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
import { RankSeasonHero } from './RankSeasonHero';
import { SeasonJourneyCard } from './SeasonJourneyCard';

type Section = 'season' | 'leaderboards' | 'rewards';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'season', label: 'Ma saison' },
  { key: 'leaderboards', label: 'Classements' },
  { key: 'rewards', label: 'Récompenses' },
];

const SCOPES: { key: RankScope; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'cercle', label: 'Amis' },
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
      onRetry={() => void load()}
      onSection={setSection}
      preview={Boolean(previewData)}
      section={section}
    />
  );

  if (!loading && dashboard && section === 'leaderboards') {
    return (
      <Screen atmosphere="rank">
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
    <Screen atmosphere="rank">
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
        showsVerticalScrollIndicator={false}
      >
        {header}

        {loading ? <RankSkeleton /> : null}
        {!loading && dashboard && section === 'season' ? (
          <SeasonSection dashboard={dashboard} preview={Boolean(previewData)} reduceMotionOverride={previewReduceMotion} />
        ) : null}
        {!loading && dashboard && section === 'rewards' ? <RewardsSection dashboard={dashboard} /> : null}
      </ScrollView>
    </Screen>
  );
}

function RankHeader({
  dashboard,
  error,
  onRetry,
  onSection,
  preview,
  section,
}: {
  dashboard: RankDashboard | null;
  error: string | null;
  onRetry: () => void;
  onSection: (section: Section) => void;
  preview: boolean;
  section: Section;
}) {
  const compact = useWindowDimensions().width <= 340;
  const [, ...seasonDetails] = (dashboard?.season?.name ?? 'SAISON').split(' · ');

  return (
    <View style={styles.headerStack}>
      <GriffHeader leading={<ProfileHeaderButton preview={preview} />} variant="wallet" />

      {seasonDetails.length ? (
        <View style={styles.intro}>
          <Text style={styles.seasonDetail}>{seasonDetails.join(' · ').toUpperCase()}</Text>
        </View>
      ) : null}

      <View accessibilityRole="tablist" style={styles.tabs}>
        {SECTIONS.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === item.key }}
            onPress={() => onSection(item.key)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <View style={styles.tabLabelWrap}>
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
              {section === item.key ? <View pointerEvents="none" style={styles.tabUnderline} /> : null}
            </View>
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
  preview,
  reduceMotionOverride,
}: {
  dashboard: RankDashboard;
  preview: boolean;
  reduceMotionOverride?: boolean;
}) {
  const [showJourney, setShowJourney] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const state = dashboard.state;

  if (!dashboard.season || !state) {
    return <EmptyState title="INTERSAISON." copy="La prochaine saison réactivera les Frags et les classements." />;
  }

  const accent = isZeroRank(state.frags) ? ZERO_RANK_ACCENT : gradeAccent(state.grade);
  const chooseMatch = () => router.push(preview ? '/matches-preview' : '/(tabs)/matches');
  const toggleJourney = () => {
    if (showJourney) setShowRules(false);
    setShowJourney((visible) => !visible);
  };

  return (
    <View style={styles.sectionStack}>
      <RankSeasonHero onChooseMatch={chooseMatch} state={state} />

      <Pressable
        accessibilityLabel={showJourney ? 'Réduire le parcours de saison' : 'Voir le parcours complet de la saison'}
        accessibilityRole="button"
        accessibilityState={{ expanded: showJourney }}
        onPress={toggleJourney}
        style={({ pressed }) => [styles.journeyAction, pressed && styles.pressed]}
      >
        <Text style={styles.journeyActionText}>{showJourney ? 'RÉDUIRE LE PARCOURS' : 'VOIR LE PARCOURS DE SAISON'}</Text>
        {showJourney ? <ChevronUp color={colors.textSecondary} size={18} /> : <ChevronDown color={colors.textSecondary} size={18} />}
      </Pressable>

      {showJourney ? (
        <SeasonJourneyCard
          onChooseMatch={chooseMatch}
          onToggleRules={() => setShowRules((visible) => !visible)}
          reduceMotionOverride={reduceMotionOverride}
          rulesVisible={showRules}
          season={dashboard.season}
          state={state}
        />
      ) : null}

      {showJourney && showRules ? <RulesCard rules={dashboard.rules} /> : null}

      <RecentMovements movements={dashboard.recentMovements} />

      <View style={styles.recordCard}>
        <View style={styles.cardHeading}>
          <View>
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find(row => row.id === selectedId) ?? rows.find(row => row.me) ?? rows[0] ?? null;
  const [identities, setIdentities] = useState<Record<string, ProfileData>>({});
  const [identityError, setIdentityError] = useState(false);
  const selectedPseudo = selected?.pseudo;
  const me = rows.find((row) => row.me) ?? null;
  const profileTargets = Array.from(new Set([
    ...rows.slice(0, 3).map((row) => row.pseudo),
    me?.pseudo,
    selectedPseudo,
  ].filter((pseudo): pseudo is string => Boolean(pseudo))));
  const profileTargetsKey = profileTargets.join('\u0000');

  useEffect(() => {
    let active = true;
    setIdentityError(false);
    const missing = profileTargets.filter((pseudo) => !identities[pseudo]);
    if (!missing.length) return;
    void Promise.allSettled(missing.map(async (pseudo) => ({ pseudo, data: await loadProfileData(pseudo) })))
      .then((results) => {
        if (!active) return;
        const loaded: Record<string, ProfileData> = {};
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') loaded[result.value.pseudo] = result.value.data;
          else if (missing[index] === selectedPseudo) setIdentityError(true);
        });
        if (Object.keys(loaded).length) setIdentities((current) => ({ ...current, ...loaded }));
      });
    return () => { active = false; };
  // The key changes only when the visible podium, the current player or the selection changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileTargetsKey]);

  const detail = selectedPseudo ? identities[selectedPseudo] ?? null : null;
  const meDetail = me ? identities[me.pseudo] ?? null : null;
  const faction = meDetail?.favoriteTeam ?? (scope === 'faction' ? detail?.favoriteTeam ?? null : null);
  const factionAccent = resolveTeamAccent({ name: faction?.nom, tag: faction?.tag });
  const boardTitle = scope === 'faction'
    ? `Classement ${faction?.nom ?? 'de ta faction'}`
    : scope === 'cercle'
      ? 'Classement des amis'
      : 'Classement global';
  const renderRow = useCallback(({ index, item }: ListRenderItemInfo<RankLeaderboardRow>) => (
    <LeaderboardRow
      first={index === 0}
      last={index === rows.length - 1}
      row={item}
      selected={selected?.id === item.id}
      onSelect={setSelectedId}
      identity={identities[item.pseudo] ?? null}
    />
  ), [rows.length, selected?.id, identities]);

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={rows}
      initialNumToRender={10}
      keyExtractor={(row) => row.id}
      ListEmptyComponent={<LeaderboardEmpty scope={scope} />}
      ListFooterComponent={(
        <View style={styles.playerPreviewSection}>
          {selected ? <>
            <View style={styles.playerPreviewHeading}>
              <Text style={styles.playerPreviewTitle}>Aperçu du joueur</Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Voir le profil de ${selected.pseudo}`}
                onPress={() => router.push({ pathname: '/u/[pseudo]', params: { pseudo: selected.pseudo } })}
                style={({ pressed }) => [styles.playerPreviewLink, pressed && styles.pressed]}
              >
                <Text style={styles.playerPreviewLinkText}>VOIR LE PROFIL →</Text>
              </Pressable>
            </View>
            <PlayerIdentityCard compact pseudo={selected.pseudo} avatarId={detail?.avatarId} cosmetics={detail?.cosmetics} team={detail?.favoriteTeam} grade={selected.grade} season={dashboard.season?.name} />
            <Text style={styles.playerPreviewStyle}>{identityError ? 'Personnalisation indisponible' : detail ? `PERSONNALISATION · ${equippedIdentityStyle(detail.cosmetics)?.name ?? detail.cosmetics.profileCard?.name ?? 'Clutch Original'}` : 'CHARGEMENT DE LA PERSONNALISATION…'}</Text>
          </> : null}
          <Text style={styles.boardRule}>TRIÉ PAR FRAGS · PRÉCISION UTILISÉE UNIQUEMENT EN CAS D’ÉGALITÉ</Text>
        </View>
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
                  style={({ pressed }) => [styles.scopeTab, pressed && styles.pressed]}
                >
                  <Text style={[styles.scopeText, scope === item.key && styles.scopeTextActive]}>{item.label}</Text>
                  {scope === item.key ? <View style={styles.scopeUnderline} /> : null}
                </Pressable>
              ))}
            </View>

            {rows.length >= 3 ? (
              <LeaderboardPodium
                identities={identities}
                onSelect={setSelectedId}
                rows={rows.slice(0, 3)}
                selectedId={selected?.id ?? null}
              />
            ) : null}

            <View style={styles.boardHeading}>
              <View style={styles.boardHeadingIdentity}>
                {scope === 'faction' && faction ? (
                  <TeamLogo
                    accent={factionAccent}
                    frameless
                    name={faction.nom}
                    size={34}
                    tag={faction.tag}
                    uri={faction.logo}
                  />
                ) : null}
                <Text numberOfLines={1} style={styles.boardTitle}>{boardTitle}</Text>
              </View>
              <Text style={styles.boardScoreLabel}>FRAGS</Text>
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

function LeaderboardPodium({
  identities,
  onSelect,
  rows,
  selectedId,
}: {
  identities: Record<string, ProfileData>;
  onSelect: (id: string) => void;
  rows: RankLeaderboardRow[];
  selectedId: string | null;
}) {
  const ordered = [rows[1], rows[0], rows[2]].filter((row): row is RankLeaderboardRow => Boolean(row));
  return (
    <View accessibilityLabel="Podium du classement" style={styles.podium}>
      {ordered.map((row) => {
        const identity = identities[row.pseudo] ?? null;
        const winner = row.rank === 1;
        const selected = row.id === selectedId;
        return (
          <Pressable
            key={row.id}
            accessibilityLabel={`Aperçu de ${row.pseudo}, position ${row.rank ?? 'non classée'}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(row.id)}
            style={({ pressed }) => [
              styles.podiumCard,
              winner && styles.podiumCardWinner,
              selected && styles.podiumCardSelected,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.podiumRank, winner && styles.podiumRankWinner]}>
              <Text style={[styles.podiumRankText, winner && styles.podiumRankTextWinner]}>{row.rank ?? '—'}</Text>
            </View>
            <PlayerAvatar avatarId={identity?.avatarId} cosmetics={identity?.cosmetics} label={row.pseudo} size={winner ? 58 : 52} />
            <Text numberOfLines={1} style={styles.podiumPseudo}>{row.pseudo}</Text>
            <Text style={[styles.podiumAccuracy, winner && styles.podiumAccuracyWinner]}>{Math.round(row.accuracy)} %</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LeaderboardEmpty({ scope }: { scope: RankScope }) {
  const copy = scope === 'cercle'
    ? 'Ajoute des amis pour créer ton classement de Cercle.'
    : scope === 'faction'
      ? 'Choisis une faction pour rejoindre ce classement.'
      : 'Les premiers joueurs classés apparaîtront après leur prochain verdict.';
  const action = scope === 'cercle'
    ? { label: 'OUVRIR LE CERCLE', route: SOCIAL_ROUTES.friends }
    : scope === 'faction'
      ? { label: 'VOIR LES FACTIONS', route: SOCIAL_ROUTES.home }
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

const LeaderboardRow = memo(function LeaderboardRow({
  first,
  last,
  row, selected, onSelect, identity,
}: {
  selected: boolean; onSelect: (id: string) => void; identity: ProfileData | null;
  first: boolean;
  last: boolean;
  row: RankLeaderboardRow;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Aperçu de ${row.pseudo}`}
      accessibilityState={{ selected }}
      onPress={() => onSelect(row.id)}
      onLongPress={() => router.push({ pathname: '/u/[pseudo]', params: { pseudo: row.pseudo } })}
      style={({ pressed }) => [
        styles.boardRow,
        { overflow: 'hidden' },
        selected && { borderColor: '#BEA481', borderWidth: 1 },
        first && styles.boardRowFirst,
        last && styles.boardRowLast,
        row.me && styles.boardRowMe,
        pressed && styles.pressed,
      ]}
    >
      {row.me || selected ? <IdentitySurface accent={identity?.cosmetics.profileCard?.accent ?? identity?.cosmetics.frame?.accent ?? '#DFFF7A'} /> : null}
      <Text style={[styles.boardRank, row.me && styles.boardRankMe]}>{row.rank ? String(row.rank) : '—'}</Text>
      <PlayerAvatar avatarId={identity?.avatarId} cosmetics={identity?.cosmetics} label={row.pseudo} size={48} />
      <View style={styles.boardIdentity}>
        <View style={styles.boardPseudoRow}>
          <Text numberOfLines={1} style={[styles.boardPseudo, row.me && styles.boardPseudoMe]}>{row.pseudo}</Text>
          {row.me ? <Text style={styles.mePill}>TOI</Text> : null}
        </View>
      </View>
      <RankEmblem grade={row.grade} size={24} />
      <View style={styles.boardScore}>
        <Text style={styles.boardFrags}>{formatNumber(row.frags)}</Text>
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
        <Text style={styles.cardTitle}>Ton score repart. Ta marque reste.</Text>
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
      <View style={styles.skeletonHorizon}>
        <Skeleton height={200} radius="lg" width="48%" />
        <View style={styles.skeletonHorizonCopy}>
          <Skeleton height={10} radius="pill" tone="subtle" width="64%" />
          <Skeleton height={62} radius="sm" width="100%" />
          <Skeleton height={18} radius="pill" tone="subtle" width="72%" />
          <Skeleton height={6} radius="pill" width="100%" />
          <Skeleton height={12} radius="pill" tone="subtle" width="84%" />
        </View>
      </View>
      <Skeleton height={48} radius="md" width="100%" />
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
    gap: 8,
  },
  listContent: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
  },
  headerStack: {
    gap: 12,
  },
  intro: {
    marginHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  seasonDetail: {
    flexShrink: 1,
    fontFamily: fonts.displayBold,
    fontSize: 14,
    lineHeight: 18,
    color: '#58C0DB',
    textAlign: 'right',
    letterSpacing: 0.6,
  },
  tabs: { marginHorizontal: spacing.md, flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(143,156,176,.22)' },
  tab: { flex: 1, minWidth: 0, minHeight: 50, paddingHorizontal: 4, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  tabLabelWrap: { maxWidth: '100%', paddingBottom: 8 },
  tabUnderline: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: colors.text },
  tabText: { fontFamily: fonts.medium, color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  tabTextCompact: { fontSize: 13 },
  tabTextActive: { fontFamily: fonts.bold, color: colors.text },
  stateInset: { marginHorizontal: spacing.md },
  sectionStack: {
    gap: 13,
    marginHorizontal: spacing.md,
  },
  journeyAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  journeyActionText: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textSecondary,
    letterSpacing: 0.4,
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
  cardTitle: {
    ...typography.cardTitle,
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
    borderColor: '#30414E',
  },
  movementRow: {
    minHeight: 67,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0B1218',
    borderBottomWidth: 1,
    borderBottomColor: '#30414E',
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
    backgroundColor: '#111A22',
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
    minHeight: 48,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(95,138,165,.30)',
  },
  scopeTab: {
    position: 'relative',
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    color: '#8F9AAA',
  },
  scopeTextActive: {
    fontFamily: fonts.bold,
    color: colors.text,
  },
  scopeUnderline: {
    position: 'absolute',
    left: 19,
    right: 19,
    bottom: -1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.volt,
  },
  leaderboardHeader: {
    marginHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 14,
  },
  podium: {
    minHeight: 124,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
  },
  podiumCard: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    minHeight: 112,
    paddingTop: 16,
    paddingBottom: 9,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRadius: 15,
    backgroundColor: '#0A1721',
    borderWidth: 1,
    borderColor: '#17394D',
    overflow: 'visible',
  },
  podiumCardWinner: {
    minHeight: 122,
    borderColor: '#A6842D',
    backgroundColor: '#111A1D',
  },
  podiumCardSelected: {
    borderColor: '#C09B72',
    backgroundColor: '#152029',
  },
  podiumRank: {
    position: 'absolute',
    top: -12,
    width: 25,
    height: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#AAB5C4',
    borderWidth: 2,
    borderColor: '#E1E6EB',
  },
  podiumRankWinner: {
    width: 29,
    height: 29,
    top: -15,
    borderRadius: 15,
    backgroundColor: '#D2A432',
    borderColor: '#FFD865',
  },
  podiumRankText: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    color: '#18202A',
  },
  podiumRankTextWinner: {
    fontSize: 14,
    color: '#312100',
  },
  podiumPseudo: {
    width: '100%',
    marginTop: 5,
    paddingHorizontal: 5,
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  podiumAccuracy: {
    marginTop: 1,
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#D9E0E7',
    fontVariant: ['tabular-nums'],
  },
  podiumAccuracyWinner: {
    color: colors.volt,
  },
  boardHeading: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  boardHeadingIdentity: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  boardTitle: {
    flexShrink: 1,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    lineHeight: 21,
    color: colors.text,
  },
  boardScoreLabel: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  boardRow: {
    minHeight: 67,
    marginHorizontal: spacing.md,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#081620',
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
    backgroundColor: '#121B20',
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
  boardPseudoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  boardPseudo: {
    ...typography.bodyStrong,
    flexShrink: 1,
    color: colors.text,
  },
  boardPseudoMe: {
    fontFamily: fonts.displayBold,
  },
  mePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(190,164,129,.24)',
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 11,
    color: '#D7C5AD',
  },
  boardScore: {
    minWidth: 54,
    alignItems: 'flex-end',
  },
  boardFrags: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    lineHeight: 23,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  playerPreviewSection: {
    marginHorizontal: spacing.md,
    paddingTop: 22,
    gap: 10,
  },
  playerPreviewHeading: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  playerPreviewTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.text,
  },
  playerPreviewLink: {
    minHeight: 38,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerPreviewLinkText: {
    ...typography.eyebrow,
    color: colors.volt,
  },
  playerPreviewStyle: {
    ...typography.eyebrow,
    color: colors.textMuted,
  },
  boardRule: {
    ...typography.eyebrow,
    marginTop: spacing.sm,
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
    backgroundColor: '#0B1218',
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
    backgroundColor: '#152633',
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
    backgroundColor: '#111A22',
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
    backgroundColor: '#111A22',
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeleton: {
    minHeight: 152,
    marginHorizontal: spacing.md,
    gap: 6,
  },
  skeletonHorizon: { minHeight: 280, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: radius.lg, backgroundColor: '#0B1218', borderWidth: 1, borderColor: colors.border },
  skeletonHorizonCopy: { flex: 1, minWidth: 0, gap: 8 },
  pressed: {
    opacity: 0.72,
  },
});
