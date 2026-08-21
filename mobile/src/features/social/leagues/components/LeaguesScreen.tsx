import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { createLeague, joinLeague, loadLeagues } from '../api';
import type { LeagueSummary } from '../types';
import { colors, layout, radius, spacing } from '@/src/theme';

export default function LeaguesScreen() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      setLeagues(await loadLeagues());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de charger les ligues.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function onCreate() {
    if (name.trim().length < 2 || busy) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      await createLeague(name);
      setName(''); setMessage('Ligue créée. Ton cercle privé est prêt.');
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Création impossible.'); }
    finally { setBusy(false); }
  }

  async function onJoin() {
    if (code.trim().length < 3 || busy) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      await joinLeague(code);
      setCode(''); setMessage('Tu as rejoint la ligue.');
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Code de ligue invalide.'); }
    finally { setBusy(false); }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
    >
      <View style={styles.privateHero}>
        <Text style={styles.privateEyebrow}>CERCLE // LIGUE PRIVÉE</Text>
        <Text style={styles.privateTitle}>VOTRE CLASSEMENT. VOS RÈGLES.</Text>
        <Text style={styles.privateCopy}>Une ligue n’est visible que par les amis qui possèdent son code. Aucun classement public ne vient parasiter votre cercle.</Text>
        <View style={styles.privateBadge}><Text style={styles.privateBadgeText}>◎ ENTRE AMIS UNIQUEMENT</Text></View>
      </View>

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
      {message ? <View style={styles.success}><Text style={styles.successText}>{message}</Text></View> : null}

      <View style={styles.sectionHeader}><Text style={styles.sectionEyebrow}>TES LIGUES PRIVÉES</Text><Text style={styles.sectionMeta}>{leagues.length}</Text></View>
      <View style={styles.list}>
        {loading ? <Skeleton /> : leagues.length ? leagues.map((league, index) => <LeagueCard key={league.id} league={league} index={index} />) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>CRÉE LE PREMIER CLASSEMENT DE TON GROUPE.</Text>
            <Text style={styles.emptyText}>Lance une ligue ou utilise le code envoyé par un ami.</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsGrid}>
        <View style={styles.actionCard}>
          <Text style={styles.actionEyebrow}>CRÉER ENTRE AMIS</Text>
          <Text style={styles.actionTitle}>Nomme votre ligue.</Text>
          <TextInput accessibilityLabel="Nom de la ligue privée" value={name} onChangeText={setName} placeholder="Nom de la ligue" placeholderTextColor="#596570" style={styles.input} maxLength={32} />
          <Pressable accessibilityRole="button" disabled={name.trim().length < 2 || busy} onPress={() => void onCreate()} style={({ pressed }) => [styles.primaryButton, (pressed || busy || name.trim().length < 2) && styles.pressed]}>
            <Text style={styles.primaryButtonText}>CRÉER LA LIGUE</Text>
          </Pressable>
        </View>
        <View style={styles.actionCard}>
          <Text style={styles.actionEyebrow}>CODE D’UN AMI</Text>
          <Text style={styles.actionTitle}>Rejoins leur classement.</Text>
          <TextInput accessibilityLabel="Code de la ligue privée" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="CODE" placeholderTextColor="#596570" style={[styles.input, styles.codeInput]} maxLength={8} />
          <Pressable accessibilityRole="button" disabled={code.trim().length < 3 || busy} onPress={() => void onJoin()} style={({ pressed }) => [styles.secondaryButton, (pressed || busy || code.trim().length < 3) && styles.pressed]}>
            <Text style={styles.secondaryButtonText}>REJOINDRE</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function LeagueCard({ league, index }: { league: LeagueSummary; index: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardMark}><Text style={styles.cardMarkText}>{String(index + 1).padStart(2, '0')}</Text></View>
      <View style={styles.cardCopy}>
        <Text numberOfLines={1} style={styles.cardName}>{league.nom}</Text>
        <Text style={styles.cardMeta}>{league.nb_membres} membre{league.nb_membres > 1 ? 's' : ''} · code {league.code}</Text>
      </View>
      <Text style={styles.cardArrow}>→</Text>
    </View>
  );
}

function Skeleton() { return <View style={styles.skeleton}>{[0, 1, 2].map((item) => <View key={item} style={styles.skeletonRow} />)}</View>; }
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.md, paddingBottom: layout.tabBarContentInset, gap: 16 },
  privateHero: { position: 'relative', overflow: 'hidden', minHeight: 235, padding: 20, borderRadius: 29, justifyContent: 'center', backgroundColor: '#0E1510', borderWidth: 1, borderColor: '#3D491D' },
  privateEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  privateTitle: { maxWidth: 330, marginTop: 10, color: colors.text, fontSize: 31, lineHeight: 31, fontWeight: '900', letterSpacing: -1.5 },
  privateCopy: { maxWidth: 340, marginTop: 11, color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  privateBadge: { alignSelf: 'flex-start', minHeight: 30, marginTop: 16, paddingHorizontal: 10, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171F10', borderWidth: 1, borderColor: '#46531F' },
  privateBadgeText: { color: colors.volt, fontSize: 6, fontWeight: '900', letterSpacing: .65 },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' },
  errorText: { color: '#FF9AA2', fontSize: 11 },
  success: { padding: 12, borderRadius: radius.md, backgroundColor: '#0D1A13', borderWidth: 1, borderColor: '#214C32' },
  successText: { color: colors.success, fontSize: 11 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionEyebrow: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  sectionMeta: { color: colors.textMuted, fontSize: 10, fontWeight: '900' },
  list: { gap: 9 },
  card: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: radius.lg, backgroundColor: '#0C1117', borderWidth: 1, borderColor: '#1D2730' },
  cardMark: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#3D491D' },
  cardMarkText: { color: colors.volt, fontSize: 11, fontWeight: '900' },
  cardCopy: { flex: 1, minWidth: 0 },
  cardName: { color: colors.text, fontSize: 15, fontWeight: '900' },
  cardMeta: { marginTop: 4, color: colors.textMuted, fontSize: 9 },
  cardArrow: { color: colors.volt, fontSize: 18 },
  empty: { padding: 25, borderRadius: radius.lg, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.text, fontSize: 22, lineHeight: 22, fontWeight: '900', letterSpacing: -1.2 },
  emptyText: { marginTop: 9, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  actionsGrid: { gap: 10 },
  actionCard: { padding: 15, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 10 },
  actionEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  actionTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  input: { minHeight: 46, paddingHorizontal: 13, borderRadius: radius.md, backgroundColor: '#080C10', borderWidth: 1, borderColor: '#202A34', color: colors.text, fontSize: 13, fontWeight: '700' },
  codeInput: { letterSpacing: 2, fontWeight: '900' },
  primaryButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.volt },
  primaryButtonText: { color: '#080A0C', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  secondaryButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: '#3B461D', backgroundColor: '#151B0E' },
  secondaryButtonText: { color: colors.volt, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  pressed: { opacity: 0.72 },
  skeleton: { gap: 9, marginTop: 16 },
  skeletonRow: { height: 62, borderRadius: 14, backgroundColor: '#10161D' },
});
