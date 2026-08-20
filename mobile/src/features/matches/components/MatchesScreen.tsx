import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ClutchHeader } from '@/src/components/layout/ClutchHeader';
import { Screen } from '@/src/components/layout/Screen';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radius, spacing } from '@/src/theme';

import { loadArenaMatches } from '../api';
import type { ArenaMatch } from '../types';
import { gameKey, gameLabel, matchPhase } from '../utils';

type StatusFilter = 'upcoming' | 'finished';
type GameFilter = 'Tous' | 'LoL' | 'VALORANT' | 'CS2';

const GAME_FILTERS: GameFilter[] = ['Tous', 'LoL', 'VALORANT', 'CS2'];

export default function MatchesScreen() {
  const { profile } = useAuth();
  const [upcoming, setUpcoming] = useState<ArenaMatch[]>([]);
  const [finished, setFinished] = useState<ArenaMatch[]>([]);
  const [status, setStatus] = useState<StatusFilter>('upcoming');
  const [game, setGame] = useState<GameFilter>('Tous');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const data = await loadArenaMatches();
      setUpcoming(data.upcoming);
      setFinished(data.finished);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de charger les matchs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const source = status === 'upcoming' ? upcoming : finished;
  const filtered = useMemo(
    () => source.filter((match) => game === 'Tous' || gameKey(match.jeu) === game),
    [source, game],
  );
  const featured = filtered[0] ?? null;
  const rest = featured ? filtered.slice(1) : [];
  const fallbackFinished = status === 'upcoming' && filtered.length === 0
    ? finished.filter((match) => game === 'Tous' || gameKey(match.jeu) === game).slice(0, 4)
    : [];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
      >
        <ClutchHeader />

        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>MATCH ARENA</Text>
          <Text style={styles.heroTitle}>CHOISIS{`\n`}TON CAMP.</Text>
          <Text style={styles.subtitle}>Un choix, un risque lisible, puis le match décide de ton rating.</Text>
          {profile?.est_admin ? (
            <Pressable
              accessibilityLabel="Administrer les matchs"
              accessibilityRole="button"
              onPress={() => router.push('/admin/matches' as never)}
              style={({ pressed }) => [styles.adminEntry, pressed && styles.pressed]}
            >
              <View><Text style={styles.adminEntryLabel}>ADMIN MATCHS</Text><Text style={styles.adminEntryCopy}>Calendrier · live · résultats</Text></View>
              <Text style={styles.adminEntryArrow}>→</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterPanel}>
          <View style={styles.gameRow}>
            {GAME_FILTERS.map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setGame(filter)}
                style={[styles.gameFilter, game === filter && styles.gameFilterActive]}
              >
                <Text style={[styles.gameFilterText, game === filter && styles.gameFilterTextActive]}>{filter}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.statusRow}>
            <Pressable
              onPress={() => setStatus('upcoming')}
              style={[styles.statusButton, status === 'upcoming' && styles.statusButtonActive]}
            >
              <Text style={[styles.statusText, status === 'upcoming' && styles.statusTextActive]}>À venir</Text>
            </Pressable>
            <Pressable
              onPress={() => setStatus('finished')}
              style={[styles.statusButton, status === 'finished' && styles.statusButtonActive]}
            >
              <Text style={[styles.statusText, status === 'finished' && styles.statusTextActive]}>Historique</Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
          </View>
        ) : null}

        {loading ? <MatchSkeleton /> : featured ? <ArenaHero match={featured} finished={status === 'finished'} /> : <EmptyArena status={status} />}

        {fallbackFinished.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View>
                <Text style={styles.sectionEyebrow}>DERNIERS VERDICTS</Text>
                <Text style={styles.sectionTitle}>En attendant la prochaine affiche.</Text>
              </View>
              <Pressable onPress={() => setStatus('finished')}><Text style={styles.link}>TOUT VOIR →</Text></Pressable>
            </View>
            <View style={styles.list}>{fallbackFinished.map((match) => <MatchRow key={match.id} match={match} />)}</View>
          </View>
        ) : null}

        {rest.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View>
                <Text style={styles.sectionEyebrow}>{status === 'upcoming' ? 'À SUIVRE' : 'HISTORIQUE'}</Text>
                <Text style={styles.sectionTitle}>{status === 'upcoming' ? 'Le reste du calendrier.' : 'Chaque verdict laisse une trace.'}</Text>
              </View>
            </View>
            <GroupedMatches matches={rest} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ArenaHero({ match, finished }: { match: ArenaMatch; finished: boolean }) {
  const live = matchPhase(match) === 'live';
  return (
    <Pressable onPress={() => openMatch(match.id)} style={({ pressed }) => [styles.arenaCard, pressed && styles.pressed]}>
      <View style={styles.blueField} />
      <View style={styles.purpleField} />
      <View style={styles.centerLine} />

      <View style={styles.arenaTop}>
        <View style={styles.eventRow}>
          <View style={styles.gameDot} />
          <Text numberOfLines={1} style={styles.eventText}>{gameLabel(match.jeu).toUpperCase()} · {match.evenement}</Text>
        </View>
        <View style={[styles.livePill, finished && styles.finalPill]}>
          <View style={[styles.liveDot, finished && styles.finalDot]} />
          <Text style={[styles.liveText, finished && styles.finalText]}>{finished ? 'FINAL' : live ? 'LIVE' : formatTime(match.debut)}</Text>
        </View>
      </View>

      <View style={styles.cardHeadline}>
        <Text style={styles.cardKicker}>{finished ? 'VERDICT' : 'MATCH DU MOMENT'}</Text>
        <Text style={styles.cardTitle}>{finished ? 'LE SCORE EST TOMBÉ' : live ? 'LE MATCH EST LANCÉ' : 'PRENDS POSITION'}</Text>
      </View>

      <View style={styles.duel}>
        <TeamBlock tag={match.tag_a} name={match.equipe_a} />
        <View style={styles.vsBlock}>
          <Text style={styles.bo}>BO{match.format}</Text>
          <Text style={styles.vs}>{finished ? `${match.score_a ?? 0}–${match.score_b ?? 0}` : 'VS'}</Text>
          <View style={styles.vsLine} />
        </View>
        <TeamBlock tag={match.tag_b} name={match.equipe_b} />
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>{finished ? 'OUVRIR LE VERDICT' : live ? 'PRISES DE POSITION CLOSES' : 'OUVRIR LE MATCH CENTER'}</Text>
        <Text style={styles.cardFooterArrow}>→</Text>
      </View>
    </Pressable>
  );
}

function TeamBlock({ tag, name }: { tag: string; name: string }) {
  return (
    <View style={styles.team}>
      <View style={styles.teamDiamondOuter}>
        <View style={styles.teamDiamondInner}>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.teamTag}>{tag}</Text>
        </View>
      </View>
      <Text numberOfLines={2} style={styles.teamName}>{name}</Text>
    </View>
  );
}

