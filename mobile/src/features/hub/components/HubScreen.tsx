import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClutchHeader } from '@/src/components/layout/ClutchHeader';
import { Screen } from '@/src/components/layout/Screen';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors, radius, spacing } from '@/src/theme';

import { loadHubData } from '../api';
import type { HubData, HubFaction, HubMatch, HubPrediction } from '../types';

const EMPTY_HUB: HubData = {
  seasonId: null,
  seasonName: null,
  frags: null,
  streak: 0,
  nextMatch: null,
  upNext: [],
  nextMatchPrediction: null,
  predictionsToday: 0,
  leagueCount: 0,
  faction: null,
};

export default function HomeScreen() {
  const { profile, session } = useAuth();
  const [hub, setHub] = useState<HubData>(EMPTY_HUB);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!session?.user.id) {
      setHub(EMPTY_HUB);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setHub(await loadHubData(session.user.id, profile?.jeux_suivis ?? []));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de charger le Hub.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.jeux_suivis, session?.user.id]);

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
          <View style={styles.kickerRow}><View style={styles.kickerLine} /><Text numberOfLines={1} style={styles.kicker}>{profile?.pseudo ? `BON RETOUR, ${profile.pseudo.toUpperCase()}` : 'CLUTCH // AUJOURD’HUI'}</Text></View>
          <Text style={styles.introTitle}>TON PROCHAIN CALL{`\n`}COMMENCE ICI.</Text>
          <Text style={styles.introCopy}>{hub.seasonName ? `${hub.seasonName}. Choisis ton camp, puis laisse le match décider de ton rating.` : 'Choisis ton camp sur un vrai match. Le classement, la faction et le reste viennent ensuite.'}</Text>
          <Pressable
            accessibilityLabel={hub.nextMatch ? 'Ouvrir le match du moment' : 'Ouvrir les matchs'}
            accessibilityRole="button"
            onPress={() => hub.nextMatch ? openMatch(hub.nextMatch.id) : router.push('/(tabs)/matches')}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>{primaryActionLabel(hub.nextMatch, hub.nextMatchPrediction, loading)}</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retryText}>RÉESSAYER</Text></Pressable>
          </View>
        ) : null}

        {loading ? <HeroSkeleton /> : hub.nextMatch ? <MatchHero match={hub.nextMatch} prediction={hub.nextMatchPrediction} /> : <EmptyHero />}

        {!loading && hub.upNext.length ? <UpNext matches={hub.upNext} /> : null}

        <View style={styles.statsRow}>
          <Stat label="FRAGS" value={loading ? '—' : formatNumber(hub.frags?.frags ?? 0)} onPress={() => router.push('/(tabs)/profile')} />
          <View style={styles.statDivider} />
          <Stat label="SÉRIE" value={loading ? '—' : `${hub.streak} J`} onPress={() => router.push('/(tabs)/profile')} />
          <View style={styles.statDivider} />
          <Stat label="LIGUES" value={loading ? '—' : String(hub.leagueCount)} onPress={() => router.push('/(tabs)/social/leagues')} />
        </View>

        {!loading ? <SeasonPulse hub={hub} /> : null}

        <FactionStrip faction={hub.faction} />
      </ScrollView>
    </Screen>
  );
}

