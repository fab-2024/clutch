import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { ClutchHeader } from '@/src/components/layout/ClutchHeader';
import { Screen } from '@/src/components/layout/Screen';
import GameLogo from '@/src/features/onboarding/components/GameLogo';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import type { GameId } from '@/src/features/onboarding/types';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import { loadArenaMatches } from '../api';
import type { ArenaMatch } from '../types';
import { gameKey, gameLabel, matchPhase, predictionIsOpen } from '../utils';

type StatusFilter = 'upcoming' | 'finished';
type GameFilter = 'followed' | GameId;

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
};

const GAME_FILTERS: { id: GameFilter; label: string }[] = [
  { id: 'followed', label: 'POUR TOI' },
  { id: 'lol', label: 'LOL' },
  { id: 'valorant', label: 'VAL' },
  { id: 'cs2', label: 'CS2' },
];

const GAME_BACKGROUNDS: Record<GameId, ImageSourcePropType> = {
  lol: require('../../../../assets/onboarding/lol-characters.jpg'),
  valorant: require('../../../../assets/onboarding/valorant-characters.jpg'),
  cs2: require('../../../../assets/onboarding/cs2-operators.jpg'),
};

const GAME_ACCENTS: Record<GameId, string> = {
  lol: '#72C7F4',
  valorant: '#FF6170',
  cs2: '#F2A34B',
};

export default function MatchesScreen() {
  const { profile, session } = useAuth();
  const [upcoming, setUpcoming] = useState<ArenaMatch[]>([]);
  const [finished, setFinished] = useState<ArenaMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!session?.user.id) {
      setUpcoming([]);
      setFinished([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const data = await loadArenaMatches(session.user.id);
      setUpcoming(data.upcoming);
      setFinished(data.finished);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de charger les matchs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user.id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <MatchesExperience
      error={error}
      finished={finished}
      followedGames={profile?.jeux_suivis ?? []}
      isAdmin={Boolean(profile?.est_admin)}
      loading={loading}
      onRefresh={() => void load(true)}
      onRetry={() => void load()}
      refreshing={refreshing}
      upcoming={upcoming}
    />
  );
}

export function MatchesExperience({
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
}: MatchesExperienceProps) {
  const reduceMotion = useReducedMotion();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view;
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
  const callCount = useMemo(
    () => scopedMatches.filter((match) => Boolean(match.prediction)).length,
    [scopedMatches],
  );
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
  const entrance = (delay: number) => reduceMotion ? undefined : FadeInDown.delay(delay).duration(380);

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
        <ClutchHeader economy={headerEconomy} />

        <Animated.View entering={entrance(30)}>
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
        </Animated.View>

        <Animated.View entering={entrance(90)}>
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
        </Animated.View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={onRetry}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
          </View>
        ) : null}

        {loading ? (
          <MatchSkeleton />
        ) : visibleMatches.length ? (
          <Animated.View entering={entrance(150)} style={styles.matchesSection}>
            {callsOnly ? <CallsRecap matches={filtered} status={status} /> : null}
            <SectionHead callsOnly={callsOnly} count={visibleMatches.length} date={activeDate} status={status} />
            {liveMatches.length ? (
              <View style={styles.liveStack}>
                {liveMatches.map((match) => <LiveMatchCard key={match.id} match={match} />)}
              </View>
            ) : null}
            {standardMatches.length ? (
              <View style={styles.matchList}>
                {standardMatches.map((match) => <MatchRow key={match.id} match={match} />)}
              </View>
            ) : null}
          </Animated.View>
        ) : (
          <EmptyArena callsOnly={callsOnly} query={query} status={status} />
        )}
      </ScrollView>
    </Screen>
  );
}

type ScheduleHeroProps = {
  activeDayKey: string;
  calendarDays: Date[];
  matches: ArenaMatch[];
  monthLabel: string;
  onQueryChange: (value: string) => void;
  onSelectDay: (value: string) => void;
  onToggleHistory: () => void;
  onToggleSearch: () => void;
  query: string;
  searchOpen: boolean;
  status: StatusFilter;
  visualGame: GameId;
};

