import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  answerFriendRequest,
  loadFriends,
  requestFriend,
  searchPlayers,
  type FriendRow,
  type FriendsData,
  type PlayerSearchRow,
} from '@/src/services/social';
import { colors, radius, spacing } from '@/src/theme/tokens';

const EMPTY: FriendsData = { amis: [], recues: [], envoyees: [] };

export default function FriendsScreen() {
  const [data, setData] = useState<FriendsData>(EMPTY);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PlayerSearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { setData(await loadFriends()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Impossible de charger tes amis.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const value = search.trim();
    if (value.length < 2) { setResults([]); return; }
    const timer = setTimeout(() => { void searchPlayers(value).then(setResults).catch(() => setResults([])); }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  async function act(id: string, kind: 'add' | 'accept') {
    setBusy(id); setError(null);
    try {
      if (kind === 'add') await requestFriend(id);
      else await answerFriendRequest(id, true);
      await load();
      if (search.trim().length >= 2) setResults(await searchPlayers(search));
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Action impossible.'); }
    finally { setBusy(null); }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}>
      <View style={styles.intro}><View><Text style={styles.eyebrow}>TON CERCLE</Text><Text style={styles.title}>Les gens derrière les pseudos.</Text></View><View style={styles.count}><Text style={styles.countValue}>{loading ? '—' : data.amis.length}</Text><Text style={styles.countLabel}>AMIS</Text></View></View>
      <Text style={styles.subtitle}>Comparez vos ratings, créez des ligues et transformez vos calls en rivalités.</Text>
      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

      {data.recues.length ? <View style={styles.section}><Text style={styles.sectionLabel}>DEMANDES REÇUES</Text>{data.recues.map((friend) => <RequestCard key={friend.id} friend={friend} disabled={busy === friend.id} onAccept={() => void act(friend.id, 'accept')} />)}</View> : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>TROUVER UN JOUEUR</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="Chercher un pseudo…" placeholderTextColor="#596570" style={styles.searchInput} />
        {results.map((player) => <SearchRow key={player.id} player={player} disabled={busy === player.id} onAction={() => void act(player.id, player.relation === 'demande_recue' ? 'accept' : 'add')} />)}
      </View>

      <View style={styles.section}><View style={styles.sectionHeading}><Text style={styles.sectionLabel}>MES AMIS</Text><Text style={styles.sectionMeta}>{data.amis.length}</Text></View>{loading ? <View style={styles.skeleton} /> : data.amis.length ? data.amis.map((friend) => <FriendCard key={friend.id} friend={friend} />) : <View style={styles.empty}><Text style={styles.emptyIcon}>●</Text><Text style={styles.emptyTitle}>Ton cercle est vide.</Text><Text style={styles.emptyText}>Cherche un pseudo ci-dessus ou rejoins une ligue avec tes potes.</Text></View>}</View>
    </ScrollView>
  );
}

function FriendCard({ friend }: { friend: FriendRow }) {
  const bets = Number(friend.paris ?? 0); const wins = Number(friend.gagnes ?? 0); const precision = bets ? Math.round((wins / bets) * 100) : null;
  return <View style={styles.friendCard}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(friend.pseudo)}</Text></View><View style={styles.friendCopy}><View style={styles.friendNameRow}><Text style={styles.friendName}>{friend.pseudo}</Text>{friend.tag_favori ? <View style={styles.tag}><Text style={styles.tagText}>{friend.tag_favori}</Text></View> : null}</View><Text style={styles.friendMeta}>{format(friend.solde ?? 1000)} Frags · {bets} pronostic{bets > 1 ? 's' : ''}</Text></View><Text style={styles.precision}>{precision == null ? '—' : `${precision}%`}</Text></View>;
}

function RequestCard({ friend, disabled, onAccept }: { friend: FriendRow; disabled: boolean; onAccept: () => void }) {
  return <View style={styles.requestCard}><View style={styles.avatar}><Text style={styles.avatarText}>{initials(friend.pseudo)}</Text></View><View style={styles.friendCopy}><Text style={styles.friendName}>{friend.pseudo}</Text><Text style={styles.friendMeta}>veut rejoindre ton cercle</Text></View><Pressable disabled={disabled} onPress={onAccept} style={styles.accept}><Text style={styles.acceptText}>ACCEPTER</Text></Pressable></View>;
}

function SearchRow({ player, disabled, onAction }: { player: PlayerSearchRow; disabled: boolean; onAction: () => void }) {
  const actionable = player.relation === 'aucune' || player.relation === 'demande_recue';
  return <View style={styles.searchRow}><View style={styles.avatarSmall}><Text style={styles.avatarSmallText}>{initials(player.pseudo)}</Text></View><Text style={styles.searchName}>{player.pseudo}</Text>{actionable ? <Pressable disabled={disabled} onPress={onAction} style={styles.searchAction}><Text style={styles.searchActionText}>{player.relation === 'demande_recue' ? 'ACCEPTER' : 'AJOUTER'}</Text></Pressable> : <Text style={styles.relation}>{player.relation === 'ami' ? 'AMI' : 'EN ATTENTE'}</Text>}</View>;
}

function initials(value: string) { const p = value.trim().split(/[\s._-]+/).filter(Boolean); return p.length > 1 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : (p[0] || '?').slice(0, 2).toUpperCase(); }
function format(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, content: { width: '100%', maxWidth: 430, alignSelf: 'center', padding: spacing.md, paddingBottom: 120, gap: spacing.lg },
  intro: { paddingTop: 6, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }, eyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 }, title: { marginTop: 5, flex: 1, color: colors.text, fontSize: 29, lineHeight: 32, fontWeight: '900', letterSpacing: -1 }, subtitle: { marginTop: -12, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  count: { minWidth: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#11170E', borderWidth: 1, borderColor: '#36421A' }, countValue: { color: colors.volt, fontSize: 21, fontWeight: '900' }, countLabel: { color: colors.textMuted, fontSize: 7, fontWeight: '900' },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' }, errorText: { color: '#FF9AA2', fontSize: 11 }, section: { gap: 9 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between' }, sectionLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, sectionMeta: { color: colors.textMuted, fontSize: 9, fontWeight: '900' },
  searchInput: { minHeight: 48, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 13, fontWeight: '700' },
  searchRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, avatarSmall: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated }, avatarSmallText: { color: colors.text, fontSize: 7, fontWeight: '900' }, searchName: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '900' }, searchAction: { minHeight: 30, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.volt }, searchActionText: { color: '#080A0C', fontSize: 7, fontWeight: '900' }, relation: { color: colors.textMuted, fontSize: 7, fontWeight: '900' },
  friendCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, requestCard: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: radius.lg, backgroundColor: '#0D141A', borderWidth: 1, borderColor: '#283440' }, avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceElevated }, avatarText: { color: colors.text, fontSize: 9, fontWeight: '900' }, friendCopy: { flex: 1, minWidth: 0 }, friendNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, friendName: { color: colors.text, fontSize: 12, fontWeight: '900' }, friendMeta: { marginTop: 3, color: colors.textMuted, fontSize: 9 }, tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: '#171E0E' }, tagText: { color: colors.volt, fontSize: 6, fontWeight: '900' }, precision: { color: colors.text, fontSize: 13, fontWeight: '900' }, accept: { minHeight: 34, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.volt }, acceptText: { color: '#080A0C', fontSize: 7, fontWeight: '900' },
  empty: { alignItems: 'center', padding: 25, borderRadius: radius.lg, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 8 }, emptyIcon: { color: colors.volt, fontSize: 22 }, emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900' }, emptyText: { color: colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 16 }, skeleton: { height: 140, borderRadius: radius.lg, backgroundColor: '#10161D' },
});
