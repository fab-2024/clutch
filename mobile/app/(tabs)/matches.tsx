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

import { Screen } from '@/components/Screen';
import {
  type ArenaMatch,
  gameKey,
  gameLabel,
  loadArenaMatches,
} from '@/src/services/matches';
import { colors, radius, spacing } from '@/src/theme/tokens';

type StatusFilter = 'upcoming' | 'finished';
type GameFilter = 'Tous' | 'LoL' | 'VALORANT' | 'CS2' | 'Autres';

const GAME_FILTERS: GameFilter[] = ['Tous', 'LoL', 'VALORANT', 'CS2'];

export default function MatchesScreen() {
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
      console.error(caught);
      setError(caught instanceof Error ? caught.message : 'Impossible de charger les matchs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const source = status === 'upcoming' ? upcoming : finished;
  const filtered = useMemo(
    () => source.filter((match) => game === 'Tous' || gameKey(match.jeu) === game),
    [source, game],
  );

  const featured = status === 'upcoming' ? filtered[0] ?? null : null;
  const list = featured ? filtered.slice(1) : filtered;
  const fallbackFinished = status === 'upcoming' && filtered.length === 0
    ? finished.slice(0, 4)
    : [];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>MATCH ARENA</Text>
            <Text style={styles.title}>Choisis ton camp.</Text>
            <Text style={styles.subtitle}>Un choix. Un risque lisible. Puis le match décide de ton rating.</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countValue}>{loading ? '—' : filtered.length}</Text>
            <Text style={styles.countLabel}>{status === 'upcoming' ? 'À JOUER' : 'RÉSULTATS'}</Text>
          </View>
        </View>

        <View style={styles.segmented}>
          <Pressable
            onPress={() => setStatus('upcoming')}
            style={[styles.segment, status === 'upcoming' && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, status === 'upcoming' && styles.segmentTextActive]}>À venir</Text>
          </Pressable>
          <Pressable
            onPress={() => setStatus('finished')}
            style={[styles.segment, status === 'finished' && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, status === 'finished' && styles.segmentTextActive]}>Historique</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {GAME_FILTERS.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setGame(filter)}
              style={[styles.filter, game === filter && styles.filterActive]}
            >
              <Text style={[styles.filterText, game === filter && styles.filterTextActive]}>{filter}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable>
          </View>
        ) : null}

        {featured ? (
          <View style={styles.section}>
            <Text style={styles.sectionEyebrow}>PROCHAINE AFFICHE</Text>
            <FeaturedMatch match={featured} />
          </View>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <EmptyState status={status} />
        ) : null}

        {fallbackFinished.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.sectionEyebrow}>DERNIERS VERDICTS</Text>
                <Text style={styles.sectionTitle}>En attendant le prochain calendrier.</Text>
              </View>
              <Pressable onPress={() => setStatus('finished')}>
                <Text style={styles.historyLink}>TOUT VOIR →</Text>
              </Pressable>
            </View>
            <View style={styles.timeline}>
              {fallbackFinished.map((match) => <MatchRow key={match.id} match={match} />)}
            </View>
          </View>
        ) : null}

        {list.length ? (
          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <View>
                <Text style={styles.sectionEyebrow}>{status === 'upcoming' ? 'À SUIVRE' : 'HISTORIQUE'}</Text>
                <Text style={styles.sectionTitle}>
                  {status === 'upcoming' ? 'Le reste du calendrier' : 'Chaque résultat laisse une trace.'}
                </Text>
              </View>
            </View>
            <GroupedMatches matches={list} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function FeaturedMatch({ match }: { match: ArenaMatch }) {
  return (
    <Pressable
      onPress={() => openMatch(match.id)}
      style={({ pressed }) => [styles.featured, pressed && styles.pressed]}
    >
      <View style={styles.featuredAccent} />
      <View style={styles.featuredTop}>
        <Text style={styles.featuredMeta}>{gameLabel(match.jeu)} · {match.evenement}</Text>
        <TimePill value={match.debut} />
      </View>
      <Text style={styles.featuredQuestion}>Ce match peut bouger ton rating.</Text>
      <View style={styles.featuredDuel}>
        <TeamBlock tag={match.tag_a} name={match.equipe_a} />
        <View style={styles.vsBlock}>
          <Text style={styles.bo}>BO{match.format}</Text>
          <Text style={styles.vs}>VS</Text>
          <Text style={styles.kickoff}>{formatTime(match.debut)}</Text>
        </View>
        <TeamBlock tag={match.tag_b} name={match.equipe_b} />
      </View>
      <View style={styles.featuredCta}>
        <View>
          <Text style={styles.ctaEyebrow}>MATCH CENTER</Text>
          <Text style={styles.ctaText}>PRENDRE POSITION</Text>
        </View>
        <View style={styles.arrowCircle}><Text style={styles.arrow}>→</Text></View>
      </View>
    </Pressable>
  );
}

function TeamBlock({ tag, name }: { tag: string; name: string }) {
  return (
    <View style={styles.teamBlock}>
      <View style={styles.teamMark}><Text adjustsFontSizeToFit numberOfLines={1} style={styles.teamTag}>{tag}</Text></View>
      <Text numberOfLines={2} style={styles.teamName}>{name}</Text>
    </View>
  );
}

function GroupedMatches({ matches }: { matches: ArenaMatch[] }) {
  const groups = groupMatches(matches);
  return (
    <View style={styles.groups}>
      {groups.map((group) => (
        <View key={group.label} style={styles.dayGroup}>
          <View style={styles.dayLabelRow}>
            <Text style={styles.dayLabel}>{group.label}</Text>
            <View style={styles.dayLine} />
          </View>
          <View style={styles.timeline}>
            {group.matches.map((match) => <MatchRow key={match.id} match={match} />)}
          </View>
        </View>
      ))}
    </View>
  );
}

function MatchRow({ match }: { match: ArenaMatch }) {
  const finished = match.statut === 'termine';
  const winnerA = finished && Number(match.score_a) > Number(match.score_b);
  const winnerB = finished && Number(match.score_b) > Number(match.score_a);

  return (
    <Pressable
      onPress={() => openMatch(match.id)}
      style={({ pressed }) => [styles.matchRow, pressed && styles.pressed]}
    >
      <View style={styles.whenCol}>
        <Text style={styles.whenTime}>{finished ? 'FINAL' : formatTime(match.debut)}</Text>
        <Text style={styles.whenGame}>{gameLabel(match.jeu)}</Text>
      </View>

      <View style={styles.rowMain}>
        <Text numberOfLines={1} style={styles.rowEvent}>{match.evenement} · BO{match.format}</Text>
        <View style={styles.rowTeams}>
          <View style={styles.rowTeam}>
            <Text style={[styles.rowTag, winnerA && styles.winner]}>{match.tag_a}</Text>
            {finished ? <Text style={[styles.rowScore, winnerA && styles.winner]}>{match.score_a ?? '—'}</Text> : null}
          </View>
          <Text style={styles.rowVs}>{finished ? '—' : 'VS'}</Text>
          <View style={[styles.rowTeam, styles.rowTeamRight]}>
            {finished ? <Text style={[styles.rowScore, winnerB && styles.winner]}>{match.score_b ?? '—'}</Text> : null}
            <Text style={[styles.rowTag, winnerB && styles.winner]}>{match.tag_b}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.rowArrow}>›</Text>
    </Pressable>
  );
}

function EmptyState({ status }: { status: StatusFilter }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyEyebrow}>{status === 'upcoming' ? 'CALENDRIER' : 'HISTORIQUE'}</Text>
      <Text style={styles.emptyTitle}>
        {status === 'upcoming' ? 'Le calme avant la prochaine affiche.' : 'Aucun verdict pour ce filtre.'}
      </Text>
      <Text style={styles.emptyCopy}>
        {status === 'upcoming'
          ? 'Aucun match futur n’est encore programmé. Dès qu’un match entre dans Supabase, il apparaît ici.'
          : 'Les matchs terminés correspondant à ce jeu apparaîtront ici.'}
      </Text>
    </View>
  );
}

