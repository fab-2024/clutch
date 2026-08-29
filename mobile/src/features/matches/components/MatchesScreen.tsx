import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { GriffHeader } from '@/src/components/layout/GriffHeader';
import { Screen } from '@/src/components/layout/Screen';
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
  toGameId,
  type GameFilter,
  type StatusFilter,
} from './MatchesArenaSections';
import { styles } from './MatchesScreen.styles';
import { MyCallsPanel } from './MyCallsPanel';

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
  const visualGame = game === 'followed'
    ? toGameId(visibleMatches[0]?.jeu ?? filtered[0]?.jeu) ?? 'lol'
    : game;
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
  }

  function changeGame(nextGame: GameFilter) {
    setGame(nextGame);
    setSelectedDayKey(null);
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.volt} />}
      >
        <GriffHeader economy={headerEconomy} variant="wallet" />

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
            visualGame={visualGame}
            onQueryChange={setQuery}
            onSelectDay={setSelectedDayKey}
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
            onCallsOnlyChange={setCallsOnly}
            onGameChange={changeGame}
            onStatusChange={changeStatus}
          />
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={onRetry}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
          </View>
        ) : null}

        {loading ? (
          <MatchSkeleton />
        ) : callsOnly ? (
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
                {standardMatches.map((match) => <MatchRow key={match.id} match={match} onPrepareMatch={prepareMatch} rivalId={duelRivalId} rivalPseudo={duelRivalPseudo} />)}
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
