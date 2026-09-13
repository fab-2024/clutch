import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import type { ArenaMatch } from '../types';
import { useMatchesDashboard } from '../hooks/useMatchesDashboard';
import { matchPhase } from '../utils';
import {
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
} from './MatchesArenaSections';
import { styles } from './MatchesScreen.styles';
import { InlinePredictionPanel } from './InlinePredictionPanel';
import { ArenaFilters } from './MatchesFilters';
import { MatchesHeader } from './MatchesHeader';
import { MatchesCalendarModal } from './MatchesCalendarModal';

const GAME_GLOBAL_BACKGROUNDS = {
  all: require('../../../../assets/matches/matches-followed-global-background.jpg'),
  lol: require('../../../../assets/matches/matches-lol-global-background.jpg'),
  valorant: require('../../../../assets/matches/matches-valorant-global-background.jpg'),
  rocket_league: require('../../../../assets/matches/matches-rocket-league-global-background.jpg'),
} as const;

type MatchesExperienceProps = {
  error: string | null;
  finished: ArenaMatch[];
  headerEconomy?: { frags: number; volts: number };
  loading: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  refreshing: boolean;
  upcoming: ArenaMatch[];
  userId?: string;
};

export default function MatchesScreen() {
  const { session } = useAuth();
  const { error, finished, load, loading, refreshing, upcoming } = useMatchesDashboard(
    session?.user.id,
  );

  return (
    <MatchesExperience
      error={error}
      finished={finished}
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
  error,
  finished,
  headerEconomy,
  loading,
  onRefresh,
  onRetry,
  refreshing,
  upcoming,
  userId,
}: MatchesExperienceProps) {
  const params = useLocalSearchParams<{
    duelRivalId?: string | string[];
    duelRivalPseudo?: string | string[];
  }>();
  const duelRivalId = Array.isArray(params.duelRivalId) ? params.duelRivalId[0] : params.duelRivalId;
  const duelRivalPseudo = Array.isArray(params.duelRivalPseudo) ? params.duelRivalPseudo[0] : params.duelRivalPseudo;
  const [game, setGame] = useState<GameFilter>('all');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarAnchor, setCalendarAnchor] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [expandedPredictionId, setExpandedPredictionId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  const source = useMemo(() => {
    const uniqueMatches = new Map<string, ArenaMatch>();
    [...upcoming, ...finished].forEach((match) => uniqueMatches.set(match.id, match));
    return [...uniqueMatches.values()].sort(
      (a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime(),
    );
  }, [finished, upcoming]);
  const scopedMatches = useMemo(
    () => filterMatches(source, game, query),
    [game, query, source],
  );
  const calendarDays = useMemo(() => buildCalendarDays(calendarAnchor), [calendarAnchor]);
  const defaultDayKey = useMemo(
    () => findDefaultDayKey(calendarDays, scopedMatches),
    [calendarDays, scopedMatches],
  );
  const activeDayKey = selectedDayKey && calendarDays.some((day) => dateKey(day) === selectedDayKey)
    ? selectedDayKey
    : defaultDayKey;
  const visibleMatches = useMemo(
    () => scopedMatches.filter((match) => dateKey(new Date(match.debut)) === activeDayKey),
    [activeDayKey, scopedMatches],
  );
  const liveMatches = visibleMatches.filter((match) => matchPhase(match) === 'live');
  const upcomingMatches = visibleMatches.filter((match) => {
    const phase = matchPhase(match);
    return phase !== 'live' && phase !== 'finished' && phase !== 'cancelled';
  });
  const resultMatches = visibleMatches.filter((match) => {
    const phase = matchPhase(match);
    return phase === 'finished' || phase === 'cancelled';
  });
  const activeDate = calendarDays.find((day) => dateKey(day) === activeDayKey) ?? calendarDays[0];
  const prepareMatch = useCallback((match: MatchCenterTarget) => {
    warmMatchCenter(match);
    if (userId) {
      void prefetchMatchCenterData({ matchId: match.id, userId }).catch(() => undefined);
    }
  }, [userId]);

  function changeGame(nextGame: GameFilter) {
    setGame(nextGame);
    setSelectedDayKey(null);
    setCalendarAnchor(new Date());
    setExpandedPredictionId(null);
  }

  const openInlinePrediction = useCallback((match: ArenaMatch) => {
    setExpandedPredictionId(match.id);
  }, []);

  const closeInlinePrediction = useCallback(() => {
    setExpandedPredictionId(null);
  }, []);

  const renderMatch = (match: ArenaMatch) => expandedPredictionId === match.id ? (
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
  );

  return (
    <Screen atmosphere="none">
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

        <MatchesHeader
          query={query}
          searchOpen={searchOpen}
          onQueryChange={setQuery}
          onOpenCalendar={() => setCalendarOpen(true)}
          onToggleSearch={() => {
            setSearchOpen((current) => !current);
            if (searchOpen) setQuery('');
          }}
        />

        <MatchesCalendarModal
          matches={scopedMatches}
          onClose={() => setCalendarOpen(false)}
          onSelectDay={(dayKey) => {
            const [year, month, day] = dayKey.split('-').map(Number);
            setCalendarAnchor(new Date(year, month - 1, day, 12));
            setSelectedDayKey(dayKey);
            setExpandedPredictionId(null);
            setCalendarOpen(false);
          }}
          selectedDayKey={activeDayKey}
          visible={calendarOpen}
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

        <View style={styles.calendarInset}>
          <ScheduleHero
            activeDayKey={activeDayKey}
            calendarDays={calendarDays}
            matches={scopedMatches}
            monthLabel={formatMonth(activeDate)}
            onSelectDay={(dayKey) => {
              setSelectedDayKey(dayKey);
              setExpandedPredictionId(null);
            }}
          />
        </View>

        <ArenaFilters game={game} onGameChange={changeGame} />

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
        ) : error && !source.length ? null : visibleMatches.length ? (
          <View style={styles.matchesSection}>
            {liveMatches.length ? (
              <View style={styles.liveStack}>
                {liveMatches.map((match) => <LiveMatchCard key={match.id} match={match} onPrepareMatch={prepareMatch} rivalId={duelRivalId} rivalPseudo={duelRivalPseudo} />)}
              </View>
            ) : null}
            {upcomingMatches.length ? (
              <>
                <SectionHead count={upcomingMatches.length} mode="upcoming" />
                <View style={styles.matchList}>{upcomingMatches.map(renderMatch)}</View>
              </>
            ) : null}
            {resultMatches.length ? (
              <>
                <SectionHead count={resultMatches.length} mode="finished" />
              <View style={styles.matchList}>
                  {resultMatches.map(renderMatch)}
              </View>
              </>
            ) : null}
          </View>
        ) : (
          <EmptyArena />
        )}
      </ScrollView>
    </Screen>
  );
}