function MatchHero({ match, prediction }: { match: HubMatch; prediction: HubPrediction | null }) {
  const live = isLive(match);
  const predictionTag = prediction?.choice === 'a' ? match.tag_a : prediction?.choice === 'b' ? match.tag_b : null;
  return (
    <Pressable
      accessibilityHint="Ouvre le Match Center"
      accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}`}
      accessibilityRole="button"
      onPress={() => openMatch(match.id)}
      style={({ pressed }) => [styles.matchCard, pressed && styles.pressed]}
    >
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
          <Text style={[styles.liveText, !live && styles.timeText]}>{live ? 'LIVE' : formatSchedule(match.debut)}</Text>
        </View>
      </View>

      <View style={styles.matchHeadline}>
        <Text style={styles.matchKicker}>MATCH DU MOMENT</Text>
        <Text style={styles.matchTitle}>{live ? 'LE MATCH EST LANCÉ' : prediction ? 'TON CALL EST POSÉ' : 'TON PROCHAIN DUEL'}</Text>
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
        <Text style={[styles.matchFooterText, predictionTag && styles.matchFooterChoice]}>{predictionTag ? `TON CALL · ${predictionTag}${live ? ' · LIVE' : ''}` : live ? 'MATCH LANCÉ · CALLS FERMÉS' : 'PRENDRE POSITION'}</Text>
        <Text style={styles.matchArrow}>→</Text>
      </View>
    </Pressable>
  );
}

function UpNext({ matches }: { matches: HubMatch[] }) {
  return (
    <View style={styles.upNextSection}>
      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.sectionKicker}>À SUIVRE</Text>
          <Text style={styles.sectionTitle}>Tes prochaines affiches.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/matches')}>
          <Text style={styles.sectionLink}>TOUT VOIR →</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upNextRail}>
        {matches.map((match) => (
          <Pressable
            accessibilityLabel={`${match.equipe_a} contre ${match.equipe_b}, ${formatSchedule(match.debut)}`}
            accessibilityRole="button"
            key={match.id}
            onPress={() => openMatch(match.id)}
            style={({ pressed }) => [styles.upNextCard, pressed && styles.pressed]}
          >
            <View style={styles.upNextTop}>
              <Text style={styles.upNextWhen}>{formatSchedule(match.debut)}</Text>
              <Text style={styles.upNextGame}>{gameName(match.jeu).toUpperCase()}</Text>
            </View>
            <Text numberOfLines={1} style={styles.upNextEvent}>{match.evenement}</Text>
            <View style={styles.upNextDuel}>
              <Text style={styles.upNextTag}>{match.tag_a}</Text>
              <Text style={styles.upNextVs}>VS</Text>
              <Text style={styles.upNextTag}>{match.tag_b}</Text>
            </View>
            <View style={styles.upNextFooter}>
              <Text style={styles.upNextFormat}>BO{match.format}</Text>
              <Text style={styles.upNextArrow}>→</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
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
    <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/matches')} style={({ pressed }) => [styles.emptyHero, pressed && styles.pressed]}>
      <Text style={styles.emptyKicker}>MATCH DU MOMENT</Text>
      <Text style={styles.emptyTitle}>LE CALME AVANT{`\n`}LA PROCHAINE AFFICHE.</Text>
      <Text style={styles.emptyCopy}>Aucun match futur n’est encore programmé. L’Arena se réactivera automatiquement.</Text>
      <View style={styles.emptyButton}><Text style={styles.emptyButtonText}>OUVRIR LES MATCHS</Text></View>
    </Pressable>
  );
}

function Stat({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={`${label}, ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.stat, pressed && styles.statPressed]}
    >
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function SeasonPulse({ hub }: { hub: HubData }) {
  const settled = hub.frags?.pronostics_regles ?? 0;
  const wins = hub.frags?.pronostics_gagnes ?? 0;
  const accuracy = settled ? `${Math.round((wins / settled) * 100)} %` : '—';
  const remaining = hub.frags?.placements_restants ?? 0;
  const provisional = Boolean(hub.frags?.provisoire);
  const title = !hub.seasonId
    ? 'LA PROCHAINE SAISON SE PRÉPARE.'
    : provisional && remaining > 0
      ? 'TON RATING PREND FORME.'
      : 'TON RATING EST EN JEU.';
  const copy = !hub.seasonId
    ? 'Ton Hub se remettra en mouvement dès l’ouverture du prochain classement.'
    : provisional && remaining > 0
      ? `Encore ${remaining} call${remaining > 1 ? 's' : ''} classé${remaining > 1 ? 's' : ''} avant ton premier rang officiel.`
      : 'Chaque verdict peut maintenant faire bouger ta place dans le classement.';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/(tabs)/profile')}
      style={({ pressed }) => [styles.seasonCard, pressed && styles.pressed]}
    >
      <View style={styles.seasonTop}>
        <Text numberOfLines={1} style={styles.seasonName}>{hub.seasonName?.toUpperCase() || 'INTERSAISON'}</Text>
        <View style={styles.seasonPill}><View style={styles.seasonDot} /><Text style={styles.seasonPillText}>{hub.seasonId ? 'EN COURS' : 'EN ATTENTE'}</Text></View>
      </View>
      <Text style={styles.seasonTitle}>{title}</Text>
      <Text style={styles.seasonCopy}>{copy}</Text>
      <View style={styles.seasonMetrics}>
        <View style={styles.seasonMetric}>
          <Text style={styles.seasonMetricValue}>{hub.predictionsToday}</Text>
          <Text style={styles.seasonMetricLabel}>CALLS AUJ.</Text>
        </View>
        <View style={styles.seasonMetricDivider} />
        <View style={styles.seasonMetric}>
          <Text style={styles.seasonMetricValue}>{accuracy}</Text>
          <Text style={styles.seasonMetricLabel}>PRÉCISION</Text>
        </View>
        <View style={styles.seasonMetricDivider} />
        <View style={styles.seasonMetric}>
          <Text style={styles.seasonMetricValue}>{settled}</Text>
          <Text style={styles.seasonMetricLabel}>VERDICTS</Text>
        </View>
      </View>
    </Pressable>
  );
}

