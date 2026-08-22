import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClutchHeader } from '@/src/components/layout/ClutchHeader';
import { Screen } from '@/src/components/layout/Screen';
import { CurrencyIcon } from '@/src/components/ui/CurrencyIcon';
import { trackAnalyticsEvent } from '@/src/features/analytics/api';
import { colors, fonts, layout, radius, spacing, typography } from '@/src/theme';

import { loadRankDashboard } from '../api';
import { gradeAccent } from '../grades';
import type { RankDashboard, RankLeaderboardRow, RankScope } from '../types';

type Section = 'season' | 'leaderboards' | 'rewards';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'season', label: 'Ma saison' },
  { key: 'leaderboards', label: 'Classements' },
  { key: 'rewards', label: 'Récompenses' },
];

const SCOPES: { key: RankScope; label: string }[] = [
  { key: 'global', label: 'Global' },
  { key: 'cercle', label: 'Cercle' },
  { key: 'faction', label: 'Faction' },
];

export default function RankScreen({ previewData }: { previewData?: RankDashboard }) {
  const [dashboard, setDashboard] = useState<RankDashboard | null>(previewData ?? null);
  const [section, setSection] = useState<Section>('season');
  const [scope, setScope] = useState<RankScope>('global');
  const [loading, setLoading] = useState(!previewData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (previewData) {
      setDashboard(previewData);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try { setDashboard(await loadRankDashboard()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Impossible de charger Rank.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [previewData]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (previewData) return;
    const day = new Date().toISOString().slice(0, 10);
    void trackAnalyticsEvent({ type: 'rank_consulte', idempotencyKey: `rank:${day}` }).catch(() => undefined);
  }, [previewData]);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
        showsVerticalScrollIndicator={false}
      >
        <ClutchHeader />
        <View style={styles.intro}><Text style={styles.eyebrow}>RANK // SAISON</Text><Text style={styles.title}>TA TRACE DANS{`\n`}LE CLASSEMENT.</Text><Text style={styles.subtitle}>Le rating Frags reste inchangé : 1 000 au départ, cinq placements, puis montée et descente selon chaque verdict.</Text></View>
        <View style={styles.tabs}>{SECTIONS.map((item) => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: section === item.key }} onPress={() => setSection(item.key)} style={[styles.tab, section === item.key && styles.tabActive]}><Text style={[styles.tabText, section === item.key && styles.tabTextActive]}>{item.label}</Text></Pressable>)}</View>

        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={styles.retry}>RÉESSAYER</Text></Pressable></View> : null}
        {loading ? <RankSkeleton /> : null}
        {!loading && dashboard && section === 'season' ? <SeasonSection dashboard={dashboard} /> : null}
        {!loading && dashboard && section === 'leaderboards' ? <LeaderboardSection dashboard={dashboard} scope={scope} onScope={setScope} /> : null}
        {!loading && dashboard && section === 'rewards' ? <RewardsSection dashboard={dashboard} /> : null}
      </ScrollView>
    </Screen>
  );
}