function GroupedMatches({ matches }: { matches: ArenaMatch[] }) {
  return (
    <View style={styles.groups}>
      {groupMatches(matches).map((group) => (
        <View key={group.label} style={styles.dayGroup}>
          <View style={styles.dayLabelRow}><Text style={styles.dayLabel}>{group.label}</Text><View style={styles.dayLine} /></View>
          <View style={styles.list}>{group.matches.map((match) => <MatchRow key={match.id} match={match} />)}</View>
        </View>
      ))}
    </View>
  );
}

function MatchRow({ match }: { match: ArenaMatch }) {
  const phase = matchPhase(match);
  const finished = phase === 'finished';
  const live = phase === 'live';
  return (
    <Pressable onPress={() => openMatch(match.id)} style={({ pressed }) => [styles.matchRow, pressed && styles.pressed]}>
      <View style={styles.rowWhen}>
        <Text style={[styles.rowTime, live && styles.rowTimeLive]}>{finished ? 'FINAL' : live ? 'LIVE' : formatTime(match.debut)}</Text>
        <Text style={styles.rowGame}>{gameLabel(match.jeu)}</Text>
      </View>
      <View style={styles.rowMain}>
        <Text numberOfLines={1} style={styles.rowEvent}>{match.evenement} · BO{match.format}</Text>
        <Text style={styles.rowTeams}>{match.tag_a}  {finished ? `${match.score_a ?? 0} — ${match.score_b ?? 0}` : 'VS'}  {match.tag_b}</Text>
      </View>
      <Text style={styles.rowArrow}>›</Text>
    </Pressable>
  );
}

