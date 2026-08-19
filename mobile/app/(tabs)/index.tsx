import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { useAuth } from '@/providers/AuthProvider';
import { type HubData, loadHubData } from '@/src/services/hub';
import { colors, radius, spacing } from '@/src/theme/tokens';

const EMPTY_HUB: HubData = {
  seasonId: null,
  seasonName: null,
  frags: null,
  streak: 0,
  nextMatch: null,
};

export default function HomeScreen() {
  const { session, profile } = useAuth();
  const [hub, setHub] = useState<HubData>(EMPTY_HUB);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!session?.user.id) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);

    try {
      setHub(await loadHubData(session.user.id));
    } catch (caught) {
      console.error(caught);
      setError(caught instanceof Error ? caught.message : 'Impossible de charger le Hub.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const pseudo = profile?.pseudo || session?.user.email?.split('@')[0] || 'joueur';
  const initials = pseudo.slice(0, 2).toUpperCase();
  const placementsDone = Math.max(0, 5 - Number(hub.frags?.placements_restants ?? 5));
  const placementProgress = `${Math.min(100, placementsDone * 20)}%` as `${number}%`;

  const stats = useMemo(() => [
    { label: 'Frags', value: formatNumber(hub.frags?.frags ?? 0) },
    { label: 'Série', value: `${hub.streak} j` },
    { label: 'Placements', value: `${placementsDone}/5` },
  ], [hub.frags?.frags, hub.streak, placementsDone]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <Text style={styles.brand}>CLUTCH</Text>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        </View>

        <View>
          <Text style={styles.eyebrow}>{hub.seasonName ? hub.seasonName.toUpperCase() : 'CLUTCH HUB'}</Text>
          <Text style={styles.title}>{pseudo}, ton prochain call.</Text>
          <Text style={styles.subtitle}>Un match. Un camp. Le reste de Clutch réagit à ton choix.</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.stat}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{loading ? '—' : stat.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionKicker}>PROCHAIN MATCH</Text>
          {hub.nextMatch ? (
            <View style={styles.livePill}><Text style={styles.liveText}>{countdown(hub.nextMatch.debut)}</Text></View>
          ) : null}
        </View>

        {hub.nextMatch ? <MatchCard match={hub.nextMatch} /> : <EmptyMatch />}

        <View style={styles.progressCard}>
          <View style={styles.progressCopy}>
            <Text style={styles.sectionKicker}>RATING</Text>
            <Text style={styles.progressTitle}>
              {hub.frags?.provisoire ? 'Ton rating est encore provisoire.' : 'Ton rating est établi.'}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: placementProgress }]} />
          </View>
          <Text style={styles.progressHint}>
            {hub.frags?.placements_restants
              ? `Encore ${hub.frags.placements_restants} pronostic${hub.frags.placements_restants > 1 ? 's' : ''} avant ton rating complet.`
              : `${formatNumber(hub.frags?.frags ?? 0)} Frags · ${hub.frags?.pronostics_gagnes ?? 0} pronostics gagnés.`}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function MatchCard({ match }: { match: NonNullable<HubData['nextMatch']> }) {
  return (
    <View style={styles.matchCard}>
      <View style={styles.gameRow}>
        <Text style={styles.game}>{gameName(match.jeu)} · {match.evenement}</Text>
        <Text style={styles.bo}>BO{match.format}</Text>
      </View>

      <View style={styles.teamsRow}>
        <Team tag={match.tag_a} name={match.equipe_a} />
        <View style={styles.vsWrap}>
          <Text style={styles.vs}>VS</Text>
          <Text style={styles.time}>{formatTime(match.debut)}</Text>
        </View>
        <Team tag={match.tag_b} name={match.equipe_b} />
      </View>

      <Pressable style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
        <Text style={styles.ctaText}>PRENDRE POSITION</Text>
        <Text style={styles.ctaArrow}>→</Text>
      </Pressable>
    </View>
  );
}

function Team({ tag, name }: { tag: string; name: string }) {
  return (
    <View style={styles.team}>
      <View style={styles.teamLogo}><Text style={styles.teamLogoText}>{tag}</Text></View>
      <Text numberOfLines={2} style={styles.teamName}>{name}</Text>
    </View>
  );
}

function EmptyMatch() {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>Le calme avant la prochaine affiche.</Text>
      <Text style={styles.emptyCopy}>Aucun match futur n’est encore programmé dans Supabase.</Text>
    </View>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function countdown(value: string) {
  const delta = new Date(value).getTime() - Date.now();
  if (delta <= 0) return 'LIVE';
  const hours = Math.floor(delta / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.ceil(delta / 60_000))} MIN`;
  if (hours < 24) return `DANS ${hours}H`;
  return `DANS ${Math.ceil(hours / 24)}J`;
}

function gameName(game: string) {
  const key = String(game || '').toLowerCase();
  if (key.includes('lol')) return 'LEAGUE OF LEGENDS';
  if (key.includes('valorant')) return 'VALORANT';
  if (key.includes('cs')) return 'COUNTER-STRIKE 2';
  return String(game || 'ESPORT').toUpperCase();
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { color: colors.volt, fontSize: 22, fontWeight: '900', letterSpacing: 1.4 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  eyebrow: { color: colors.volt, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: spacing.xs },
  title: { color: colors.text, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.1 },
  subtitle: { marginTop: spacing.xs, color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  error: { color: '#FF8B8B', fontSize: 12, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    minWidth: 0,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  statValue: { marginTop: spacing.xs, color: colors.text, fontSize: 17, fontWeight: '900' },
  sectionHeader: { marginBottom: -12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionKicker: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  livePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#161D15', borderWidth: 1, borderColor: '#2D4023' },
  liveText: { color: colors.volt, fontSize: 9, fontWeight: '900' },
  matchCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#2A343F', gap: spacing.lg },
  gameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  game: { flex: 1, color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  bo: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  team: { width: '36%', alignItems: 'center', gap: spacing.sm },
  teamLogo: { width: 62, height: 62, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  teamLogoText: { color: colors.text, fontSize: 17, fontWeight: '900' },
  teamName: { color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'center' },
  vsWrap: { alignItems: 'center', gap: 4 },
  vs: { color: colors.textMuted, fontSize: 11, fontWeight: '900' },
  time: { color: colors.text, fontSize: 14, fontWeight: '900' },
  cta: { minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.volt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaPressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  ctaText: { color: '#080B0F', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  ctaArrow: { color: '#080B0F', fontSize: 22, fontWeight: '900' },
  emptyCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: 18, lineHeight: 23, fontWeight: '900' },
  emptyCopy: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  progressCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  progressCopy: { gap: spacing.xs },
  progressTitle: { color: colors.text, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  progressTrack: { height: 8, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.surfaceElevated },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.volt },
  progressHint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
});