function SeasonSection({ dashboard }: { dashboard: RankDashboard }) {
  const state = dashboard.state;
  if (!dashboard.season || !state) return <EmptyState title="INTERSAISON." copy="La prochaine saison réactivera les Frags, placements et classements." />;
  const accent = gradeAccent(state.grade);
  const placementTarget = state.grade.objectif_placements;
  const completed = Math.max(0, placementTarget - state.placementsRemaining);
  const progress = state.provisional ? completed / placementTarget : state.grade.progression;
  const accuracy = state.settledCalls ? Math.round((state.wonCalls / state.settledCalls) * 100) : 0;
  const next = state.provisional
    ? `${state.placementsRemaining} verdict${state.placementsRemaining > 1 ? 's' : ''} avant la révélation`
    : state.grade.prochain_libelle
      ? `${Math.max(0, Number(state.grade.prochain_minimum ?? state.frags) - state.frags)} Frags avant ${state.grade.prochain_libelle}`
      : 'Palier saisonnier maximal atteint';

  return (
    <View style={styles.sectionStack}>
      <View style={[styles.seasonHero, { borderColor: `${accent}66` }]}>
        <View style={[styles.aura, { backgroundColor: accent }]} />
        <View style={styles.seasonTop}><View><Text style={[styles.seasonKicker, { color: accent }]}>{dashboard.season.name.toUpperCase()}</Text><Text style={styles.gradeName}>{state.provisional ? 'PLACEMENT' : state.grade.libelle?.toUpperCase() || 'NON CLASSÉ'}</Text></View><View style={[styles.gradeMark, { borderColor: accent }]}><Text style={[styles.gradeGlyph, { color: accent }]}>◆</Text></View></View>
        <View style={styles.ratingRow}><Text style={styles.rating}>{formatNumber(state.frags)}</Text><View style={styles.ratingUnit}><CurrencyIcon kind="frags" size={15} /><Text style={styles.ratingUnitText}>FRAGS</Text></View></View>
        <Text style={styles.next}>{next.toUpperCase()}</Text>
        <View style={styles.track}><View style={[styles.trackFill, { width: `${Math.max(2, Math.round(progress * 100))}%`, backgroundColor: accent }]} /></View>
        <View style={styles.heroMetrics}><Metric label="RANG" value={state.provisional ? '—' : state.rank ? `#${state.rank}` : '—'} /><Metric label="PRÉCISION" value={state.settledCalls ? `${accuracy}%` : '—'} /><Metric label="RECORD" value={formatNumber(state.peakFrags)} /></View>
      </View>

      <View style={styles.contractCard}><Text style={styles.cardEyebrow}>CONTRAT FRAGS V1</Text><Text style={styles.cardTitle}>Lisible. Fixe. Sans avantage payant.</Text><View style={styles.contractGrid}><ContractItem label="BASE" value="1 000" /><ContractItem label="PLACEMENTS" value="5" /><ContractItem label="K" value="60 → 40" /><ContractItem label="MOUVEMENT" value="± FRAGS" /></View></View>
      <View style={styles.recordCard}><Text style={styles.cardEyebrow}>TRACE DE SAISON</Text><View style={styles.recordRow}><Metric label="MEILLEUR GRADE" value={state.bestGrade?.libelle?.toUpperCase() || state.grade.libelle?.toUpperCase() || '—'} /><Metric label="MEILLEUR RANG" value={state.bestRank ? `#${state.bestRank}` : '—'} /><Metric label="JOUEURS CLASSÉS" value={formatNumber(state.classifiedPlayers)} /></View></View>
    </View>
  );
}

function LeaderboardSection({ dashboard, scope, onScope }: { dashboard: RankDashboard; scope: RankScope; onScope: (scope: RankScope) => void }) {
  const rows = dashboard.leaderboards[scope];
  const me = rows.find((row) => row.me) ?? null;
  return (
    <View style={styles.sectionStack}>
      <View style={styles.scopeTabs}>{SCOPES.map((item) => <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{ selected: scope === item.key }} onPress={() => onScope(item.key)} style={[styles.scopeTab, scope === item.key && styles.scopeTabActive]}><Text style={[styles.scopeText, scope === item.key && styles.scopeTextActive]}>{item.label}</Text></Pressable>)}</View>
      {me ? <View style={styles.meCard}><Text style={styles.meEyebrow}>TA POSITION</Text><Text style={styles.meRank}>{me.provisional ? 'PLACEMENT' : me.rank ? `#${me.rank}` : '—'}</Text><Text style={styles.meMeta}>{formatNumber(me.frags)} FRAGS · {me.grade.libelle?.toUpperCase() || `${me.settledCalls}/${me.grade.objectif_placements}`}</Text></View> : null}
      <View style={styles.board}>
        {rows.map((row) => <LeaderboardRow key={row.id} row={row} />)}
        {!rows.length ? <Text style={styles.emptyBoard}>{scope === 'cercle' ? 'Ajoute des amis pour créer ton classement de Cercle.' : scope === 'faction' ? 'Choisis une faction pour rejoindre ce classement.' : 'Aucun joueur classé pour le moment.'}</Text> : null}
      </View>
    </View>
  );
}

function LeaderboardRow({ row }: { row: RankLeaderboardRow }) {
  const accent = gradeAccent(row.grade);
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/u/[pseudo]', params: { pseudo: row.pseudo } })} style={({ pressed }) => [styles.boardRow, row.me && styles.boardRowMe, pressed && styles.pressed]}>
      <Text style={[styles.boardRank, row.me && styles.boardRankMe]}>{row.provisional ? '—' : row.rank ? `${row.rank}` : '—'}</Text>
      <View style={[styles.boardMark, { borderColor: accent }]}><Text style={[styles.boardGlyph, { color: accent }]}>◆</Text></View>
      <View style={styles.boardIdentity}><Text numberOfLines={1} style={styles.boardPseudo}>{row.pseudo}{row.me ? ' · TOI' : ''}</Text><Text style={styles.boardGrade}>{row.provisional ? `${row.settledCalls}/${row.grade.objectif_placements} PLACEMENTS` : row.grade.libelle?.toUpperCase() || 'CLASSÉ'}</Text></View>
      <View style={styles.boardScore}><Text style={styles.boardFrags}>{formatNumber(row.frags)}</Text><Text style={styles.boardUnit}>FRAGS</Text></View>
    </Pressable>
  );
}