function EmptyArena({ status }: { status: StatusFilter }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyEyebrow}>{status === 'upcoming' ? 'CALENDRIER' : 'HISTORIQUE'}</Text>
      <Text style={styles.emptyTitle}>{status === 'upcoming' ? 'LE CALME AVANT LA PROCHAINE AFFICHE.' : 'AUCUN VERDICT POUR CE FILTRE.'}</Text>
      <Text style={styles.emptyCopy}>{status === 'upcoming' ? 'Dès qu’un nouveau match arrive, l’Arena se réactive ici.' : 'Change de jeu ou reviens après les prochains résultats.'}</Text>
    </View>
  );
}

function MatchSkeleton() {
  return <View style={styles.skeleton}><View style={styles.skeletonLine} /><View style={styles.skeletonBig} /><View style={styles.skeletonLine} /></View>;
}

function openMatch(id: string) {
  router.push({ pathname: '/match/[id]', params: { id } });
}

function groupMatches(matches: ArenaMatch[]) {
  const groups: { label: string; matches: ArenaMatch[] }[] = [];
  for (const match of matches) {
    const label = temporalLabel(match);
    const existing = groups.find((group) => group.label === label);
    if (existing) existing.matches.push(match);
    else groups.push({ label, matches: [match] });
  }
  return groups;
}

