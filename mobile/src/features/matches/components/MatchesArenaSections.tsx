import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { FEATURE_STATE_COPY, FeatureStateView } from '@/src/components/ui/FeatureStateView';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { resolveMatchTeamAccents } from '@/src/utils/teamColors';
import type { GameId } from '@/src/features/onboarding/types';
import { openMatchCenter, warmMatchCenter, type MatchCenterTarget } from '../matchCenterNavigation';
import type { ArenaMatch } from '../types';
import { gameKey, gameLabel, matchPhase, predictionIsOpen } from '../utils';
import { styles } from './MatchesScreen.styles';

export type StatusFilter = 'upcoming' | 'live' | 'finished';
export type GameFilter = 'followed' | GameId;

type ScheduleHeroProps = {
  activeDayKey: string;
  calendarDays: Date[];
  matches: ArenaMatch[];
  monthLabel: string;
  onSelectDay: (value: string) => void;
  onToggleHistory: () => void;
  status: StatusFilter;
};

export function ScheduleHero({
  activeDayKey,
  calendarDays,
  matches,
  monthLabel,
  onSelectDay,
  onToggleHistory,
  status,
}: ScheduleHeroProps) {
  const { isShortLandscape } = useResponsiveLayout();

  return (
    <View
      style={[styles.scheduleHero, isShortLandscape && styles.scheduleHeroLandscape, status === 'live' && styles.scheduleHeroLive]}
      testID="matches-schedule-hero"
    >
      <View style={styles.scheduleTop}>
        <Text numberOfLines={1} style={styles.scheduleMonth}>{monthLabel}</Text>
        <View style={styles.scheduleActions}>
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

      {status !== 'live' ? <ScrollView
        contentContainerStyle={styles.daysRow}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.daysScroll}
      >
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
      </ScrollView> : null}
    </View>
  );
}

export function SectionHead({ callsOnly, count, date, status }: { callsOnly: boolean; count: number; date: Date; status: StatusFilter }) {
  return (
    <View style={styles.sectionHead}>
      <View>
        <Text style={styles.sectionEyebrow}>{status === 'live' ? 'EN DIRECT' : callsOnly ? status === 'upcoming' ? 'TES CALLS À VENIR' : 'TES VERDICTS' : status === 'upcoming' ? 'PROGRAMME DU JOUR' : 'VERDICTS DU JOUR'}</Text>
        <Text style={styles.sectionTitle}>{status === 'live' ? 'MATCHS EN COURS' : formatSectionDate(date)}</Text>
      </View>
      <View style={styles.countPill}><Text style={styles.countText}>{count} MATCH{count > 1 ? 'S' : ''}</Text></View>
    </View>
  );
}

