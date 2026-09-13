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
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { FEATURE_STATE_COPY } from '@/src/components/ui/FeatureStateView';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import GameLogo from '@/src/features/onboarding/components/GameLogo';
import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import { resolveMatchTeamAccents } from '@/src/utils/teamColors';
import type { GameId } from '@/src/features/onboarding/types';
import { colors } from '@/src/theme';
import { openMatchCenter, warmMatchCenter, type MatchCenterTarget } from '../matchCenterNavigation';
import type { ArenaMatch } from '../types';
import { gameKey, matchPhase, predictionIsOpen } from '../utils';
import { styles } from './MatchesScreen.styles';

export type GameFilter = 'all' | GameId;

type ScheduleHeroProps = {
  activeDayKey: string;
  calendarDays: Date[];
  matches: ArenaMatch[];
  monthLabel: string;
  onSelectDay: (value: string) => void;
};

export function ScheduleHero({
  activeDayKey,
  calendarDays,
  matches,
  monthLabel,
  onSelectDay,
}: ScheduleHeroProps) {
  const { isShortLandscape } = useResponsiveLayout();

  return (
    <View
      style={[styles.scheduleHero, isShortLandscape && styles.scheduleHeroLandscape]}
      testID="matches-schedule-hero"
    >
      <View style={styles.scheduleTop}>
        <Text numberOfLines={1} style={styles.scheduleMonth}>{monthLabel}</Text>
      </View>

      <ScrollView
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
      </ScrollView>
    </View>
  );
}