function RewardsSection({ dashboard }: { dashboard: RankDashboard }) {
  return (
    <View style={styles.sectionStack}>
      <View style={styles.rewardHero}><View style={styles.rewardMark}><Text style={styles.rewardGlyph}>◇</Text></View><Text style={styles.rewardEyebrow}>FIN DE SAISON</Text><Text style={styles.rewardTitle}>{dashboard.reward.title.toUpperCase()}.</Text><Text style={styles.rewardCopy}>{dashboard.reward.detail}</Text><View style={styles.rewardStatus}><View style={styles.rewardDot} /><Text style={styles.rewardStatusText}>AUCUN OBJET ATTRIBUÉ POUR LE MOMENT</Text></View></View>
      <View style={styles.contractCard}><Text style={styles.cardEyebrow}>RÈGLE DE CONSERVATION</Text><Text style={styles.cardTitle}>Ta saison se ferme, ta trace reste.</Text><Text style={styles.cardCopy}>À la clôture, le rating actif repartira pour la nouvelle saison. Ton XP, ton niveau, tes objets, ton meilleur grade et ton meilleur rang restent dans ton profil.</Text></View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Text numberOfLines={1} style={styles.metricValue}>{value}</Text><Text numberOfLines={1} style={styles.metricLabel}>{label}</Text></View>; }
function ContractItem({ label, value }: { label: string; value: string }) { return <View style={styles.contractItem}><Text style={styles.contractValue}>{value}</Text><Text style={styles.contractLabel}>{label}</Text></View>; }
function EmptyState({ title, copy }: { title: string; copy: string }) { return <View style={styles.emptyState}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardCopy}>{copy}</Text></View>; }
function RankSkeleton() { return <View style={styles.skeleton}><View style={styles.skeletonLine} /><View style={styles.skeletonMetric} /><View style={styles.skeletonLine} /></View>; }
function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', paddingBottom: layout.tabBarContentInset, gap: 17 },
  intro: { marginHorizontal: spacing.md, gap: 7 }, eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1 }, title: { ...typography.displayLarge, color: colors.text }, subtitle: { ...typography.body, color: colors.textMuted },
  tabs: { marginHorizontal: spacing.md, padding: 4, flexDirection: 'row', borderRadius: 18, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, tab: { flex: 1, minHeight: 43, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 14 }, tabActive: { backgroundColor: colors.volt }, tabText: { ...typography.label, color: colors.textMuted }, tabTextActive: { color: '#080A0C' },
  error: { marginHorizontal: spacing.md, padding: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' }, errorText: { ...typography.body, flex: 1, color: '#FF9AA2' }, retry: { ...typography.action, color: colors.volt },
  sectionStack: { gap: 13, marginHorizontal: spacing.md }, seasonHero: { position: 'relative', minHeight: 355, padding: 18, overflow: 'hidden', borderRadius: 29, backgroundColor: '#0A0F13', borderWidth: 1 }, aura: { position: 'absolute', top: -170, right: -120, width: 390, height: 390, borderRadius: 195, opacity: .16 },
  seasonTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, seasonKicker: { ...typography.eyebrow, letterSpacing: .8 }, gradeName: { ...typography.displayMedium, marginTop: 4, color: colors.text }, gradeMark: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080C10', borderWidth: 1 }, gradeGlyph: { fontSize: 24 },
  ratingRow: { marginTop: 28, flexDirection: 'row', alignItems: 'flex-end', gap: 8 }, rating: { color: colors.text, fontFamily: fonts.display, fontSize: 68, lineHeight: 70, letterSpacing: -3 }, ratingUnit: { marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 5 }, ratingUnitText: { ...typography.eyebrow, color: colors.textMuted }, next: { ...typography.label, marginTop: 18, color: colors.textSubtle }, track: { height: 7, marginTop: 9, overflow: 'hidden', borderRadius: 4, backgroundColor: '#222A32' }, trackFill: { height: '100%', borderRadius: 4 }, heroMetrics: { minHeight: 68, marginTop: 'auto', paddingTop: 16, flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#273039' },
  metric: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' }, metricValue: { ...typography.metricSmall, color: colors.text, textAlign: 'center' }, metricLabel: { ...typography.eyebrow, marginTop: 3, color: colors.textMuted, textAlign: 'center' },
  contractCard: { padding: 16, gap: 8, borderRadius: 24, backgroundColor: '#10160E', borderWidth: 1, borderColor: '#3B471D' }, cardEyebrow: { ...typography.eyebrow, color: colors.volt }, cardTitle: { ...typography.cardTitle, color: colors.text }, cardCopy: { ...typography.body, color: colors.textMuted }, contractGrid: { marginTop: 7, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, contractItem: { width: '48.8%', minHeight: 73, padding: 11, justifyContent: 'center', borderRadius: 16, backgroundColor: '#080D0A', borderWidth: 1, borderColor: '#2D3820' }, contractValue: { ...typography.metricSmall, color: colors.text }, contractLabel: { ...typography.eyebrow, marginTop: 3, color: colors.textMuted },
  recordCard: { padding: 15, gap: 10, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, recordRow: { minHeight: 70, flexDirection: 'row' },
  scopeTabs: { padding: 4, flexDirection: 'row', borderRadius: 17, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, scopeTab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13 }, scopeTabActive: { backgroundColor: '#1B2412' }, scopeText: { ...typography.label, color: colors.textMuted }, scopeTextActive: { color: colors.volt },
  meCard: { minHeight: 115, padding: 16, borderRadius: 23, backgroundColor: colors.volt }, meEyebrow: { ...typography.eyebrow, color: '#3D4715' }, meRank: { color: '#080A0C', fontFamily: fonts.display, fontSize: 42, lineHeight: 44 }, meMeta: { ...typography.label, marginTop: 2, color: '#30380F' },
  board: { overflow: 'hidden', borderRadius: 23, borderWidth: 1, borderColor: colors.border }, boardRow: { minHeight: 74, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#0B1015', borderBottomWidth: 1, borderBottomColor: '#1C242C' }, boardRowMe: { backgroundColor: '#11170E' }, boardRank: { width: 26, color: colors.textMuted, fontFamily: fonts.display, fontSize: 21, textAlign: 'center' }, boardRankMe: { color: colors.volt }, boardMark: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }, boardGlyph: { fontSize: 15 }, boardIdentity: { flex: 1, minWidth: 0 }, boardPseudo: { ...typography.bodyStrong, color: colors.text }, boardGrade: { ...typography.eyebrow, marginTop: 3, color: colors.textMuted }, boardScore: { alignItems: 'flex-end' }, boardFrags: { ...typography.metricSmall, color: colors.text }, boardUnit: { ...typography.eyebrow, color: colors.textMuted }, emptyBoard: { ...typography.body, padding: 18, color: colors.textMuted, backgroundColor: '#0B1015' },
  rewardHero: { minHeight: 330, padding: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 29, backgroundColor: '#0A0F13', borderWidth: 1, borderColor: '#3C4720' }, rewardMark: { width: 82, height: 82, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: '#151C0E', borderWidth: 1, borderColor: '#4B5921' }, rewardGlyph: { color: colors.volt, fontSize: 38 }, rewardEyebrow: { ...typography.eyebrow, marginTop: 18, color: colors.volt }, rewardTitle: { ...typography.displayMedium, marginTop: 5, color: colors.text, textAlign: 'center' }, rewardCopy: { ...typography.body, maxWidth: 340, marginTop: 8, color: colors.textMuted, textAlign: 'center' }, rewardStatus: { minHeight: 34, marginTop: 15, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 17, backgroundColor: '#11161B' }, rewardDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.volt }, rewardStatusText: { ...typography.eyebrow, color: colors.textSubtle },
  emptyState: { marginHorizontal: spacing.md, padding: 20, gap: 8, borderRadius: 24, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, skeleton: { minHeight: 355, marginHorizontal: spacing.md, padding: 18, justifyContent: 'space-between', borderRadius: 29, backgroundColor: '#0D1218', borderWidth: 1, borderColor: colors.border }, skeletonLine: { width: '58%', height: 12, borderRadius: 6, backgroundColor: '#1A222A' }, skeletonMetric: { width: '72%', height: 78, borderRadius: 18, backgroundColor: '#161E26' }, pressed: { opacity: .72 },
});
