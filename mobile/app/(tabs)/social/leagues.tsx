import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  createLeague,
  joinLeague,
  loadGlobalRanking,
  loadLeagues,
  type GlobalRankRow,
  type LeagueSummary,
} from '@/src/services/social';
import { colors, radius, spacing } from '@/src/theme/tokens';

type ViewMode = 'mine' | 'global';

export default function LeaguesScreen() {
  const [mode, setMode] = useState<ViewMode>('global');
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [ranking, setRanking] = useState<GlobalRankRow[]>([]);
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
      const [leagueData, rankData] = await Promise.all([loadLeagues(), loadGlobalRanking()]);
      setLeagues(leagueData);
      setRanking(rankData);
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
      setName(''); setMessage('Ligue créée. Ton QG est prêt.');
      setMode('mine');
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
      setMode('mine');
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
      <View style={styles.modeCard}>
        <Pressable onPress={() => setMode('mine')} style={[styles.modeButton, mode === 'mine' && styles.modeButtonActive]}>
          <Text style={[styles.modeText, mode === 'mine' && styles.modeTextActive]}>Mes ligues</Text>
        </Pressable>
        <Pressable onPress={() => setMode('global')} style={[styles.modeButton, mode === 'global' && styles.modeButtonActive]}>
          <Text style={[styles.modeText, mode === 'global' && styles.modeTextActive]}>Global</Text>
        </Pressable>
      </View>

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}
      {message ? <View style={styles.success}><Text style={styles.successText}>{message}</Text></View> : null}

      {mode === 'global' ? (
        <GlobalRanking rows={ranking} loading={loading} />
      ) : (
        <>
          <View style={styles.sectionHeader}><Text style={styles.sectionEyebrow}>MES LIGUES</Text><Text style={styles.sectionMeta}>{leagues.length}</Text></View>
          <View style={styles.list}>
            {loading ? <Skeleton /> : leagues.length ? leagues.map((league, index) => <LeagueCard key={league.id} league={league} index={index} />) : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>TON PREMIER QG COMMENCE ICI.</Text>
                <Text style={styles.emptyText}>Crée une ligue ou entre le code d’un pote. Les Frags restent uniquement ton rating.</Text>
              </View>
            )}
          </View>

          <View style={styles.actionsGrid}>
            <View style={styles.actionCard}>
              <Text style={styles.actionEyebrow}>CRÉER</Text>
              <Text style={styles.actionTitle}>Lance ton QG.</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Nom de la ligue" placeholderTextColor="#596570" style={styles.input} maxLength={32} />
              <Pressable onPress={() => void onCreate()} style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed]}>
                <Text style={styles.primaryButtonText}>CRÉER LA LIGUE</Text>
              </Pressable>
            </View>
            <View style={styles.actionCard}>
              <Text style={styles.actionEyebrow}>REJOINDRE</Text>
              <Text style={styles.actionTitle}>Entre dans l’arène.</Text>
              <TextInput value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="CODE" placeholderTextColor="#596570" style={[styles.input, styles.codeInput]} maxLength={8} />
              <Pressable onPress={() => void onJoin()} style={({ pressed }) => [styles.secondaryButton, (pressed || busy) && styles.pressed]}>
                <Text style={styles.secondaryButtonText}>REJOINDRE</Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function GlobalRanking({ rows, loading }: { rows: GlobalRankRow[]; loading: boolean }) {
  return (
    <View style={styles.globalCard}>
      <Text style={styles.globalEyebrow}>CLASSEMENT SAISONNIER</Text>
      <Text style={styles.globalTitle}>LE MONDE ENTIER{`\n`}JOUE LE MÊME RATING.</Text>
      <Text style={styles.globalCopy}>Les Frags sont ton rating compétitif saisonnier : ils ne se dépensent jamais.</Text>

      {loading ? <Skeleton /> : rows.length ? (
        <View style={styles.rankList}>
          {rows.slice(0, 10).map((row) => (
            <View key={row.id} style={[styles.rankRow, row.moi && styles.rankRowMine]}>
              <Text style={[styles.rankNumber, row.rang <= 3 && styles.rankNumberTop]}>#{row.rang}</Text>
              <View style={styles.rankAvatar}><Text style={styles.rankAvatarText}>{initials(row.pseudo)}</Text></View>
              <View style={styles.rankCopy}>
                <Text numberOfLines={1} style={styles.rankPseudo}>{row.pseudo}{row.moi ? ' · TOI' : ''}</Text>
                <Text style={styles.rankMeta}>{row.pronostics_regles} pronostics · {row.provisoire ? 'placement' : 'classé'}</Text>
              </View>
              <Text style={styles.rankFrags}>{formatNumber(row.frags)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyInline}><Text style={styles.emptyInlineText}>Le classement global apparaîtra dès que la saison contient des joueurs classés.</Text></View>
      )}
    </View>
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
function formatNumber(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }
function initials(value: string) { const p = String(value || '?').trim().split(/[\s._-]+/).filter(Boolean); return !p.length ? '?' : p.length === 1 ? p[0].slice(0, 2).toUpperCase() : `${p[0][0]}${p[1][0]}`.toUpperCase(); }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', padding: spacing.md, paddingBottom: 125, gap: 16 },
  modeCard: { minHeight: 58, flexDirection: 'row', padding: 5, borderRadius: 16, backgroundColor: '#090D11', borderWidth: 1, borderColor: '#232A32' },
  modeButton: { flex: 1, minHeight: 48, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: colors.volt },
  modeText: { color: '#7B8693', fontSize: 12, fontWeight: '900' },
  modeTextActive: { color: '#080A0C' },
  globalCard: { padding: 19, borderRadius: 28, backgroundColor: '#0B1015', borderWidth: 1, borderColor: '#2A333D' },
  globalEyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.9 },
  globalTitle: { marginTop: 12, color: colors.text, fontSize: 29, lineHeight: 29, fontWeight: '900', letterSpacing: -1.8 },
  globalCopy: { marginTop: 12, color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  rankList: { marginTop: 18, overflow: 'hidden', borderRadius: 17, borderWidth: 1, borderColor: colors.border },
  rankRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11, backgroundColor: '#0A0F14', borderBottomWidth: 1, borderBottomColor: '#19212A' },
  rankRowMine: { backgroundColor: '#151C11' },
  rankNumber: { width: 32, color: colors.textMuted, fontSize: 10, fontWeight: '900' },
  rankNumberTop: { color: colors.volt },
  rankAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#161D25' },
  rankAvatarText: { color: colors.text, fontSize: 8, fontWeight: '900' },
  rankCopy: { flex: 1, minWidth: 0 },
  rankPseudo: { color: colors.text, fontSize: 12, fontWeight: '900' },
  rankMeta: { marginTop: 3, color: colors.textMuted, fontSize: 8 },
  rankFrags: { color: colors.volt, fontSize: 12, fontWeight: '900' },
  emptyInline: { marginTop: 18, padding: 14, borderRadius: radius.md, backgroundColor: '#0A0F14' },
  emptyInlineText: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
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