function TimePill({ value }: { value: string }) {
  const delta = new Date(value).getTime() - Date.now();
  let text = 'LIVE';
  if (delta > 0) {
    const hours = Math.floor(delta / 3_600_000);
    text = hours < 1
      ? `${Math.max(1, Math.ceil(delta / 60_000))} MIN`
      : hours < 24
        ? `DANS ${hours}H`
        : `DANS ${Math.ceil(hours / 24)}J`;
  }
  return <View style={styles.timePill}><Text style={styles.timePillText}>{text}</Text></View>;
}

function openMatch(id: string) {
  router.push({ pathname: '/match/[id]', params: { id } });
}

function groupMatches(matches: ArenaMatch[]) {
  const groups: { label: string; matches: ArenaMatch[] }[] = [];
  for (const match of matches) {
    const label = temporalLabel(match.debut, match.statut === 'termine');
    const existing = groups.find((group) => group.label === label);
    if (existing) existing.matches.push(match);
    else groups.push({ label, matches: [match] });
  }
  return groups;
}

function temporalLabel(value: string, finished: boolean) {
  const date = new Date(value);
  if (finished) {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
  }
  const now = new Date();
  if (sameDay(date, now)) return "AUJOURD'HUI";
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  eyebrow: { color: colors.volt, fontSize: 10, fontWeight: '900', letterSpacing: 1.7, marginBottom: 7 },
  title: { color: colors.text, fontSize: 33, lineHeight: 36, fontWeight: '900', letterSpacing: -1 },
  subtitle: { maxWidth: 285, marginTop: 8, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  countBadge: { minWidth: 58, paddingVertical: 10, paddingHorizontal: 8, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  countValue: { color: colors.text, fontSize: 18, fontWeight: '900' },
  countLabel: { marginTop: 2, color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: .8 },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: radius.md, backgroundColor: '#0A0E13', borderWidth: 1, borderColor: colors.border },
  segment: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.surfaceElevated },
  segmentText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  segmentTextActive: { color: colors.text },
  filters: { gap: 8, paddingRight: spacing.md },
  filter: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: '#1B2115', borderColor: '#3C4A20' },
  filterText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  filterTextActive: { color: colors.volt },
  errorCard: { padding: spacing.md, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#48242A', gap: 8 },
  errorText: { color: '#FF9AA3', fontSize: 12, lineHeight: 17 },
  retry: { color: colors.volt, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  section: { gap: spacing.sm },
  sectionEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  sectionTitle: { marginTop: 4, color: colors.text, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm },
  historyLink: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: .8 },
  featured: { position: 'relative', overflow: 'hidden', padding: spacing.lg, borderRadius: 28, backgroundColor: '#0D1218', borderWidth: 1, borderColor: '#2B3541', gap: spacing.md },
  featuredAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.volt },
  featuredTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  featuredMeta: { flex: 1, color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: .5 },
  featuredQuestion: { color: colors.text, fontSize: 21, lineHeight: 25, fontWeight: '900', letterSpacing: -.4 },
  featuredDuel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  teamBlock: { width: '36%', alignItems: 'center', gap: 8 },
  teamMark: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  teamTag: { color: colors.text, fontSize: 17, fontWeight: '900' },
  teamName: { color: colors.text, fontSize: 11, lineHeight: 15, fontWeight: '800', textAlign: 'center' },
  vsBlock: { alignItems: 'center', gap: 3 },
  bo: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  vs: { color: colors.text, fontSize: 17, fontWeight: '900' },
  kickoff: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  timePill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#182014', borderWidth: 1, borderColor: '#35451F' },
  timePillText: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: .7 },
  featuredCta: { minHeight: 58, marginTop: 2, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.volt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaEyebrow: { color: '#30350A', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  ctaText: { marginTop: 3, color: '#080B0F', fontSize: 12, fontWeight: '900', letterSpacing: .6 },
  arrowCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#080B0F', alignItems: 'center', justifyContent: 'center' },
  arrow: { color: colors.volt, fontSize: 17, fontWeight: '900' },
  groups: { gap: spacing.lg },
  dayGroup: { gap: 9 },
  dayLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  dayLine: { flex: 1, height: 1, backgroundColor: colors.border },
  timeline: { gap: 8 },
  matchRow: { minHeight: 82, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  whenCol: { width: 47 },
  whenTime: { color: colors.text, fontSize: 11, fontWeight: '900' },
  whenGame: { marginTop: 4, color: colors.textMuted, fontSize: 8, fontWeight: '800' },
  rowMain: { flex: 1, minWidth: 0, gap: 8 },
  rowEvent: { color: colors.textMuted, fontSize: 8, fontWeight: '700' },
  rowTeams: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTeam: { minWidth: 62, flexDirection: 'row', alignItems: 'center', gap: 7 },
  rowTeamRight: { justifyContent: 'flex-end' },
  rowTag: { color: colors.text, fontSize: 12, fontWeight: '900' },
  rowScore: { color: colors.textMuted, fontSize: 13, fontWeight: '900' },
  winner: { color: colors.volt },
  rowVs: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  rowArrow: { color: colors.textMuted, fontSize: 22, fontWeight: '500' },
  emptyCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 8 },
  emptyEyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  emptyTitle: { color: colors.text, fontSize: 19, lineHeight: 24, fontWeight: '900' },
  emptyCopy: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: .82, transform: [{ scale: .99 }] },
});
