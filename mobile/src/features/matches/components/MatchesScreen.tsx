import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
import { FeatureStateView } from '@/src/components/ui/FeatureStateView';
import ProfileHeaderButton from '@/src/features/profile/components/ProfileHeaderButton';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme';

import { prefetchMatchCenterData } from '../matchCenterCache';
import { warmMatchCenter, type MatchCenterTarget } from '../matchCenterNavigation';
import type { ArenaMatch, MyCallsDashboard } from '../types';
import { useMatchesDashboard } from '../hooks/useMatchesDashboard';
import { matchPhase } from '../utils';
import {
  ArenaFilters,
  EmptyArena,
  LiveMatchCard,
  MatchRow,
  MatchSkeleton,
  ScheduleHero,
  SectionHead,
  buildCalendarDays,
  dateKey,
  filterMatches,
  findDefaultDayKey,
  formatMonth,
  type GameFilter,
  type StatusFilter,
} from './MatchesArenaSections';
import { styles } from './MatchesScreen.styles';
import { InlinePredictionPanel } from './InlinePredictionPanel';
import { MyCallsPanel } from './MyCallsPanel';

const GAME_GLOBAL_BACKGROUNDS = {
  followed: require('../../../../assets/matches/matches-followed-global-background.jpg'),
  lol: require('../../../../assets/matches/matches-lol-global-background.jpg'),
  valorant: require('../../../../assets/matches/matches-valorant-global-background.jpg'),
  rocket_league: require('../../../../assets/matches/matches-rocket-league-global-background.jpg'),
} as const;

type MatchesExperienceProps = {
  error: string | null;
  finished: ArenaMatch[];
  followedGames: string[];
  headerEconomy?: { frags: number; volts: number };
  isAdmin: boolean;
  loading: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  refreshing: boolean;
  upcoming: ArenaMatch[];
  userId?: string;
  calls: MyCallsDashboard;
};

export default function MatchesScreen() {
  const { profile, session } = useAuth();
  const { calls, error, finished, load, loading, refreshing, upcoming } = useMatchesDashboard(
    session?.user.id,
  );

  return (
    <MatchesExperience
      error={error}
      calls={calls}
      finished={finished}
      followedGames={profile?.jeux_suivis ?? []}
      isAdmin={Boolean(profile?.est_admin)}
      loading={loading}
      onRefresh={() => void load(true)}
      onRetry={() => void load()}
      refreshing={refreshing}
      upcoming={upcoming}
      userId={session?.user.id}
    />
  );
}