function FactionStrip({ faction }: { faction: HubFaction | null }) {
  return (
    <Pressable onPress={() => router.push('/(tabs)/social/faction')} style={({ pressed }) => [styles.factionStrip, pressed && styles.pressed]}>
      <View style={styles.factionMark}><Text style={styles.factionMarkText}>{faction?.tag?.slice(0, 2) || '✦'}</Text></View>
      <View style={styles.factionCopy}>
        <Text style={styles.factionKicker}>FACTION</Text>
        <Text style={styles.factionTitle}>{faction?.nom || 'Choisis ton camp.'}</Text>
        <Text style={styles.factionMeta}>{faction ? `Niveau ${faction.niveauAtteint} · ${formatNumber(faction.membres)} supporter${faction.membres > 1 ? 's' : ''}` : 'Ta relique collective apparaîtra ici.'}</Text>
      </View>
      {faction && faction.croissance24h > 0 ? <Text style={styles.factionGrowth}>+{faction.croissance24h} / 24H</Text> : null}
      <Text style={styles.factionArrow}>→</Text>
    </Pressable>
  );
}

function HeroSkeleton() {
  return <View style={styles.skeleton}><View style={styles.skeletonLine} /><View style={styles.skeletonBig} /><View style={styles.skeletonLine} /></View>;
}