function ScheduleHero({
  activeDayKey,
  calendarDays,
  matches,
  monthLabel,
  onQueryChange,
  onSelectDay,
  onToggleHistory,
  onToggleSearch,
  query,
  searchOpen,
  status,
  visualGame,
}: ScheduleHeroProps) {
  return (
    <View style={styles.scheduleHero}>
      <Animated.View entering={FadeIn.duration(260)} key={visualGame} style={StyleSheet.absoluteFill}>
        <Image resizeMode="cover" source={GAME_BACKGROUNDS[visualGame]} style={styles.scheduleBackdrop} />
      </Animated.View>
      <LinearGradient colors={['rgba(3,7,10,.14)', 'rgba(3,7,10,.52)', 'rgba(3,7,10,.97)']} end={{ x: .5, y: 1 }} start={{ x: .5, y: 0 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[`${GAME_ACCENTS[visualGame]}33`, 'transparent', 'rgba(232,255,61,.09)']} end={{ x: 1, y: .8 }} start={{ x: 0, y: .2 }} style={StyleSheet.absoluteFill} />

      <View style={styles.scheduleTop}>
        {searchOpen ? (
          <View style={styles.searchField}>
            <SearchIcon color="#F5F7F8" size={17} />
            <TextInput
              autoFocus
              onChangeText={onQueryChange}
              placeholder="Équipe ou compétition"
              placeholderTextColor="rgba(255,255,255,.58)"
              style={styles.searchInput}
              value={query}
            />
          </View>
        ) : (
          <View style={styles.arenaMark}>
            <View style={styles.arenaMarkDot} />
            <Text style={styles.arenaMarkText}>CLUTCH ARENA</Text>
          </View>
        )}
        <View style={styles.scheduleActions}>
          <Pressable
            accessibilityLabel={searchOpen ? 'Fermer la recherche' : 'Rechercher un match'}
            accessibilityRole="button"
            onPress={onToggleSearch}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            {searchOpen ? <CloseIcon color="#F5F7F8" size={17} /> : <SearchIcon color="#F5F7F8" size={18} />}
          </Pressable>
          <Pressable
            accessibilityLabel={status === 'upcoming' ? 'Afficher les résultats' : 'Afficher les prochains matchs'}
            accessibilityRole="button"
            onPress={onToggleHistory}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <CalendarIcon color="#F5F7F8" size={18} />
          </Pressable>
        </View>
      </View>

      <View style={styles.scheduleCopy}>
        <Text style={styles.scheduleTitle}>{status === 'upcoming' ? 'PROCHAINS MATCHS' : 'SCORES & RÉSULTATS'}</Text>
        <Text style={styles.scheduleMonth}>{monthLabel}</Text>
      </View>

      <View style={styles.daysRow}>
        {calendarDays.map((day) => {
          const key = dateKey(day);
          const active = key === activeDayKey;
          const hasMatch = matches.some((match) => dateKey(new Date(match.debut)) === key);
          return (
            <Pressable
              accessibilityLabel={formatFullDate(day)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={key}
              onPress={() => onSelectDay(key)}
              style={({ pressed }) => [styles.dayButton, active && styles.dayButtonActive, pressed && styles.dayButtonPressed]}
            >
              <Text style={[styles.dayName, active && styles.dayTextActive]}>{formatWeekday(day)}</Text>
              <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{day.getDate()}</Text>
              <View style={[styles.dayMatchDot, hasMatch && styles.dayMatchDotVisible, active && hasMatch && styles.dayMatchDotActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type ArenaFiltersProps = {
  callCount: number;
  callsOnly: boolean;
  game: GameFilter;
  isAdmin: boolean;
  onCallsOnlyChange: (value: boolean) => void;
  onGameChange: (value: GameFilter) => void;
  onStatusChange: (value: StatusFilter) => void;
  status: StatusFilter;
};

function ArenaFilters({ callCount, callsOnly, game, isAdmin, onCallsOnlyChange, onGameChange, onStatusChange, status }: ArenaFiltersProps) {
  return (
    <View style={styles.filterPanel}>
      <View style={styles.gameRow}>
        {GAME_FILTERS.map((filter) => {
          const active = game === filter.id;
          return (
            <Pressable
              accessibilityLabel={`Filtrer sur ${filter.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={filter.id}
              onPress={() => onGameChange(filter.id)}
              style={({ pressed }) => [styles.gameFilter, active && styles.gameFilterActive, pressed && styles.pressed]}
            >
              <View style={[styles.gameIcon, active && styles.gameIconActive]}>
                {filter.id === 'followed' ? (
                  <Text style={[styles.allGamesGlyph, active && styles.allGamesGlyphActive]}>C</Text>
                ) : (
                  <GameLogo color={active ? '#070A0E' : '#8B96A2'} game={filter.id} size={17} />
                )}
              </View>
              <Text style={[styles.gameFilterText, active && styles.gameFilterTextActive]}>{filter.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.modeRow}>
        <View style={styles.statusSwitch}>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: status === 'upcoming' }} onPress={() => onStatusChange('upcoming')} style={[styles.statusButton, status === 'upcoming' && styles.statusButtonActive]}>
            <Text style={[styles.statusText, status === 'upcoming' && styles.statusTextActive]}>À VENIR</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ selected: status === 'finished' }} onPress={() => onStatusChange('finished')} style={[styles.statusButton, status === 'finished' && styles.statusButtonActive]}>
            <Text style={[styles.statusText, status === 'finished' && styles.statusTextActive]}>RÉSULTATS</Text>
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: callsOnly }} onPress={() => onCallsOnlyChange(!callsOnly)} style={[styles.callsButton, callsOnly && styles.callsButtonActive]}>
          <View style={[styles.callsDot, callsOnly && styles.callsDotActive]} />
          <View style={styles.callsButtonCopy}>
            <Text style={[styles.callsText, callsOnly && styles.callsTextActive]}>MES CALLS</Text>
            <Text style={[styles.callsCount, callsOnly && styles.callsCountActive]}>{callCount} {status === 'upcoming' ? 'EN COURS' : callCount > 1 ? 'VERDICTS' : 'VERDICT'}</Text>
          </View>
        </Pressable>
      </View>

      {isAdmin ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/admin/matches' as never)} style={styles.adminLink}>
          <Text style={styles.adminLinkText}>ADMINISTRER LE CALENDRIER</Text>
          <Text style={styles.adminLinkArrow}>→</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CallsRecap({ matches, status }: { matches: ArenaMatch[]; status: StatusFilter }) {
  const live = matches.filter((match) => matchPhase(match) === 'live').length;
  const settled = matches.filter((match) => match.prediction?.statut === 'gagne' || match.prediction?.statut === 'perdu');
  const wins = settled.filter((match) => match.prediction?.statut === 'gagne').length;
  const accuracy = settled.length ? `${Math.round((wins / settled.length) * 100)}%` : '—';
  const delta = settled.reduce((total, match) => total + Number(match.prediction?.delta_frags ?? 0), 0);

  return (
    <View style={styles.callsRecap}>
      <View style={styles.callsRecapTop}>
        <View style={styles.callsRecapCopy}>
          <Text style={styles.callsRecapEyebrow}>MES CALLS // {status === 'upcoming' ? 'EN COURS' : 'RÉSULTATS'}</Text>
          <Text style={styles.callsRecapTitle}>{status === 'upcoming' ? 'TES CHOIX, AU MÊME ENDROIT.' : 'TES VERDICTS, EN UN COUP D’ŒIL.'}</Text>
        </View>
        <View style={styles.callsRecapMark}><Text style={styles.callsRecapMarkText}>C</Text></View>
      </View>
      <View style={styles.callsRecapMetrics}>
        {status === 'upcoming' ? (
          <>
            <CallsRecapMetric label="CALLS" value={String(matches.length)} />
            <CallsRecapMetric label="EN LIVE" value={String(live)} />
            <CallsRecapMetric label="EN ATTENTE" value={String(Math.max(0, matches.length - live))} />
          </>
        ) : (
          <>
            <CallsRecapMetric label="VERDICTS" value={String(settled.length)} />
            <CallsRecapMetric label="RÉUSSITE" value={accuracy} />
            <CallsRecapMetric featured label="BILAN" value={signedFrags(delta)} />
          </>
        )}
      </View>
      <View style={styles.callsLoop}>
        <Text style={styles.callsLoopStep}>CALL</Text><Text style={styles.callsLoopArrow}>→</Text>
        <Text style={styles.callsLoopStep}>VERDICT</Text><Text style={styles.callsLoopArrow}>→</Text>
        <Text style={styles.callsLoopStepFeatured}>RATING FRAGS</Text>
      </View>
    </View>
  );
}

function CallsRecapMetric({ featured = false, label, value }: { featured?: boolean; label: string; value: string }) {
  return <View style={styles.callsRecapMetric}><Text style={[styles.callsRecapMetricValue, featured && styles.callsRecapMetricFeatured]}>{value}</Text><Text style={styles.callsRecapMetricLabel}>{label}</Text></View>;
}

function SectionHead({ callsOnly, count, date, status }: { callsOnly: boolean; count: number; date: Date; status: StatusFilter }) {
  return (
    <View style={styles.sectionHead}>
      <View>
        <Text style={styles.sectionEyebrow}>{callsOnly ? status === 'upcoming' ? 'TES CALLS À VENIR' : 'TES VERDICTS' : status === 'upcoming' ? 'PROGRAMME DU JOUR' : 'VERDICTS DU JOUR'}</Text>
        <Text style={styles.sectionTitle}>{formatSectionDate(date)}</Text>
      </View>
      <View style={styles.countPill}><Text style={styles.countText}>{count} MATCH{count > 1 ? 'S' : ''}</Text></View>
    </View>
  );
}

function LiveMatchCard({ match }: { match: ArenaMatch }) {
  const game = toGameId(match.jeu) ?? 'lol';
  const callTag = predictionTag(match);
  return (
    <Pressable accessibilityHint="Ouvre le Match Center" accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}, en direct`} accessibilityRole="button" onPress={() => openMatch(match.id)} style={({ pressed }) => [styles.liveCard, pressed && styles.pressed]}>
      <Image resizeMode="cover" source={GAME_BACKGROUNDS[game]} style={styles.liveBackdrop} />
      <LinearGradient colors={['rgba(3,6,9,.25)', 'rgba(3,6,9,.73)', 'rgba(3,6,9,.98)']} end={{ x: .5, y: 1 }} start={{ x: .5, y: 0 }} style={StyleSheet.absoluteFill} />
      <View style={styles.liveTop}>
        <Text numberOfLines={1} style={styles.liveEvent}>{gameLabel(match.jeu).toUpperCase()} · {match.evenement}</Text>
        <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
      </View>
      <View style={styles.liveDuel}>
        <LiveTeam accent="#66B3FF" name={match.equipe_a} tag={match.tag_a} />
        <View style={styles.liveScore}><Text style={styles.liveBo}>BO{match.format}</Text><Text style={styles.liveScoreText}>{match.score_a ?? 0}–{match.score_b ?? 0}</Text></View>
        <LiveTeam accent="#FF6C7C" name={match.equipe_b} tag={match.tag_b} />
      </View>
      <View style={styles.liveFooter}><Text style={[styles.liveFooterText, callTag && styles.liveFooterCall]}>{callTag ? `TON CALL · ${callTag}` : 'SUIVRE LE MATCH'}</Text><Text style={styles.liveFooterArrow}>→</Text></View>
    </Pressable>
  );
}

function LiveTeam({ accent, name, tag }: { accent: string; name: string; tag: string }) {
  return <View style={styles.liveTeam}><TeamLogo accent={accent} name={name} size={56} tag={tag} /><Text numberOfLines={1} style={styles.liveTeamTag}>{tag}</Text></View>;
}

function MatchRow({ match }: { match: ArenaMatch }) {
  const phase = matchPhase(match);
  const finished = phase === 'finished';
  const callTag = predictionTag(match);
  const verdict = predictionVerdict(match);
  const open = predictionIsOpen(match);
  const state = verdict || (callTag ? `CALL · ${callTag}` : finished ? 'FINAL' : open ? 'OUVERT' : 'CLOS');
  return (
    <Pressable accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}${callTag ? `, ton call ${callTag}` : ''}`} accessibilityRole="button" onPress={() => openMatch(match.id)} style={({ pressed }) => [styles.matchRow, pressed && styles.pressed]}>
      <View style={styles.rowWhen}><Text style={styles.rowTime}>{finished ? 'FINAL' : formatTime(match.debut)}</Text><Text style={styles.rowGame}>{gameLabel(match.jeu)}</Text></View>
      <View style={styles.rowLogos}><TeamLogo accent="#5BABFF" name={match.equipe_a} size={34} tag={match.tag_a} /><View style={styles.rowLogoOverlap}><TeamLogo accent="#FF6375" name={match.equipe_b} size={34} tag={match.tag_b} /></View></View>
      <View style={styles.rowMain}><Text numberOfLines={1} style={styles.rowEvent}>{match.evenement} · BO{match.format}</Text><Text numberOfLines={1} style={styles.rowTeams}>{match.tag_a}  {finished ? `${match.score_a ?? 0} — ${match.score_b ?? 0}` : 'VS'}  {match.tag_b}</Text></View>
      <View style={styles.rowTrailing}><Text style={[styles.rowState, (callTag || open) && styles.rowStateAccent, verdict && Number(match.prediction?.delta_frags ?? 0) < 0 && styles.rowStateLoss]}>{state}</Text><Text style={styles.rowArrow}>›</Text></View>
    </Pressable>
  );
}

function EmptyArena({ callsOnly, query, status }: { callsOnly: boolean; query: string; status: StatusFilter }) {
  const filtered = Boolean(query.trim()) || callsOnly;
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyEyebrow}>{filtered ? 'FILTRE ACTIF' : status === 'upcoming' ? 'CALENDRIER' : 'HISTORIQUE'}</Text>
      <Text style={styles.emptyTitle}>{filtered ? 'AUCUN MATCH NE CORRESPOND.' : status === 'upcoming' ? 'JOURNÉE SANS AFFICHE.' : 'AUCUN VERDICT CE JOUR-LÀ.'}</Text>
      <Text style={styles.emptyCopy}>{filtered ? 'Change de jeu, de date ou désactive Mes calls.' : 'Choisis une autre date dans le calendrier.'}</Text>
    </View>
  );
}

function MatchSkeleton() {
  return <View style={styles.skeleton}><View style={styles.skeletonHead} /><View style={styles.skeletonRow} /><View style={styles.skeletonRow} /></View>;
}

function SearchIcon({ color, size }: { color: string; size: number }) {
  return <Svg height={size} viewBox="0 0 24 24" width={size}><Circle cx="10.8" cy="10.8" fill="none" r="6.8" stroke={color} strokeWidth="2" /><Path d="m16 16 4.4 4.4" fill="none" stroke={color} strokeLinecap="round" strokeWidth="2" /></Svg>;
}

function CalendarIcon({ color, size }: { color: string; size: number }) {
  return <Svg height={size} viewBox="0 0 24 24" width={size}><Path d="M6.5 3v3M17.5 3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></Svg>;
}

function CloseIcon({ color, size }: { color: string; size: number }) {
  return <Svg height={size} viewBox="0 0 24 24" width={size}><Path d="m6 6 12 12M18 6 6 18" fill="none" stroke={color} strokeLinecap="round" strokeWidth="2" /></Svg>;
}

function filterMatches(matches: ArenaMatch[], game: GameFilter, followed: string[], callsOnly: boolean, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase('fr-FR');
  return matches.filter((match) => {
    const matchesGame = game === 'followed' ? followedGame(followed, match.jeu) : toGameId(match.jeu) === game;
    if (!matchesGame || (callsOnly && !match.prediction)) return false;
    if (!normalizedQuery) return true;
    return [match.equipe_a, match.tag_a, match.equipe_b, match.tag_b, match.evenement, match.jeu]
      .some((value) => value.toLocaleLowerCase('fr-FR').includes(normalizedQuery));
  });
}

function followedGame(followed: string[], game: string) {
  if (!followed.length) return true;
  const key = toGameId(game);
  return key ? followed.includes(key) : false;
}

function toGameId(game?: string | null): GameId | null {
  if (!game) return null;
  const key = gameKey(game);
  if (key === 'LoL') return 'lol';
  if (key === 'VALORANT') return 'valorant';
  if (key === 'CS2') return 'cs2';
  return null;
}

function buildCalendarDays(status: StatusFilter, matches: ArenaMatch[]) {
  const today = startOfDay(new Date());
  const validDates = matches.map((match) => startOfDay(new Date(match.debut))).filter((date) => !Number.isNaN(date.getTime()));
  if (status === 'upcoming') {
    const earliest = validDates.reduce<Date | null>((current, date) => !current || date < current ? date : current, null);
    const start = earliest && earliest > addDays(today, 6) ? earliest : today;
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }
  const latest = validDates.reduce<Date | null>((current, date) => !current || date > current ? date : current, null);
  const end = latest && latest < addDays(today, -6) ? latest : today;
  return Array.from({ length: 7 }, (_, index) => addDays(end, index - 6));
}

function findDefaultDayKey(days: Date[], matches: ArenaMatch[], status: StatusFilter) {
  const dayKeys = new Set(matches.map((match) => dateKey(new Date(match.debut))));
  if (status === 'upcoming') {
    const live = matches.find((match) => matchPhase(match) === 'live');
    const liveKey = live ? dateKey(new Date(live.debut)) : null;
    if (liveKey && days.some((day) => dateKey(day) === liveKey)) return liveKey;
    const first = days.find((day) => dayKeys.has(dateKey(day)));
    return dateKey(first ?? days[0]);
  }
  const reversed = [...days].reverse();
  const last = reversed.find((day) => dayKeys.has(dateKey(day)));
  return dateKey(last ?? reversed[0]);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatWeekday(date: Date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').slice(0, 3).toUpperCase();
}

function formatMonth(date: Date) {
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }).replace('.', '').toUpperCase();
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatSectionDate(date: Date) {
  const today = startOfDay(new Date());
  if (dateKey(date) === dateKey(today)) return "AUJOURD'HUI";
  if (dateKey(date) === dateKey(addDays(today, 1))) return 'DEMAIN';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function predictionTag(match: ArenaMatch) {
  if (!match.prediction) return null;
  return match.prediction.choix === 'a' ? match.tag_a : match.tag_b;
}

function predictionVerdict(match: ArenaMatch) {
  const prediction = match.prediction;
  if (!prediction || (prediction.statut !== 'gagne' && prediction.statut !== 'perdu')) return null;
  const delta = Number(prediction.delta_frags ?? 0);
  return `${delta >= 0 ? '+' : '−'}${Math.abs(delta)} FRAGS`;
}

function signedFrags(value: number) {
  const amount = Math.round(Number(value) || 0);
  return `${amount >= 0 ? '+' : '−'}${Math.abs(amount)}`;
}

function openMatch(id: string) {
  router.push({ pathname: '/match/[id]', params: { id } });
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: layout.tabBarContentInset, gap: 14 },
  scheduleHero: { position: 'relative', minHeight: 244, marginHorizontal: spacing.md, overflow: 'hidden', borderRadius: 27, backgroundColor: '#101820', borderWidth: 1, borderColor: '#2B3540', padding: 14 },
  scheduleBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  scheduleTop: { zIndex: 2, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  arenaMark: { minHeight: 31, paddingHorizontal: 10, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(5,9,12,.48)', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)' },
  arenaMarkDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  arenaMarkText: { ...typography.eyebrow, color: '#F4F7F8', letterSpacing: 1 },
  searchField: { flex: 1, height: 36, paddingHorizontal: 11, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(5,9,12,.74)', borderWidth: 1, borderColor: 'rgba(255,255,255,.26)' },
  searchInput: { ...typography.bodyStrong, flex: 1, color: '#FFFFFF' },
  scheduleActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(5,9,12,.52)', borderWidth: 1, borderColor: 'rgba(255,255,255,.17)' },
  scheduleCopy: { zIndex: 2, marginTop: 'auto', marginBottom: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  scheduleTitle: { ...typography.displaySmall, maxWidth: 275, color: '#F8FAFA' },
  scheduleMonth: { ...typography.eyebrow, marginBottom: 3, color: 'rgba(255,255,255,.76)', letterSpacing: .7 },
  daysRow: { zIndex: 2, flexDirection: 'row', gap: 5 },
  dayButton: { flex: 1, minWidth: 0, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(234,244,216,.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,.09)' },
  dayButtonActive: { backgroundColor: '#F5F6F0', borderColor: '#FFFFFF' },
  dayButtonPressed: { transform: [{ scale: .96 }] },
  dayName: { ...typography.label, color: 'rgba(255,255,255,.72)' },
  dayNumber: { ...typography.bodyStrong, marginTop: 3, color: '#FFFFFF' },
  dayTextActive: { color: '#0A0E11' },
  dayMatchDot: { width: 4, height: 4, marginTop: 3, borderRadius: 2, backgroundColor: 'transparent' },
  dayMatchDotVisible: { backgroundColor: colors.volt },
  dayMatchDotActive: { backgroundColor: '#0A0E11' },
  filterPanel: { marginHorizontal: spacing.md, padding: 7, borderRadius: 20, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#222B34', gap: 7 },
  gameRow: { flexDirection: 'row', gap: 5 },
  gameFilter: { flex: 1, minHeight: 44, paddingHorizontal: 5, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  gameFilterActive: { backgroundColor: '#151B10', borderWidth: 1, borderColor: '#47531F' },
  gameIcon: { width: 23, height: 23, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151B21' },
  gameIconActive: { backgroundColor: colors.volt },
  allGamesGlyph: { color: '#8B96A2', fontFamily: fonts.display, fontSize: 14 },
  allGamesGlyphActive: { color: '#070A0E' },
  gameFilterText: { ...typography.label, color: colors.textMuted, letterSpacing: .25 },
  gameFilterTextActive: { color: '#F4F6F7' },
  modeRow: { minHeight: 46, flexDirection: 'row', gap: 7 },
  statusSwitch: { flex: 1, minHeight: 44, padding: 3, borderRadius: 14, flexDirection: 'row', backgroundColor: '#070B0F', borderWidth: 1, borderColor: '#202832' },
  statusButton: { flex: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statusButtonActive: { backgroundColor: '#202830' },
  statusText: { ...typography.label, color: colors.textMuted, letterSpacing: .25 },
  statusTextActive: { color: '#F5F7F8' },
  callsButton: { minWidth: 118, paddingHorizontal: 9, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#070B0F', borderWidth: 1, borderColor: '#202832' },
  callsButtonActive: { backgroundColor: '#161D0F', borderColor: '#4B5820' },
  callsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4B5661' },
  callsDotActive: { backgroundColor: colors.volt },
  callsButtonCopy: { minWidth: 0 },
  callsText: { ...typography.label, color: colors.textMuted, letterSpacing: .2 },
  callsTextActive: { color: colors.volt },
  callsCount: { ...typography.caption, marginTop: 1, color: '#596570' },
  callsCountActive: { color: '#AEBB73' },
  adminLink: { minHeight: 34, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#202832' },
  adminLinkText: { ...typography.action, color: colors.textMuted, letterSpacing: .5 },
  adminLinkArrow: { color: colors.volt, fontSize: 14 },
  errorCard: { marginHorizontal: spacing.md, padding: 13, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027', flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  errorText: { ...typography.body, flex: 1, color: '#FF9AA2' },
  retry: { ...typography.action, color: colors.volt },
  matchesSection: { marginHorizontal: spacing.md, gap: 12 },
  callsRecap: { padding: 14, borderRadius: 22, backgroundColor: '#10160E', borderWidth: 1, borderColor: '#3E4A1E', gap: 12 },
  callsRecapTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  callsRecapCopy: { flex: 1, minWidth: 0 },
  callsRecapEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 },
  callsRecapTitle: { ...typography.cardTitle, marginTop: 5, color: colors.text },
  callsRecapMark: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  callsRecapMarkText: { color: '#070A0E', fontFamily: fonts.display, fontSize: 18 },
  callsRecapMetrics: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#2C361B' },
  callsRecapMetric: { flex: 1, alignItems: 'center' },
  callsRecapMetricValue: { ...typography.metricSmall, color: colors.text },
  callsRecapMetricFeatured: { color: colors.volt },
  callsRecapMetricLabel: { ...typography.eyebrow, marginTop: 2, color: colors.textMuted, letterSpacing: .35 },
  callsLoop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  callsLoopStep: { ...typography.label, color: colors.textMuted, letterSpacing: .25 },
  callsLoopStepFeatured: { ...typography.label, color: colors.volt, letterSpacing: .25 },
  callsLoopArrow: { color: '#4C5830', fontFamily: fonts.bold, fontSize: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  sectionEyebrow: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: 1.1 },
  sectionTitle: { ...typography.sectionTitle, marginTop: 4, color: colors.text },
  countPill: { minHeight: 27, paddingHorizontal: 10, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#11171D', borderWidth: 1, borderColor: '#29323B' },
  countText: { ...typography.label, color: colors.textSubtle, letterSpacing: .4 },
  liveStack: { gap: 10 },
  liveCard: { minHeight: 240, overflow: 'hidden', borderRadius: 26, backgroundColor: '#111820', borderWidth: 1, borderColor: '#394550', padding: 15 },
  liveBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  liveTop: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  liveEvent: { ...typography.label, flex: 1, color: 'rgba(255,255,255,.76)', letterSpacing: .35 },
  livePill: { minHeight: 28, paddingHorizontal: 10, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.liveSurface, borderWidth: 1, borderColor: colors.liveBorder },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live },
  liveText: { ...typography.eyebrow, color: colors.liveText, letterSpacing: .7 },
  liveDuel: { zIndex: 2, marginTop: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  liveTeam: { width: 74, alignItems: 'center', gap: 7 },
  liveTeamTag: { ...typography.bodyStrong, color: '#FFFFFF' },
  liveScore: { alignItems: 'center' },
  liveBo: { ...typography.eyebrow, color: 'rgba(255,255,255,.58)', letterSpacing: .7 },
  liveScoreText: { ...typography.displayMedium, marginTop: 5, color: '#FFFFFF' },
  liveFooter: { zIndex: 2, minHeight: 38, marginTop: 'auto', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.13)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveFooterText: { ...typography.action, color: '#D5DBDF', letterSpacing: .7 },
  liveFooterCall: { color: colors.volt },
  liveFooterArrow: { color: colors.volt, fontSize: 17 },
  matchList: { overflow: 'hidden', borderRadius: 20, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#222B34' },
  matchRow: { minHeight: 98, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: '#192129' },
  rowWhen: { width: 43 },
  rowTime: { ...typography.bodyStrong, color: '#F3F6F7' },
  rowGame: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  rowLogos: { width: 52, flexDirection: 'row', alignItems: 'center' },
  rowLogoOverlap: { marginLeft: -15 },
  rowMain: { flex: 1, minWidth: 0 },
  rowEvent: { ...typography.caption, color: colors.textMuted },
  rowTeams: { ...typography.bodyStrong, marginTop: 5, color: colors.text },
  rowTrailing: { minWidth: 58, alignItems: 'flex-end', gap: 2 },
  rowState: { ...typography.label, color: colors.textMuted, letterSpacing: .15 },
  rowStateAccent: { color: colors.volt },
  rowStateLoss: { color: colors.danger },
  rowArrow: { color: colors.volt, fontSize: 16 },
  emptyCard: { minHeight: 210, marginHorizontal: spacing.md, justifyContent: 'center', padding: 24, borderRadius: 26, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#252E37' },
  emptyEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.3 },
  emptyTitle: { ...typography.displaySmall, marginTop: 10, color: colors.text },
  emptyCopy: { ...typography.body, marginTop: 10, color: colors.textMuted },
  skeleton: { marginHorizontal: spacing.md, gap: 10 },
  skeletonHead: { width: 180, height: 30, borderRadius: 12, backgroundColor: '#131A21' },
  skeletonRow: { height: 88, borderRadius: 20, backgroundColor: '#10161C', borderWidth: 1, borderColor: '#202832' },
  pressed: { opacity: .76 },
});
