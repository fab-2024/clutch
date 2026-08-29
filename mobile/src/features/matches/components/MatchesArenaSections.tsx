import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import GameLogo from '@/src/features/onboarding/components/GameLogo';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import type { GameId } from '@/src/features/onboarding/types';
import { openMatchCenter, warmMatchCenter, type MatchCenterTarget } from '../matchCenterNavigation';
import type { ArenaMatch } from '../types';
import { gameKey, gameLabel, matchPhase, predictionIsOpen } from '../utils';
import { styles } from './MatchesScreen.styles';

export type StatusFilter = 'upcoming' | 'finished';
export type GameFilter = 'followed' | GameId;

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

export function ScheduleHero({
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
  const { isShortLandscape } = useResponsiveLayout();

  return (
    <View
      style={[styles.scheduleHero, isShortLandscape && styles.scheduleHeroLandscape]}
      testID="matches-schedule-hero"
    >
      <Animated.View entering={FadeIn.duration(260)} key={visualGame} style={StyleSheet.absoluteFill}>
        <Image resizeMode="cover" source={GAME_BACKGROUNDS[visualGame]} style={styles.scheduleBackdrop} />
      </Animated.View>
      <LinearGradient
        colors={['#0B1116', 'rgba(5,10,14,.97)', `${GAME_ACCENTS[visualGame]}14`]}
        end={{ x: 1, y: .5 }}
        start={{ x: 0, y: .5 }}
        style={StyleSheet.absoluteFill}
      />

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
          <View style={styles.scheduleHeading}>
            <Text numberOfLines={1} style={styles.scheduleTitle}>
              {status === 'upcoming' ? 'PROCHAINS MATCHS' : 'SCORES & RÉSULTATS'}
            </Text>
            <Text numberOfLines={1} style={styles.scheduleMonth}>{monthLabel}</Text>
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
              style={({ pressed }) => [styles.dayButton, isShortLandscape && styles.dayButtonLandscape, active && styles.dayButtonActive, pressed && styles.dayButtonPressed]}
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

export function ArenaFilters({ callCount, callsOnly, game, isAdmin, onCallsOnlyChange, onGameChange, onStatusChange, status }: ArenaFiltersProps) {
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
        {callsOnly ? (
          <View style={styles.callsModeInfo}>
            <Text style={styles.callsModeInfoText}>MES CALLS</Text>
            <Text style={styles.callsModeInfoMeta}>OUVERTS, VERROUILLÉS ET RÉGLÉS</Text>
          </View>
        ) : (
          <View style={styles.statusSwitch}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: status === 'upcoming' }} onPress={() => onStatusChange('upcoming')} style={[styles.statusButton, status === 'upcoming' && styles.statusButtonActive]}>
              <Text style={[styles.statusText, status === 'upcoming' && styles.statusTextActive]}>À VENIR</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: status === 'finished' }} onPress={() => onStatusChange('finished')} style={[styles.statusButton, status === 'finished' && styles.statusButtonActive]}>
              <Text style={[styles.statusText, status === 'finished' && styles.statusTextActive]}>RÉSULTATS</Text>
            </Pressable>
          </View>
        )}
        <Pressable accessibilityRole="button" accessibilityState={{ selected: callsOnly }} onPress={() => onCallsOnlyChange(!callsOnly)} style={[styles.callsButton, callsOnly && styles.callsButtonActive]}>
          <View style={[styles.callsDot, callsOnly && styles.callsDotActive]} />
          <View style={styles.callsButtonCopy}>
            <Text style={[styles.callsText, callsOnly && styles.callsTextActive]}>MES CALLS</Text>
            <Text style={[styles.callsCount, callsOnly && styles.callsCountActive]}>{callsOnly ? 'OUVERT' : `${callCount} VERROUILLÉ${callCount > 1 ? 'S' : ''}`}</Text>
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