function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }
function openMatch(id: string) { router.push({ pathname: '/match/[id]', params: { id } }); }
function isLive(match: HubMatch) { return match.statut === 'en_cours' || new Date(match.debut).getTime() <= Date.now(); }
function primaryActionLabel(match: HubMatch | null, prediction: HubPrediction | null, loading: boolean) {
  if (loading) return 'OUVRIR LES MATCHS';
  if (!match) return 'VOIR LE CALENDRIER';
  if (isLive(match)) return 'SUIVRE LE LIVE';
  if (prediction) return 'VOIR MON CALL';
  return 'PRENDRE POSITION';
}
function formatSchedule(value: string) {
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay(date, today)) return `AUJ. ${time}`;
  if (sameDay(date, tomorrow)) return `DEM. ${time}`;
  return `${date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '').toUpperCase()} ${time}`;
}
function sameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
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
  kicker: { flex: 1, color: colors.volt, fontSize: 10, fontWeight: '900', letterSpacing: 2.8 },
  introTitle: { marginTop: 17, color: '#F4F6F7', fontSize: 37, lineHeight: 34, fontWeight: '900', letterSpacing: -2.8 },
  introCopy: { marginTop: 12, color: '#909AA5', fontSize: 15, lineHeight: 22 },
  primaryButton: { alignSelf: 'flex-start', minWidth: 150, minHeight: 48, marginTop: 14, paddingHorizontal: 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  primaryButtonText: { color: '#080A0C', fontSize: 14, fontWeight: '900', letterSpacing: 0.4 },
  errorCard: { marginHorizontal: spacing.md, padding: 13, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  errorText: { flex: 1, color: '#FF9AA2', fontSize: 11 },
  retryText: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
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
  matchFooterChoice: { color: colors.volt },
  matchArrow: { color: colors.volt, fontSize: 18, fontWeight: '900' },
  upNextSection: { gap: 11 },
  sectionHead: { marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionKicker: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  sectionTitle: { marginTop: 4, color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.6 },
  sectionLink: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 0.4 },
  upNextRail: { paddingHorizontal: spacing.md, gap: 10 },
  upNextCard: { width: 220, minHeight: 150, padding: 14, borderRadius: 20, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#27313B' },
  upNextTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  upNextWhen: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  upNextGame: { color: '#75818E', fontSize: 8, fontWeight: '900' },
  upNextEvent: { marginTop: 10, color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  upNextDuel: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  upNextTag: { color: colors.text, fontSize: 19, fontWeight: '900', letterSpacing: -0.7 },
  upNextVs: { color: '#66717D', fontSize: 8, fontWeight: '900' },
  upNextFooter: { marginTop: 'auto', paddingTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1A222B' },
  upNextFormat: { color: colors.textMuted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  upNextArrow: { color: colors.volt, fontSize: 16, fontWeight: '900' },
  emptyHero: { marginHorizontal: spacing.md, minHeight: 300, padding: 22, justifyContent: 'center', borderRadius: 28, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#2B343E' },
  emptyKicker: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 2.2 },
  emptyTitle: { marginTop: 13, color: colors.text, fontSize: 31, lineHeight: 31, fontWeight: '900', letterSpacing: -2 },
  emptyCopy: { marginTop: 12, color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  emptyButton: { alignSelf: 'flex-start', marginTop: 18, minHeight: 42, paddingHorizontal: 15, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt },
  emptyButtonText: { color: '#080A0C', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statsRow: { marginHorizontal: spacing.md, minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRadius: 20, backgroundColor: '#090E13', borderWidth: 1, borderColor: colors.border },
  stat: { flex: 1, minHeight: 80, alignItems: 'center', justifyContent: 'center' },
  statPressed: { opacity: 0.55 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '900' },
  statLabel: { marginTop: 4, color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  statDivider: { width: 1, height: 34, backgroundColor: colors.border },
  seasonCard: { marginHorizontal: spacing.md, padding: 18, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#303A22' },
  seasonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  seasonName: { flex: 1, color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  seasonPill: { minHeight: 26, paddingHorizontal: 9, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#141A0F', borderWidth: 1, borderColor: '#3D481E' },
  seasonDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt },
  seasonPillText: { color: colors.volt, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  seasonTitle: { maxWidth: 330, marginTop: 18, color: colors.text, fontSize: 25, lineHeight: 25, fontWeight: '900', letterSpacing: -1.2 },
  seasonCopy: { marginTop: 9, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  seasonMetrics: { minHeight: 62, marginTop: 17, paddingTop: 14, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#20282C' },
  seasonMetric: { flex: 1, alignItems: 'center' },
  seasonMetricValue: { color: colors.text, fontSize: 17, fontWeight: '900' },
  seasonMetricLabel: { marginTop: 4, color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  seasonMetricDivider: { width: 1, height: 30, backgroundColor: '#273028' },
  factionStrip: { marginHorizontal: spacing.md, minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border },
  factionMark: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#46531E' },
  factionMarkText: { color: colors.volt, fontSize: 15, fontWeight: '900' },
  factionCopy: { flex: 1, minWidth: 0 },
  factionKicker: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1.2 },
  factionTitle: { marginTop: 3, color: colors.text, fontSize: 14, fontWeight: '900' },
  factionMeta: { marginTop: 3, color: colors.textMuted, fontSize: 9 },
  factionGrowth: { color: colors.success, fontSize: 9, fontWeight: '900' },
  factionArrow: { color: colors.volt, fontSize: 18 },
  skeleton: { minHeight: 430, marginHorizontal: spacing.md, padding: 20, justifyContent: 'space-between', borderRadius: 28, backgroundColor: '#0D1218', borderWidth: 1, borderColor: colors.border },
  skeletonLine: { width: '60%', height: 12, borderRadius: 6, backgroundColor: '#171E26' },
  skeletonBig: { width: '80%', height: 160, borderRadius: 28, alignSelf: 'center', backgroundColor: '#151C24' },
  pressed: { opacity: 0.78 },
});
