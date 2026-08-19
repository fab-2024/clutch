import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { loadDuels, type DuelRow } from '@/src/services/social';
import { colors, radius, spacing } from '@/src/theme/tokens';

export default function DuelsScreen() {
  const [duels, setDuels] = useState<DuelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { setDuels(await loadDuels()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Impossible de charger tes duels.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = duels.filter((duel) => duel.statut === 'en_attente' || duel.statut === 'accepte');
  const finished = duels.filter((duel) => duel.statut === 'termine');

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}>
      <View style={styles.intro}><View><Text style={styles.eyebrow}>CLUTCH // DUELS</Text><Text style={styles.title}>Un call. Deux joueurs.</Text><Text style={styles.subtitle}>Le duel n’ajoute aucune mise : il transforme simplement deux pronostics réels en rivalité.</Text></View><View style={styles.swords}><Text style={styles.swordsText}>⚔</Text></View></View>
      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

      <View style={styles.stats}><View><Text style={styles.statValue}>{loading ? '—' : active.length}</Text><Text style={styles.statLabel}>ACTIFS</Text></View><View style={styles.divider} /><View><Text style={styles.statValue}>{loading ? '—' : finished.length}</Text><Text style={styles.statLabel}>TERMINÉS</Text></View></View>

      <Pressable onPress={() => router.push('/(tabs)/matches')} style={({ pressed }) => [styles.heroCta, pressed && styles.pressed]}><View><Text style={styles.heroCtaEyebrow}>NOUVEAU DUEL</Text><Text style={styles.heroCtaTitle}>Choisis d’abord ton match.</Text><Text style={styles.heroCtaText}>Pose ton call, puis défie un rival sur le camp opposé.</Text></View><View style={styles.arrow}><Text style={styles.arrowText}>→</Text></View></Pressable>

      <View style={styles.section}><View style={styles.sectionHeading}><Text style={styles.sectionLabel}>TES RIVALITÉS</Text><Text style={styles.sectionMeta}>{duels.length}</Text></View>{loading ? <View style={styles.skeleton} /> : duels.length ? duels.map((duel) => <DuelCard key={duel.token} duel={duel} />) : <View style={styles.empty}><Text style={styles.emptyIcon}>⚔</Text><Text style={styles.emptyTitle}>Aucun duel pour l’instant.</Text><Text style={styles.emptyText}>Ton premier duel se crée depuis un match sur lequel tu as pris position.</Text></View>}</View>
    </ScrollView>
  );
}

function DuelCard({ duel }: { duel: DuelRow }) {
  const creator = duel.moi_role === 'createur';
  const rival = creator ? (duel.accepteur_pseudo || 'En attente') : (duel.createur_pseudo || 'Rival');
  const myChoice = creator ? duel.createur_choix : duel.accepteur_choix;
  const myTag = myChoice === 'a' ? (duel.tag_a || duel.equipe_a || 'A') : myChoice === 'b' ? (duel.tag_b || duel.equipe_b || 'B') : '—';
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}><View><Text style={styles.cardEyebrow}>{gameLabel(duel.jeu)} · {duel.evenement || 'MATCH'}</Text><Text style={styles.cardTitle}>{myTag} <Text style={styles.vs}>VS</Text> {rival}</Text></View><Status status={duel.statut} /></View>
      <View style={styles.cardBottom}><Text style={styles.cardDate}>{formatDate(duel.debut)}</Text>{duel.tag_a && duel.tag_b ? <Text style={styles.matchTags}>{duel.tag_a} · {duel.tag_b}</Text> : null}</View>
    </View>
  );
}

function Status({ status }: { status: string }) {
  const label = status === 'termine' ? 'TERMINÉ' : status === 'accepte' ? 'VERROUILLÉ' : status === 'annule' ? 'ANNULÉ' : 'EN ATTENTE';
  const active = status === 'en_attente' || status === 'accepte';
  return <View style={[styles.status, active && styles.statusActive]}><Text style={[styles.statusText, active && styles.statusTextActive]}>{label}</Text></View>;
}

function gameLabel(value?: string) { const game = String(value || '').toLowerCase(); if (game.includes('lol')) return 'LOL'; if (game.includes('valorant')) return 'VAL'; if (game.includes('cs')) return 'CS2'; return 'ESPORT'; }
function formatDate(value?: string) { if (!value) return 'Date à venir'; const date = new Date(value); if (!Number.isFinite(date.getTime())) return 'Date à venir'; return date.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, content: { width: '100%', maxWidth: 430, alignSelf: 'center', padding: spacing.md, paddingBottom: 120, gap: spacing.lg },
  intro: { paddingTop: 6, flexDirection: 'row', alignItems: 'center', gap: 14 }, eyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 }, title: { marginTop: 5, color: colors.text, fontSize: 29, lineHeight: 32, fontWeight: '900', letterSpacing: -1 }, subtitle: { marginTop: 7, color: colors.textMuted, fontSize: 12, lineHeight: 18 }, swords: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#11170E', borderWidth: 1, borderColor: '#3B471C' }, swordsText: { fontSize: 25 },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' }, errorText: { color: '#FF9AA2', fontSize: 11 },
  stats: { minHeight: 78, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, statValue: { color: colors.text, fontSize: 23, fontWeight: '900' }, statLabel: { marginTop: 2, color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 1 }, divider: { width: 1, height: 36, backgroundColor: colors.border, marginHorizontal: 28 },
  heroCta: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 17, borderRadius: 24, backgroundColor: '#151B0E', borderWidth: 1, borderColor: '#45521E' }, heroCtaEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 }, heroCtaTitle: { marginTop: 4, color: colors.text, fontSize: 16, fontWeight: '900' }, heroCtaText: { marginTop: 4, maxWidth: 270, color: colors.textMuted, fontSize: 10, lineHeight: 15 }, arrow: { marginLeft: 'auto', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.volt }, arrowText: { color: '#080A0C', fontSize: 16, fontWeight: '900' },
  section: { gap: 9 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between' }, sectionLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, sectionMeta: { color: colors.textMuted, fontSize: 9, fontWeight: '900' },
  card: { padding: 14, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 12 }, cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }, cardEyebrow: { color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 }, cardTitle: { marginTop: 4, color: colors.text, fontSize: 14, fontWeight: '900' }, vs: { color: colors.volt }, status: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: '#11161C' }, statusActive: { backgroundColor: '#1B2310' }, statusText: { color: colors.textMuted, fontSize: 6, fontWeight: '900' }, statusTextActive: { color: colors.volt }, cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cardDate: { color: colors.textMuted, fontSize: 8 }, matchTags: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  empty: { alignItems: 'center', padding: 26, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 8 }, emptyIcon: { fontSize: 24 }, emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900' }, emptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center' }, skeleton: { height: 170, borderRadius: radius.lg, backgroundColor: '#10161D' }, pressed: { opacity: 0.75 },
});