export function SectionHead({ callsOnly, count, date, status }: { callsOnly: boolean; count: number; date: Date; status: StatusFilter }) {
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

export function LiveMatchCard({ match, onPrepareMatch, rivalId, rivalPseudo }: { match: ArenaMatch; onPrepareMatch?: (match: MatchCenterTarget) => void; rivalId?: string; rivalPseudo?: string }) {
  const game = toGameId(match.jeu) ?? 'lol';
  const callTag = predictionTag(match);
  const target = arenaTransitionTarget(match, '#66B3FF', '#FF6C7C');
  const prepare = () => onPrepareMatch ? onPrepareMatch(target) : warmMatchCenter(target);
  return (
    <Pressable accessibilityHint="Ouvre le Match Center" accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}, en direct`} accessibilityRole="button" onPress={() => { prepare(); openMatchCenter(target, { rivalId, rivalPseudo, source: 'matches' }); }} onPressIn={prepare} style={({ pressed }) => [styles.liveCard, pressed && styles.pressed]}>
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

export function MatchRow({ match, onPrepareMatch, rivalId, rivalPseudo }: { match: ArenaMatch; onPrepareMatch?: (match: MatchCenterTarget) => void; rivalId?: string; rivalPseudo?: string }) {
  const phase = matchPhase(match);
  const finished = phase === 'finished';
  const callTag = predictionTag(match);
  const verdict = predictionVerdict(match);
  const open = predictionIsOpen(match);
  const state = verdict || (callTag ? `CALL · ${callTag}` : finished ? 'FINAL' : open ? 'OUVERT' : 'CLOS');
  const target = arenaTransitionTarget(match, '#5BABFF', '#FF6375');
  const prepare = () => onPrepareMatch ? onPrepareMatch(target) : warmMatchCenter(target);
  return (
    <Pressable accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}${callTag ? `, ton call ${callTag}` : ''}`} accessibilityRole="button" onPress={() => { prepare(); openMatchCenter(target, { rivalId, rivalPseudo, source: 'matches' }); }} onPressIn={prepare} style={({ pressed }) => [styles.matchRow, pressed && styles.pressed]}>
      <View style={styles.rowWhen}><Text style={styles.rowTime}>{finished ? 'FINAL' : formatTime(match.debut)}</Text><Text style={styles.rowGame}>{gameLabel(match.jeu)}</Text></View>
      <View style={styles.rowLogos}><TeamLogo accent="#5BABFF" name={match.equipe_a} size={34} tag={match.tag_a} /><View style={styles.rowLogoOverlap}><TeamLogo accent="#FF6375" name={match.equipe_b} size={34} tag={match.tag_b} /></View></View>
      <View style={styles.rowMain}><Text numberOfLines={1} style={styles.rowEvent}>{match.evenement} · BO{match.format}</Text><Text numberOfLines={1} style={styles.rowTeams}>{match.tag_a}  {finished ? `${match.score_a ?? 0} — ${match.score_b ?? 0}` : 'VS'}  {match.tag_b}</Text></View>
      <View style={styles.rowTrailing}><Text style={[styles.rowState, (callTag || open) && styles.rowStateAccent, verdict && Number(match.prediction?.delta_frags ?? 0) < 0 && styles.rowStateLoss]}>{state}</Text><Text style={styles.rowArrow}>›</Text></View>
    </Pressable>
  );
}

export function EmptyArena({ callsOnly, query, status }: { callsOnly: boolean; query: string; status: StatusFilter }) {
  const filtered = Boolean(query.trim()) || callsOnly;
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyEyebrow}>{filtered ? 'FILTRE ACTIF' : status === 'upcoming' ? 'CALENDRIER' : 'HISTORIQUE'}</Text>
      <Text style={styles.emptyTitle}>{filtered ? 'AUCUN MATCH NE CORRESPOND.' : status === 'upcoming' ? 'JOURNÉE SANS AFFICHE.' : 'AUCUN VERDICT CE JOUR-LÀ.'}</Text>
      <Text style={styles.emptyCopy}>{filtered ? 'Change de jeu, de date ou désactive Mes calls.' : 'Choisis une autre date dans le calendrier.'}</Text>
    </View>
  );
}

export function MatchSkeleton() {
  return (
    <SkeletonGroup label="Chargement des matchs" style={styles.skeleton} testID="matches-loading">
      <View style={styles.skeletonHead}>
        <View style={styles.skeletonHeadCopy}>
          <Skeleton height={8} radius="pill" tone="subtle" width={92} />
          <Skeleton height={24} radius="sm" width={178} />
        </View>
        <Skeleton height={27} radius="pill" width={46} />
      </View>
      <View style={styles.skeletonList}>
        {[0, 1, 2].map((item) => (
          <View key={item} style={[styles.skeletonRow, item > 0 && styles.skeletonRowDivider]}>
            <View style={styles.skeletonWhen}>
              <Skeleton height={13} radius="pill" width={38} />
              <Skeleton height={8} radius="pill" tone="subtle" width={26} />
            </View>
            <View style={styles.skeletonLogos}>
              <Skeleton height={34} radius="md" width={34} />
              <Skeleton height={34} radius="md" style={styles.skeletonLogoOverlap} width={34} />
            </View>
            <View style={styles.skeletonRowCopy}>
              <Skeleton height={8} radius="pill" tone="subtle" width="62%" />
              <Skeleton height={13} radius="pill" width="86%" />
            </View>
            <Skeleton height={10} radius="pill" width={46} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

function arenaTransitionTarget(match: ArenaMatch, couleurA: string, couleurB: string): MatchCenterTarget {
  return { ...match, couleur_a: couleurA, couleur_b: couleurB };
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

export function filterMatches(matches: ArenaMatch[], game: GameFilter, followed: string[], callsOnly: boolean, query: string) {
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

export function toGameId(game?: string | null): GameId | null {
  if (!game) return null;
  const key = gameKey(game);
  if (key === 'LoL') return 'lol';
  if (key === 'VALORANT') return 'valorant';
  if (key === 'CS2') return 'cs2';
  return null;
}

export function buildCalendarDays(status: StatusFilter, matches: ArenaMatch[]) {
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

export function findDefaultDayKey(days: Date[], matches: ArenaMatch[], status: StatusFilter) {
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

export function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatWeekday(date: Date) {
  return date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').slice(0, 3).toUpperCase();
}

export function formatMonth(date: Date) {
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