function temporalLabel(match: ArenaMatch) {
  const date = new Date(match.debut);
  const phase = matchPhase(match);
  if (phase === 'live') return 'EN DIRECT';
  if (phase === 'finished') return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  const now = new Date();
  if (sameDay(date, now)) return "AUJOURD'HUI";
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(date, tomorrow)) return 'DEMAIN';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingBottom: 124,
    gap: 20,
  },
  heroCopy: { paddingHorizontal: spacing.md, paddingTop: 4 },
  eyebrow: { color: colors.volt, fontSize: 11, fontWeight: '900', letterSpacing: 3.1, marginBottom: 10 },
  heroTitle: { color: '#F4F6F7', fontSize: 57, lineHeight: 48, fontWeight: '900', letterSpacing: -4.1 },
  subtitle: { maxWidth: 385, marginTop: 14, color: '#8994A1', fontSize: 15, lineHeight: 23 },
  adminEntry: { minHeight: 62, marginTop: 16, paddingHorizontal: 15, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#11170E', borderWidth: 1, borderColor: '#414D1E' },
  adminEntryLabel: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  adminEntryCopy: { marginTop: 4, color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  adminEntryArrow: { color: colors.volt, fontSize: 18, fontWeight: '900' },
  filterPanel: { marginHorizontal: spacing.md, padding: 9, borderRadius: 17, backgroundColor: '#080C10', borderWidth: 1, borderColor: '#232A32', gap: 8 },
  gameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  gameFilter: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  gameFilterActive: { backgroundColor: '#141A0F', borderWidth: 1, borderColor: '#46541C' },
  gameFilterText: { color: '#6F7A88', fontSize: 11, fontWeight: '900', letterSpacing: 0.45 },
  gameFilterTextActive: { color: colors.text },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusButton: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#252D35' },
  statusButtonActive: { backgroundColor: colors.volt, borderColor: colors.volt },
  statusText: { color: '#7D8793', fontSize: 12, fontWeight: '900' },
  statusTextActive: { color: '#080A0C' },
  errorCard: { marginHorizontal: spacing.md, padding: 13, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027', flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  errorText: { flex: 1, color: '#FF9AA2', fontSize: 11 },
  retry: { color: colors.volt, fontSize: 9, fontWeight: '900' },
  arenaCard: { position: 'relative', minHeight: 475, marginHorizontal: spacing.md, overflow: 'hidden', borderRadius: 28, backgroundColor: '#10151B', borderWidth: 1, borderColor: '#39414A', padding: 18 },
  blueField: { position: 'absolute', left: -50, top: 90, bottom: 0, width: '64%', backgroundColor: 'rgba(16,62,111,0.38)', transform: [{ skewX: '-8deg' }] },
  purpleField: { position: 'absolute', right: -50, top: 90, bottom: 0, width: '64%', backgroundColor: 'rgba(101,37,99,0.34)', transform: [{ skewX: '8deg' }] },
  centerLine: { position: 'absolute', top: 115, bottom: 70, left: '50%', width: 1, backgroundColor: 'rgba(232,255,61,0.12)' },
  arenaTop: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eventRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  gameDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D79B37' },
  eventText: { flex: 1, color: '#AAB3BE', fontSize: 10, fontWeight: '800', letterSpacing: 1.25 },
  livePill: { minHeight: 32, paddingHorizontal: 12, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10151D', borderWidth: 1, borderColor: '#26313C' },
  finalPill: { borderColor: '#3B4651' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4DA5FF' },
  finalDot: { backgroundColor: colors.volt },
  liveText: { color: '#56ADFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  finalText: { color: colors.volt },
  cardHeadline: { zIndex: 2, alignItems: 'center', marginTop: 42 },
  cardKicker: { color: '#788391', fontSize: 10, fontWeight: '900', letterSpacing: 2.6 },
  cardTitle: { marginTop: 8, color: '#F6F7F7', fontSize: 39, lineHeight: 40, fontWeight: '900', letterSpacing: -2.6, textAlign: 'center' },
  duel: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 54 },
  team: { flex: 1, alignItems: 'center', gap: 19 },
  teamDiamondOuter: { width: 82, height: 82, transform: [{ rotate: '45deg' }], alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,17,23,0.92)', borderWidth: 2, borderColor: '#6E7B89' },
  teamDiamondInner: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7447B0', borderWidth: 2, borderColor: '#AF87E6' },
  teamTag: { transform: [{ rotate: '-45deg' }], color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  teamName: { minHeight: 47, color: '#F4F6F8', fontSize: 23, lineHeight: 23, fontWeight: '900', letterSpacing: -1.2, textAlign: 'center' },
  vsBlock: { width: 72, alignItems: 'center' },
  bo: { color: '#838D9A', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  vs: { marginTop: 12, color: '#F4F6F8', fontSize: 42, lineHeight: 45, fontWeight: '900', letterSpacing: -2.5 },
  vsLine: { marginTop: 6, width: 28, height: 3, borderRadius: 999, backgroundColor: colors.volt },
  cardFooter: { zIndex: 2, marginTop: 'auto', minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  cardFooterText: { color: '#9EA8B4', fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  cardFooterArrow: { color: colors.volt, fontSize: 18, fontWeight: '900' },
  emptyCard: { marginHorizontal: spacing.md, minHeight: 260, justifyContent: 'center', padding: 25, borderRadius: 28, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#252E37' },
  emptyEyebrow: { color: colors.volt, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  emptyTitle: { marginTop: 11, color: colors.text, fontSize: 28, lineHeight: 29, fontWeight: '900', letterSpacing: -1.5 },
  emptyCopy: { marginTop: 12, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  section: { marginHorizontal: spacing.md, gap: 12 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  sectionTitle: { marginTop: 4, color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  link: { color: colors.volt, fontSize: 8, fontWeight: '900' },
  groups: { gap: 18 },
  dayGroup: { gap: 8 },
  dayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dayLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  dayLine: { flex: 1, height: 1, backgroundColor: colors.border },
  list: { overflow: 'hidden', borderRadius: 18, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  matchRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#182029' },
  rowWhen: { width: 55 },
  rowTime: { color: colors.text, fontSize: 11, fontWeight: '900' },
  rowTimeLive: { color: '#56ADFF' },
  rowGame: { marginTop: 3, color: colors.textMuted, fontSize: 8, fontWeight: '800' },
  rowMain: { flex: 1, minWidth: 0 },
  rowEvent: { color: colors.textMuted, fontSize: 8, fontWeight: '700' },
  rowTeams: { marginTop: 6, color: colors.text, fontSize: 13, fontWeight: '900' },
  rowArrow: { color: colors.volt, fontSize: 18 },
  skeleton: { minHeight: 430, marginHorizontal: spacing.md, padding: 20, justifyContent: 'space-between', borderRadius: 28, backgroundColor: '#0D1218', borderWidth: 1, borderColor: colors.border },
  skeletonLine: { width: '60%', height: 12, borderRadius: 6, backgroundColor: '#171E26' },
  skeletonBig: { width: '80%', height: 160, borderRadius: 28, alignSelf: 'center', backgroundColor: '#151C24' },
  pressed: { opacity: 0.78 },
});