export function SectionHead({ count, mode }: { count: number; mode: 'upcoming' | 'finished' }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{mode === 'upcoming' ? 'À PRONOSTIQUER MAINTENANT' : 'RÉSULTATS DU JOUR'}</Text>
      <Text style={styles.sectionCount}>{count} MATCH{count > 1 ? 'S' : ''}</Text>
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
    <Pressable accessibilityHint="Ouvre le centre du match" accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}, en direct`} accessibilityRole="button" onPress={() => { prepare(); openMatchCenter(target, { rivalId, rivalPseudo, source: 'matches' }); }} onPressIn={prepare} style={({ pressed }) => [styles.liveCard, pressed && styles.pressed]} testID="match-card-live">
      <LinearGradient colors={['#173044', '#062033', '#03131F']} end={{ x: 1, y: .75 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(190,139,82,.24)', 'rgba(190,139,82,0)', 'rgba(190,139,82,.13)']} end={{ x: 1, y: .5 }} start={{ x: 0, y: .5 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.livePatternA} />
      <View pointerEvents="none" style={styles.livePatternB} />
      <View style={styles.liveTop}>
        <View style={styles.liveMetaLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>EN DIRECT</Text>
          <Text numberOfLines={1} style={styles.liveEvent}>· {match.evenement.toUpperCase()} · BO{match.format}</Text>
        </View>
        <Text style={styles.liveSeason}>SAISON 1 · {new Date(match.debut).getFullYear()}</Text>
      </View>
      <View style={styles.liveDuel}>
        <MatchTeam accent={accentA} name={match.equipe_a} tag={match.tag_a} uri={match.logo_a} />
        <View style={styles.liveScore}><Text style={styles.liveScoreText}>{match.score_a ?? 0} – {match.score_b ?? 0}</Text><Text style={styles.liveScoreState}>MATCH EN COURS</Text></View>
        <MatchTeam accent={accentB} name={match.equipe_b} tag={match.tag_b} uri={match.logo_b} />
      </View>
      <View style={styles.liveFooter}>
        <BroadcastIcon color={colors.volt} size={19} />
        <Text style={styles.liveFooterText}>{callTag ? `SUIVRE LE DIRECT · CALL ${callTag}` : 'SUIVRE LE DIRECT'}</Text>
      </View>
    </Pressable>
  );
}

function MatchTeam({ accent, compact = false, name, tag, uri }: { accent: string; compact?: boolean; name: string; tag: string; uri?: string | null }) {
  return (
    <View style={styles.matchTeam}>
      <TeamLogo accent={accent} name={name} size={compact ? 38 : 52} tag={tag} uri={uri} />
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
  const cancelled = phase === 'cancelled';
  const state = callTag ? `Call verrouillé · ${callTag}` : finished ? 'Match terminé' : cancelled ? 'Match annulé' : open ? 'Call ouvert' : 'Call fermé';
  const target = arenaTransitionTarget(match);
  const accent = gameAccent(match.jeu);
  const trailing = verdict || (finished ? 'VOIR LE RÉSULTAT' : callTag ? `CALL ${callTag}` : 'FRAGS EN JEU');
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
    <Pressable accessibilityHint={opensInline ? 'Déplie le pronostic dans la liste' : 'Ouvre le centre du match'} accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}${callTag ? `, ton call ${callTag}` : ''}`} accessibilityRole="button" onPress={openMatch} onPressIn={prepare} style={({ pressed }) => [styles.matchRow, finished && styles.matchRowFinished, cancelled && styles.matchRowCancelled, pressed && styles.pressed]} testID={`match-card-${finished ? 'finished' : cancelled ? 'cancelled' : 'upcoming'}`}>
      <LinearGradient colors={finished || cancelled ? ['#111820', '#071119', '#050C12'] : ['#0A2B3D', '#061E2D', '#031522']} end={{ x: 1, y: .55 }} start={{ x: 0, y: .45 }} style={StyleSheet.absoluteFill} />
      {!finished && !cancelled ? <View pointerEvents="none" style={styles.matchPattern} /> : null}
      <View pointerEvents="none" style={[styles.matchAccent, { backgroundColor: accent, shadowColor: accent }]} />
      <View style={styles.rowHeader}>
        <GameLogo color={accent} game={toGameId(match.jeu) ?? 'lol'} size={18} />
        <Text numberOfLines={1} style={styles.rowEvent}>{match.evenement.toUpperCase()} · BO{match.format}</Text>
        <Text style={styles.rowCountdown}>{finished ? 'Final' : cancelled ? 'Annulé' : formatRelativeStart(match.debut)}</Text>
      </View>
      <View style={styles.rowDuel}>
        <MatchTeam accent={target.couleur_a} compact name={match.equipe_a} tag={match.tag_a} uri={match.logo_a} />
        <View style={styles.rowScore}><Text style={styles.rowTeams}>{finished ? `${match.score_a ?? 0} — ${match.score_b ?? 0}` : 'VS'}</Text></View>
        <MatchTeam accent={target.couleur_b} compact name={match.equipe_b} tag={match.tag_b} uri={match.logo_b} />
      </View>
      <View style={styles.rowFooter}>
        <View style={styles.rowCallState}>
          <SupportersIcon color={colors.text} size={19} />
          <View style={[styles.rowStateDot, open && !callTag && styles.rowStateDotOpen]} />
          <Text numberOfLines={1} style={styles.rowState}>{state}</Text>
        </View>
        <View style={styles.rowReward}>
          <CurrencyIcon color={verdict && Number(match.prediction?.delta_frags ?? 0) < 0 ? colors.danger : '#D99967'} kind="frags" size={18} />
          <Text numberOfLines={1} style={[styles.rowRewardText, verdict && Number(match.prediction?.delta_frags ?? 0) < 0 && styles.rowStateLoss]}>{trailing}</Text>
          <Text style={styles.rowArrow}>{opensInline ? '⌄' : '›'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function EmptyArena() {
  return (
    <View accessibilityLabel="Pas de match ce jour" style={styles.emptyDay} testID="matches-empty-state">
      <Text style={styles.emptyDayText}>Pas de match ce jour</Text>
    </View>
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
  return <Svg height={size} viewBox="0 0 24 24" width={size}><Path d="M7 3v3M17 3v3M4 9h16M5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-12A1.5 1.5 0 0 1 5.5 5Z" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /><Circle cx="12" cy="14" fill={color} r="1.6" /></Svg>;
}

function BroadcastIcon({ color, size }: { color: string; size: number }) {
  return <Svg height={size} viewBox="0 0 24 24" width={size}><Circle cx="12" cy="12" fill={color} r="2" /><Path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.7 5.7a9 9 0 0 0 0 12.6M18.3 5.7a9 9 0 0 1 0 12.6" fill="none" stroke={color} strokeLinecap="round" strokeWidth="1.8" /></Svg>;
}

function SupportersIcon({ color, size }: { color: string; size: number }) {
  return <Svg height={size} viewBox="0 0 24 24" width={size}><Circle cx="9" cy="8" fill="none" r="3" stroke={color} strokeWidth="1.7" /><Circle cx="17" cy="9" fill="none" r="2.4" stroke={color} strokeWidth="1.7" /><Path d="M3.5 19c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M14.2 14c3.8-.6 5.9 1.1 6.3 4.6" fill="none" stroke={color} strokeLinecap="round" strokeWidth="1.7" /></Svg>;
}

export function CloseIcon({ color, size }: { color: string; size: number }) {
  return <Svg height={size} viewBox="0 0 24 24" width={size}><Path d="m6 6 12 12M18 6 6 18" fill="none" stroke={color} strokeLinecap="round" strokeWidth="2" /></Svg>;
}

export function filterMatches(matches: ArenaMatch[], game: GameFilter, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase('fr-FR');
  return matches.filter((match) => {
    const matchesGame = game === 'all' || toGameId(match.jeu) === game;
    if (!matchesGame) return false;
    if (!normalizedQuery) return true;
    return [match.equipe_a, match.tag_a, match.equipe_b, match.tag_b, match.evenement, match.jeu]
      .some((value) => value.toLocaleLowerCase('fr-FR').includes(normalizedQuery));
  });
}

export function toGameId(game?: string | null): GameId | null {
  if (!game) return null;
  const key = gameKey(game);
  if (key === 'LoL') return 'lol';
  if (key === 'VALORANT') return 'valorant';
  if (key === 'RL') return 'rocket_league';
  return null;
}

export function buildCalendarDays(anchor = new Date()) {
  const center = startOfDay(anchor);
  return Array.from({ length: 7 }, (_, index) => addDays(center, index - 3));
}

export function findDefaultDayKey(days: Date[], matches: ArenaMatch[]) {
  const dayKeys = new Set(matches.map((match) => dateKey(new Date(match.debut))));
  const todayKey = dateKey(startOfDay(new Date()));
  if (days.some((day) => dateKey(day) === todayKey)) return todayKey;
  const live = matches.find((match) => matchPhase(match) === 'live');
  const liveKey = live ? dateKey(new Date(live.debut)) : null;
  if (liveKey && days.some((day) => dateKey(day) === liveKey)) return liveKey;
  const firstUpcoming = days.find((day) => day >= startOfDay(new Date()) && dayKeys.has(dateKey(day)));
  if (firstUpcoming) return dateKey(firstUpcoming);
  const latestFinished = [...days].reverse().find((day) => dayKeys.has(dateKey(day)));
  return dateKey(latestFinished ?? days[Math.floor(days.length / 2)] ?? startOfDay(new Date()));
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

function formatRelativeStart(value: string) {
  const date = new Date(value);
  const minutes = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 60_000));
  if (minutes < 60) return `Dans ${minutes} min`;
  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `Dans ${hours} h${rest ? ` ${rest}` : ''}`;
  }
  const tomorrow = addDays(startOfDay(new Date()), 1);
  if (dateKey(date) === dateKey(tomorrow)) {
    return `Demain · ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
}

function gameAccent(game: string) {
  const id = toGameId(game);
  if (id === 'valorant') return '#FF4655';
  if (id === 'rocket_league') return '#2D99FF';
  return '#D6A43B';
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