export function LiveMatchCard({ match, onPrepareMatch, rivalId, rivalPseudo }: { match: ArenaMatch; onPrepareMatch?: (match: MatchCenterTarget) => void; rivalId?: string; rivalPseudo?: string }) {
  const callTag = predictionTag(match);
  const target = arenaTransitionTarget(match);
  const accentA = target.couleur_a;
  const accentB = target.couleur_b;
  const prepare = () => onPrepareMatch ? onPrepareMatch(target) : warmMatchCenter(target);
  return (
    <Pressable accessibilityHint="Ouvre le Match Center" accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}, en direct`} accessibilityRole="button" onPress={() => { prepare(); openMatchCenter(target, { rivalId, rivalPseudo, source: 'matches' }); }} onPressIn={prepare} style={({ pressed }) => [styles.liveCard, pressed && styles.pressed]}>
      <LinearGradient colors={[`${accentA}38`, 'rgba(3,7,10,.74)', `${accentB}38`]} end={{ x: 1, y: .5 }} start={{ x: 0, y: .5 }} style={StyleSheet.absoluteFill} />
      <View style={styles.liveTop}>
        <Text numberOfLines={1} style={styles.liveEvent}>{gameLabel(match.jeu).toUpperCase()} · {match.evenement}</Text>
        <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
      </View>
      <View style={styles.liveDuel}>
        <MatchTeam accent={accentA} name={match.equipe_a} tag={match.tag_a} uri={match.logo_a} />
        <View style={styles.liveScore}><Text style={styles.liveBo}>BO{match.format}</Text><Text style={styles.liveScoreText}>{match.score_a ?? 0}–{match.score_b ?? 0}</Text></View>
        <MatchTeam accent={accentB} name={match.equipe_b} tag={match.tag_b} uri={match.logo_b} />
      </View>
      <View style={styles.liveFooter}><Text style={[styles.liveFooterText, callTag && styles.liveFooterCall]}>{callTag ? `TON CALL · ${callTag}` : 'SUIVRE LE MATCH'}</Text><Text style={styles.liveFooterArrow}>→</Text></View>
    </Pressable>
  );
}

function MatchTeam({ accent, compact = false, name, tag, uri }: { accent: string; compact?: boolean; name: string; tag: string; uri?: string | null }) {
  return (
    <View style={styles.matchTeam}>
      <TeamLogo accent={accent} name={name} size={compact ? 42 : 56} tag={tag} uri={uri} />
      <Text
        adjustsFontSizeToFit
        minimumFontScale={.85}
        numberOfLines={2}
        style={[styles.matchTeamName, compact && styles.matchTeamNameCompact]}
      >
        {name || tag}
      </Text>
    </View>
  );
}

export function MatchRow({ match, onOpenPrediction, onPrepareMatch, rivalId, rivalPseudo }: { match: ArenaMatch; onOpenPrediction?: (match: ArenaMatch) => void; onPrepareMatch?: (match: MatchCenterTarget) => void; rivalId?: string; rivalPseudo?: string }) {
  const phase = matchPhase(match);
  const finished = phase === 'finished';
  const callTag = predictionTag(match);
  const verdict = predictionVerdict(match);
  const open = predictionIsOpen(match);
  const opensInline = Boolean(open && !match.prediction && onOpenPrediction);
  const state = verdict || (callTag ? `CALL · ${callTag}` : finished ? 'FINAL' : open ? 'OUVERT' : 'CLOS');
  const target = arenaTransitionTarget(match);
  const prepare = () => onPrepareMatch ? onPrepareMatch(target) : warmMatchCenter(target);
  const openMatch = () => {
    prepare();
    if (opensInline && predictionIsOpen(match)) {
      onOpenPrediction?.(match);
      return;
    }
    openMatchCenter(target, { rivalId, rivalPseudo, source: 'matches' });
  };
  return (
    <Pressable accessibilityHint={opensInline ? 'Déplie le pronostic dans la liste' : 'Ouvre le Match Center'} accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}${callTag ? `, ton call ${callTag}` : ''}`} accessibilityRole="button" onPress={openMatch} onPressIn={prepare} style={({ pressed }) => [styles.matchRow, pressed && styles.pressed]}>
      <View style={styles.rowHeader}>
        <View style={styles.rowWhen}><Text style={styles.rowTime}>{finished ? 'FINAL' : formatTime(match.debut)}</Text><Text style={styles.rowGame}>{gameLabel(match.jeu)}</Text></View>
        <Text numberOfLines={2} style={styles.rowEvent}>{match.evenement} · BO{match.format}</Text>
        <View style={styles.rowTrailing}><Text style={[styles.rowState, (callTag || open) && styles.rowStateAccent, verdict && Number(match.prediction?.delta_frags ?? 0) < 0 && styles.rowStateLoss]}>{state}</Text><Text style={styles.rowArrow}>{opensInline ? '⌄' : '›'}</Text></View>
      </View>
      <View style={styles.rowDuel}>
        <MatchTeam accent={target.couleur_a} compact name={match.equipe_a} tag={match.tag_a} uri={match.logo_a} />
        <View style={styles.rowScore}><Text style={styles.rowTeams}>{finished ? `${match.score_a ?? 0} — ${match.score_b ?? 0}` : 'VS'}</Text></View>
        <MatchTeam accent={target.couleur_b} compact name={match.equipe_b} tag={match.tag_b} uri={match.logo_b} />
      </View>
    </Pressable>
  );
}

export function EmptyArena({ callsOnly, query, status }: { callsOnly: boolean; query: string; status: StatusFilter }) {
  const filtered = Boolean(query.trim()) || callsOnly;
  return (
    <FeatureStateView
      compact
      description={filtered ? 'Change de jeu, de date ou désactive Mes Calls.' : status === 'live' ? 'Retrouve les prochains matchs dans À venir.' : 'Choisis une autre date dans le calendrier.'}
      domain="matches"
      style={styles.stateInset}
      testID="matches-empty-state"
      title={filtered ? 'Aucun match ne correspond' : status === 'live' ? 'Aucun match en cours' : status === 'upcoming' ? 'Aucun match ce jour-là' : 'Aucun verdict ce jour-là'}
      variant="empty"
    />
  );
}

export function MatchSkeleton() {
  return (
    <SkeletonGroup label={FEATURE_STATE_COPY.matches.loading.title} style={styles.skeleton} testID="matches-loading">
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

function arenaTransitionTarget(match: ArenaMatch) {
  const accents = resolveMatchTeamAccents(
    { name: match.equipe_a, tag: match.tag_a },
    { name: match.equipe_b, tag: match.tag_b },
  );
  return {
    ...match,
    couleur_a: accents.a,
    couleur_b: accents.b,
  };
}

export function SearchIcon({ color, size }: { color: string; size: number }) {
  return <Svg height={size} viewBox="0 0 24 24" width={size}><Circle cx="10.8" cy="10.8" fill="none" r="6.8" stroke={color} strokeWidth="2" /><Path d="m16 16 4.4 4.4" fill="none" stroke={color} strokeLinecap="round" strokeWidth="2" /></Svg>;
}

export function CalendarIcon({ color, size }: { color: string; size: number }) {
  return <Svg height={size} viewBox="0 0 24 24" width={size}><Path d="M6.5 3v3M17.5 3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></Svg>;
}

export function CloseIcon({ color, size }: { color: string; size: number }) {
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
  if (key === 'RL') return 'rocket_league';
  return null;
}

export function buildCalendarDays(status: StatusFilter, matches: ArenaMatch[]) {
  const today = startOfDay(new Date());
  const validDates = matches.map((match) => startOfDay(new Date(match.debut))).filter((date) => !Number.isNaN(date.getTime()));
  if (status === 'live') {
    const earliest = validDates.reduce<Date>((current, date) => date < current ? date : current, today);
    return Array.from({ length: 7 }, (_, index) => addDays(earliest, index));
  }
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
  if (status !== 'finished') {
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
  const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
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