export function MatchesExperience({
  calls,
  error,
  finished,
  followedGames,
  headerEconomy,
  isAdmin,
  loading,
  onRefresh,
  onRetry,
  refreshing,
  upcoming,
  userId,
}: MatchesExperienceProps) {
  const params = useLocalSearchParams<{
    view?: string | string[];
    duelRivalId?: string | string[];
    duelRivalPseudo?: string | string[];
  }>();
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view;
  const duelRivalId = Array.isArray(params.duelRivalId) ? params.duelRivalId[0] : params.duelRivalId;
  const duelRivalPseudo = Array.isArray(params.duelRivalPseudo) ? params.duelRivalPseudo[0] : params.duelRivalPseudo;
  const [status, setStatus] = useState<StatusFilter>('upcoming');
  const [game, setGame] = useState<GameFilter>('followed');
  const [callsOnly, setCallsOnly] = useState(requestedView === 'calls');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [expandedPredictionId, setExpandedPredictionId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (requestedView === 'calls') setCallsOnly(true);
  }, [requestedView]);

  const source = status === 'upcoming' ? upcoming : finished;
  const scopedMatches = useMemo(
    () => filterMatches(source, game, followedGames, false, query),
    [followedGames, game, query, source],
  );
  const callCount = calls.compteurs.verrouilles;
  const filtered = useMemo(
    () => callsOnly ? scopedMatches.filter((match) => Boolean(match.prediction)) : scopedMatches,
    [callsOnly, scopedMatches],
  );
  const calendarDays = useMemo(() => buildCalendarDays(status, filtered), [filtered, status]);
  const defaultDayKey = useMemo(
    () => findDefaultDayKey(calendarDays, filtered, status),
    [calendarDays, filtered, status],
  );
  const activeDayKey = selectedDayKey && calendarDays.some((day) => dateKey(day) === selectedDayKey)
    ? selectedDayKey
    : defaultDayKey;
  const visibleMatches = useMemo(
    () => filtered.filter((match) => dateKey(new Date(match.debut)) === activeDayKey),
    [activeDayKey, filtered],
  );
  const liveMatches = visibleMatches.filter((match) => matchPhase(match) === 'live');
  const standardMatches = visibleMatches.filter((match) => matchPhase(match) !== 'live');
  const activeDate = calendarDays.find((day) => dateKey(day) === activeDayKey) ?? calendarDays[0];
  const prepareMatch = useCallback((match: MatchCenterTarget) => {
    warmMatchCenter(match);
    if (userId) {
      void prefetchMatchCenterData({ matchId: match.id, userId }).catch(() => undefined);
    }
  }, [userId]);

  function changeStatus(nextStatus: StatusFilter) {
    setStatus(nextStatus);
    setSelectedDayKey(null);
    setExpandedPredictionId(null);
  }

  function changeGame(nextGame: GameFilter) {
    setGame(nextGame);
    setSelectedDayKey(null);
    setExpandedPredictionId(null);
  }

  const openInlinePrediction = useCallback((match: ArenaMatch) => {
    setExpandedPredictionId(match.id);
  }, []);

  const closeInlinePrediction = useCallback(() => {
    setExpandedPredictionId(null);
  }, []);

  return (
    <Screen>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.gameBackground}
        testID={`matches-${game}-global-background`}
      >
        <Image resizeMode="cover" source={GAME_GLOBAL_BACKGROUNDS[game]} style={styles.gameBackgroundImage} />
        <LinearGradient
          colors={['rgba(2,6,9,.58)', 'rgba(2,6,9,.70)', 'rgba(2,6,9,.82)']}
          end={{ x: .5, y: 1 }}
          start={{ x: .5, y: 0 }}
          style={styles.gameBackgroundScrim}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.volt} />}
      >
        <GriffHeader
          economy={headerEconomy}
          leading={<ProfileHeaderButton preview={Boolean(headerEconomy)} />}
          variant="wallet"
        />

        {duelRivalId ? (
          <View style={styles.targetedDuelBanner}>
            <View style={styles.targetedDuelCopy}>
              <Text style={styles.targetedDuelEyebrow}>DÉFI CIBLÉ · MATCH CLASSÉ</Text>
              <Text style={styles.targetedDuelTitle}>Choisis le match pour défier {duelRivalPseudo || 'ton rival'}.</Text>
            </View>
            <Pressable accessibilityLabel="Annuler le duel ciblé" accessibilityRole="button" onPress={() => router.replace('/(tabs)/matches')} style={({ pressed }) => [styles.targetedDuelClose, pressed && styles.pressed]}><Text style={styles.targetedDuelCloseText}>×</Text></Pressable>
          </View>
        ) : null}

        <View>
          <ScheduleHero
            activeDayKey={activeDayKey}
            calendarDays={calendarDays}
            matches={filtered}
            monthLabel={formatMonth(activeDate)}
            query={query}
            searchOpen={searchOpen}
            status={status}
            game={game}
            onQueryChange={setQuery}
            onSelectDay={(dayKey) => {
              setSelectedDayKey(dayKey);
              setExpandedPredictionId(null);
            }}
            onToggleHistory={() => changeStatus(status === 'upcoming' ? 'finished' : 'upcoming')}
            onToggleSearch={() => {
              setSearchOpen((current) => !current);
              if (searchOpen) setQuery('');
            }}
          />
        </View>

        <View>
          <ArenaFilters
            callCount={callCount}
            callsOnly={callsOnly}
            game={game}
            isAdmin={isAdmin}
            status={status}
            onCallsOnlyChange={(nextCallsOnly) => {
              setCallsOnly(nextCallsOnly);
              setExpandedPredictionId(null);
            }}
            onGameChange={changeGame}
            onStatusChange={changeStatus}
          />
        </View>

        {error ? (
          <FeatureStateView
            compact
            domain="matches"
            onRetry={onRetry}
            presentation="inline"
            style={styles.stateInset}
            testID="matches-error-state"
            variant="error"
          />
        ) : null}

        {loading ? (
          <MatchSkeleton />
        ) : error && !source.length ? null : callsOnly ? (
          <View>
            <MyCallsPanel dashboard={calls} followedGames={followedGames} game={game} onPrepareMatch={prepareMatch} query={query} />
          </View>
        ) : visibleMatches.length ? (
          <View style={styles.matchesSection}>
            <SectionHead callsOnly={callsOnly} count={visibleMatches.length} date={activeDate} status={status} />
            {liveMatches.length ? (
              <View style={styles.liveStack}>
                {liveMatches.map((match) => <LiveMatchCard key={match.id} match={match} onPrepareMatch={prepareMatch} rivalId={duelRivalId} rivalPseudo={duelRivalPseudo} />)}
              </View>
            ) : null}
            {standardMatches.length ? (
              <View style={styles.matchList}>
                {standardMatches.map((match) => expandedPredictionId === match.id ? (
                  <InlinePredictionPanel
                    key={match.id}
                    match={match}
                    onClose={closeInlinePrediction}
                    onPredictionLocked={onRefresh}
                    rivalId={duelRivalId}
                    rivalPseudo={duelRivalPseudo}
                    userId={userId}
                  />
                ) : (
                  <MatchRow
                    key={match.id}
                    match={match}
                    onOpenPrediction={openInlinePrediction}
                    onPrepareMatch={prepareMatch}
                    rivalId={duelRivalId}
                    rivalPseudo={duelRivalPseudo}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <EmptyArena callsOnly={callsOnly} query={query} status={status} />
        )}
      </ScrollView>
    </Screen>
  );
}
