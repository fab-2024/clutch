import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClutchHeader } from '@/src/components/layout/ClutchHeader';
import { Screen } from '@/src/components/layout/Screen';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radius, spacing } from '@/src/theme';

import { loadHubData } from '../api';
import type { HubData, HubFaction } from '../types';

const EMPTY_HUB: HubData = {
  seasonId: null,
  seasonName: null,
  frags: null,
  streak: 0,
  nextMatch: null,
  predictionsToday: 0,
  leagueCount: 0,
  faction: null,
};

export default function HomeScreen() {
  const { session } = useAuth();
  const [hub, setHub] = useState<HubData>(EMPTY_HUB);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!session?.user.id) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { setHub(await loadHubData(session.user.id)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Impossible de charger le Hub.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [session?.user.id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
      >
        <ClutchHeader />

        <View style={styles.introCard}>
          <View style={styles.kickerRow}><View style={styles.kickerLine} /><Text style={styles.kicker}>CLUTCH // AUJOURD’HUI</Text></View>
          <Text style={styles.introTitle}>TON PROCHAIN CALL{`\n`}COMMENCE ICI.</Text>
          <Text style={styles.introCopy}>Choisis ton camp sur un vrai match. Le classement, la faction et le reste viennent ensuite.</Text>
          <Pressable onPress={() => router.push('/(tabs)/matches')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>JOUER</Text>
          </Pressable>
        </View>

        {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View> : null}

        {loading ? <HeroSkeleton /> : hub.nextMatch ? <MatchHero match={hub.nextMatch} /> : <EmptyHero />}

        <View style={styles.statsRow}>
          <Stat label="FRAGS" value={loading ? '—' : formatNumber(hub.frags?.frags ?? 0)} />
          <View style={styles.statDivider} />
          <Stat label="SÉRIE" value={loading ? '—' : `${hub.streak} J`} />
          <View style={styles.statDivider} />
          <Stat label="LIGUES" value={loading ? '—' : String(hub.leagueCount)} />
        </View>

        <FactionStrip faction={hub.faction} />
      </ScrollView>
    </Screen>
  );
}

function MatchHero({ match }: { match: NonNullable<HubData['nextMatch']> }) {
  const live = match.statut === 'en_cours' || new Date(match.debut).getTime() <= Date.now();
  return (
    <Pressable onPress={() => router.push('/(tabs)/matches')} style={({ pressed }) => [styles.matchCard, pressed && styles.pressed]}>
      <View style={styles.blueField} />
      <View style={styles.purpleField} />
      <View style={styles.centerLine} />

      <View style={styles.matchTop}>
        <View style={styles.eventRow}>
          <View style={styles.eventDot} />
          <Text numberOfLines={1} style={styles.eventText}>{gameName(match.jeu).toUpperCase()} · {match.evenement}</Text>
        </View>
        <View style={[styles.livePill, !live && styles.timePill]}>
          <View style={[styles.liveDot, !live && styles.timeDot]} />
          <Text style={[styles.liveText, !live && styles.timeText]}>{live ? 'LIVE' : formatTime(match.debut)}</Text>
        </View>
      </View>

      <View style={styles.matchHeadline}>
        <Text style={styles.matchKicker}>MATCH DU MOMENT</Text>
        <Text style={styles.matchTitle}>{live ? 'LE MATCH EST LANCÉ' : 'TON PROCHAIN DUEL'}</Text>
      </View>

      <View style={styles.duel}>
        <Team tag={match.tag_a} name={match.equipe_a} />
        <View style={styles.vsBlock}>
          <Text style={styles.bo}>BO{match.format}</Text>
          <Text style={styles.vs}>VS</Text>
          <View style={styles.vsLine} />
        </View>
        <Team tag={match.tag_b} name={match.equipe_b} />
      </View>

      <View style={styles.matchFooter}>
        <Text style={styles.matchFooterText}>{live ? 'MATCH LANCÉ · PRISES DE POSITION CLOSES' : 'PRENDRE POSITION'}</Text>
        <Text style={styles.matchArrow}>→</Text>
      </View>
    </Pressable>
  );
}

function Team({ tag, name }: { tag: string; name: string }) {
  return (
    <View style={styles.team}>
      <View style={styles.teamMark}><Text adjustsFontSizeToFit numberOfLines={1} style={styles.teamTag}>{tag}</Text></View>
      <Text numberOfLines={2} style={styles.teamName}>{name}</Text>
    </View>
  );
}

function EmptyHero() {
  return (
    <Pressable onPress={() => router.push('/(tabs)/matches')} style={({ pressed }) => [styles.emptyHero, pressed && styles.pressed]}>
      <Text style={styles.emptyKicker}>MATCH DU MOMENT</Text>
      <Text style={styles.emptyTitle}>LE CALME AVANT{`\n`}LA PROCHAINE AFFICHE.</Text>
      <Text style={styles.emptyCopy}>Aucun match futur n’est encore programmé. L’Arena se réactivera automatiquement.</Text>
      <View style={styles.emptyButton}><Text style={styles.emptyButtonText}>OUVRIR LES MATCHS</Text></View>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function FactionStrip({ faction }: { faction: HubFaction | null }) {
  return (
    <Pressable onPress={() => router.push('/(tabs)/social/faction')} style={({ pressed }) => [styles.factionStrip, pressed && styles.pressed]}>
      <View style={styles.factionMark}><Text style={styles.factionMarkText}>{faction?.tag?.slice(0, 2) || '✦'}</Text></View>
      <View style={styles.factionCopy}>
        <Text style={styles.factionKicker}>FACTION</Text>
        <Text style={styles.factionTitle}>{faction?.nom || 'Choisis ton camp.'}</Text>
        <Text style={styles.factionMeta}>{faction ? `${formatNumber(faction.membres)} supporter${faction.membres > 1 ? 's' : ''}` : 'Ta relique collective apparaîtra ici.'}</Text>
      </View>
      <Text style={styles.factionArrow}>→</Text>
    </Pressable>
  );
}

function HeroSkeleton() {
  return <View style={styles.skeleton}><View style={styles.skeletonLine} /><View style={styles.skeletonBig} /><View style={styles.skeletonLine} /></View>;
}

function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }
function formatTime(value: string) { return new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); }
function gameName(game: string) {
  const key = String(game || '').toLowerCase();
  if (key.includes('lol') || key.includes('league')) return 'LoL';
  if (key.includes('valorant')) return 'Valorant';
  if (key.includes('cs')) return 'CS2';
  return String(game || 'Esport');
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', paddingBottom: 125, gap: 18 },
  introCard: { marginHorizontal: spacing.md, padding: 18, borderRadius: 27, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#262F38' },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  kickerLine: { width: 20, height: 1, backgroundColor: colors.volt },
  kicker: { color: colors.volt, fontSize: 10, fontWeight: '900', letterSpacing: 2.8 },
  introTitle: { marginTop: 17, color: '#F4F6F7', fontSize: 37, lineHeight: 34, fontWeight: '900', letterSpacing: -2.8 },
  introCopy: { marginTop: 12, color: '#909AA5', fontSize: 15, lineHeight: 22 },
  primaryButton: { alignSelf: 'flex-start', minWidth: 150, minHeight: 48, marginTop: 14, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  primaryButtonText: { color: '#080A0C', fontSize: 14, fontWeight: '900', letterSpacing: 0.4 },
  errorCard: { marginHorizontal: spacing.md, padding: 13, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' },
  errorText: { color: '#FF9AA2', fontSize: 11 },
  matchCard: { position: 'relative', minHeight: 480, marginHorizontal: spacing.md, padding: 18, overflow: 'hidden', borderRadius: 28, backgroundColor: '#0F151C', borderWidth: 1, borderColor: '#3A434D' },
  blueField: { position: 'absolute', left: -50, top: 85, bottom: 0, width: '64%', backgroundColor: 'rgba(15,60,110,0.40)', transform: [{ skewX: '-7deg' }] },
  purpleField: { position: 'absolute', right: -50, top: 85, bottom: 0, width: '64%', backgroundColor: 'rgba(104,36,101,0.34)', transform: [{ skewX: '7deg' }] },
  centerLine: { position: 'absolute', left: '50%', top: 105, bottom: 70, width: 1, backgroundColor: 'rgba(232,255,61,0.12)' },
  matchTop: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  eventRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#A8B2BE' },
  eventText: { flex: 1, color: '#AAB3BE', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  livePill: { minHeight: 32, paddingHorizontal: 12, borderRadius: 17, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1B1116', borderWidth: 1, borderColor: '#813342' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#CF485E' },
  liveText: { color: '#FFB8C3', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  timePill: { backgroundColor: '#10151D', borderColor: '#2B3641' },
  timeDot: { backgroundColor: colors.volt },
  timeText: { color: colors.volt },
  matchHeadline: { zIndex: 2, alignItems: 'center', marginTop: 42 },
  matchKicker: { color: '#7E8997', fontSize: 10, fontWeight: '900', letterSpacing: 2.7 },
  matchTitle: { marginTop: 8, color: '#F5F6F7', fontSize: 39, lineHeight: 40, fontWeight: '900', letterSpacing: -2.7, textAlign: 'center' },
  duel: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 54 },
  team: { flex: 1, alignItems: 'center', gap: 15 },
  teamMark: { width: 82, height: 82, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151B22', borderWidth: 1, borderColor: '#38434E' },
  teamTag: { color: colors.volt, fontSize: 20, fontWeight: '900', letterSpacing: -0.8 },
  teamName: { minHeight: 46, color: '#F3F5F6', fontSize: 21, lineHeight: 22, fontWeight: '900', letterSpacing: -1, textAlign: 'center' },
  vsBlock: { width: 70, alignItems: 'center' },
  bo: { color: '#7E8997', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  vs: { marginTop: 12, color: '#F4F6F7', fontSize: 45, lineHeight: 47, fontWeight: '900', letterSpacing: -3 },
  vsLine: { marginTop: 7, width: 28, height: 3, borderRadius: 999, backgroundColor: colors.volt },
  matchFooter: { zIndex: 2, marginTop: 'auto', minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  matchFooterText: { color: '#8993A0', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  matchArrow: { color: colors.volt, fontSize: 18, fontWeight: '900' },
  emptyHero: { marginHorizontal: spacing.md, minHeight: 300, padding: 22, justifyContent: 'center', borderRadius: 28, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#2B343E' },
  emptyKicker: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 2.2 },
  emptyTitle: { marginTop: 13, color: colors.text, fontSize: 31, lineHeight: 31, fontWeight: '900', letterSpacing: -2 },
  emptyCopy: { marginTop: 12, color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  emptyButton: { alignSelf: 'flex-start', marginTop: 18, minHeight: 42, paddingHorizontal: 15, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  emptyButtonText: { color: '#080A0C', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statsRow: { marginHorizontal: spacing.md, minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRadius: 20, backgroundColor: '#090E13', borderWidth: 1, borderColor: colors.border },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  statLabel: { marginTop: 4, color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  statDivider: { width: 1, height: 34, backgroundColor: colors.border },
  factionStrip: { marginHorizontal: spacing.md, minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border },
  factionMark: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#46531E' },
  factionMarkText: { color: colors.volt, fontSize: 15, fontWeight: '900' },
  factionCopy: { flex: 1, minWidth: 0 },
  factionKicker: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  factionTitle: { marginTop: 3, color: colors.text, fontSize: 14, fontWeight: '900' },
  factionMeta: { marginTop: 3, color: colors.textMuted, fontSize: 9 },
  factionArrow: { color: colors.volt, fontSize: 18 },
  skeleton: { minHeight: 430, marginHorizontal: spacing.md, padding: 20, justifyContent: 'space-between', borderRadius: 28, backgroundColor: '#0D1218', borderWidth: 1, borderColor: colors.border },
  skeletonLine: { width: '60%', height: 12, borderRadius: 6, backgroundColor: '#171E26' },
  skeletonBig: { width: '80%', height: 160, borderRadius: 28, alignSelf: 'center', backgroundColor: '#151C24' },
  pressed: { opacity: 0.78 },
});
