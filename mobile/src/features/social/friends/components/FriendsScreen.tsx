import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  answerFriendRequest,
  loadFriends,
  requestFriend,
  searchPlayers,
} from '../api';
import type { FriendRow, FriendsData, PlayerSearchRow } from '../types';
import { colors, radius, spacing } from '@/src/theme';

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

  const topFriend = data.amis[0] ?? null;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />}
    >
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>SOCIAL // TON CERCLE</Text>
        <Text style={styles.title}>LES GENS DERRIÈRE LES PSEUDOS.</Text>
        <Text style={styles.subtitle}>Compare vos ratings, crée des rivalités et transforme un simple call en histoire à deux.</Text>
      </View>

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

      <View style={styles.hero}>
        <Text style={styles.heroCount}>{loading ? '—' : data.amis.length}</Text>
        <Text style={styles.heroLabel}>JOUEURS DANS TON CERCLE</Text>
        <View style={styles.heroLine} />
        <Text style={styles.heroCopy}>{topFriend ? `${topFriend.pseudo} est actuellement ton premier point de comparaison.` : 'Ton premier rival peut commencer par une simple recherche.'}</Text>
      </View>

      {data.recues.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>ÇA FRAPPE À LA PORTE</Text><Text style={styles.sectionMeta}>{data.recues.length}</Text></View>
          {data.recues.map((friend) => <RequestCard key={friend.id} friend={friend} disabled={busy === friend.id} onAccept={() => void act(friend.id, 'accept')} />)}
        </View>
      ) : null}

      <View style={styles.searchShell}>
        <Text style={styles.searchEyebrow}>TROUVER UN JOUEUR</Text>
        <Text style={styles.searchTitle}>Ajoute quelqu’un à ton cercle.</Text>
        <TextInput value={search} onChangeText={setSearch} placeholder="Chercher un pseudo…" placeholderTextColor="#596570" style={styles.searchInput} />
        {results.map((player) => <SearchRow key={player.id} player={player} disabled={busy === player.id} onAction={() => void act(player.id, player.relation === 'demande_recue' ? 'accept' : 'add')} />)}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>TON CERCLE</Text><Text style={styles.sectionMeta}>{data.amis.length}</Text></View>
        {loading ? <View style={styles.skeleton} /> : data.amis.length ? data.amis.map((friend, index) => <FriendCard key={friend.id} friend={friend} rank={index + 1} />) : <EmptyFriends />}
      </View>

      {data.envoyees.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EN ATTENTE</Text>
          <View style={styles.pendingCard}>{data.envoyees.slice(0, 5).map((friend) => <View key={friend.id} style={styles.pendingRow}><Text style={styles.pendingName}>{friend.pseudo}</Text><Text style={styles.pendingState}>DEMANDE ENVOYÉE</Text></View>)}</View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function FriendCard({ friend, rank }: { friend: FriendRow; rank: number }) {
  const bets = Number(friend.paris ?? 0);
  const wins = Number(friend.gagnes ?? 0);
  const precision = bets ? Math.round((wins / bets) * 100) : null;
  return (
    <View style={styles.friendCard}>
      <Text style={styles.friendRank}>0{rank}</Text>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials(friend.pseudo)}</Text></View>
      <View style={styles.friendCopy}>
        <View style={styles.friendNameRow}><Text numberOfLines={1} style={styles.friendName}>{friend.pseudo}</Text>{friend.tag_favori ? <View style={styles.tag}><Text style={styles.tagText}>{friend.tag_favori}</Text></View> : null}</View>
        <Text style={styles.friendMeta}>{format(friend.solde ?? 1000)} Frags · {bets} pronostic{bets > 1 ? 's' : ''}</Text>
      </View>
      <View style={styles.precisionBlock}><Text style={styles.precision}>{precision == null ? '—' : `${precision}%`}</Text><Text style={styles.precisionLabel}>RÉUSSITE</Text></View>
    </View>
  );
}

function RequestCard({ friend, disabled, onAccept }: { friend: FriendRow; disabled: boolean; onAccept: () => void }) {
  return (
    <View style={styles.requestCard}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{initials(friend.pseudo)}</Text></View>
      <View style={styles.friendCopy}><Text style={styles.friendName}>{friend.pseudo}</Text><Text style={styles.friendMeta}>veut rejoindre ton cercle</Text></View>
      <Pressable disabled={disabled} onPress={onAccept} style={styles.accept}><Text style={styles.acceptText}>ACCEPTER</Text></Pressable>
    </View>
  );
}

function SearchRow({ player, disabled, onAction }: { player: PlayerSearchRow; disabled: boolean; onAction: () => void }) {
  const actionable = player.relation === 'aucune' || player.relation === 'demande_recue';
  return (
    <View style={styles.searchRow}>
      <View style={styles.avatarSmall}><Text style={styles.avatarSmallText}>{initials(player.pseudo)}</Text></View>
      <Text style={styles.searchName}>{player.pseudo}</Text>
      {actionable ? <Pressable disabled={disabled} onPress={onAction} style={styles.searchAction}><Text style={styles.searchActionText}>{player.relation === 'demande_recue' ? 'ACCEPTER' : 'AJOUTER'}</Text></Pressable> : <Text style={styles.relation}>{player.relation === 'ami' ? 'AMI' : 'EN ATTENTE'}</Text>}
    </View>
  );
}

function EmptyFriends() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEyebrow}>CERCLE VIDE</Text>
      <Text style={styles.emptyTitle}>TA PREMIÈRE RIVALITÉ COMMENCE PAR UN PSEUDO.</Text>
      <Text style={styles.emptyText}>Cherche quelqu’un au-dessus ou rejoins une ligue avec tes potes.</Text>
    </View>
  );
}

function initials(value: string) { const p = value.trim().split(/[\s._-]+/).filter(Boolean); return p.length > 1 ? `${p[0][0]}${p[1][0]}`.toUpperCase() : (p[0] || '?').slice(0, 2).toUpperCase(); }
function format(value: number) { return new Intl.NumberFormat('fr-FR').format(Number(value || 0)); }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 430, alignSelf: 'center', padding: spacing.md, paddingBottom: 128, gap: 22 },
  intro: { gap: 8, paddingTop: 4 }, eyebrow: { color: colors.volt, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 }, title: { maxWidth: 365, color: colors.text, fontSize: 35, lineHeight: 35, fontWeight: '900', letterSpacing: -1.6 }, subtitle: { maxWidth: 365, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' }, errorText: { color: '#FF9AA2', fontSize: 11 },
  hero: { minHeight: 165, padding: 20, borderRadius: 29, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#252E36' }, heroCount: { color: colors.text, fontSize: 58, lineHeight: 60, fontWeight: '900', letterSpacing: -3 }, heroLabel: { marginTop: 4, color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, heroLine: { width: 42, height: 3, marginVertical: 13, backgroundColor: colors.volt }, heroCopy: { maxWidth: 310, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  section: { gap: 9 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between' }, sectionLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, sectionMeta: { color: colors.textMuted, fontSize: 9, fontWeight: '900' },
  searchShell: { padding: 17, borderRadius: 25, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 9 }, searchEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 }, searchTitle: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: -0.4 }, searchInput: { minHeight: 50, paddingHorizontal: 14, borderRadius: 15, backgroundColor: '#070B0F', borderWidth: 1, borderColor: '#263039', color: colors.text, fontSize: 13, fontWeight: '700' },
  searchRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, borderRadius: 14, backgroundColor: '#0D1319', borderWidth: 1, borderColor: '#1D2730' }, avatarSmall: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E' }, avatarSmallText: { color: colors.volt, fontSize: 7, fontWeight: '900' }, searchName: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '900' }, searchAction: { minHeight: 31, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.volt }, searchActionText: { color: '#080A0C', fontSize: 7, fontWeight: '900' }, relation: { color: colors.textMuted, fontSize: 7, fontWeight: '900' },
  friendCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, friendRank: { width: 22, color: '#596570', fontSize: 9, fontWeight: '900' }, avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#3A461D' }, avatarText: { color: colors.volt, fontSize: 9, fontWeight: '900' }, friendCopy: { flex: 1, minWidth: 0 }, friendNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, friendName: { flexShrink: 1, color: colors.text, fontSize: 13, fontWeight: '900' }, friendMeta: { marginTop: 4, color: colors.textMuted, fontSize: 9 }, tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: '#171E0E' }, tagText: { color: colors.volt, fontSize: 6, fontWeight: '900' }, precisionBlock: { alignItems: 'flex-end' }, precision: { color: colors.text, fontSize: 15, fontWeight: '900' }, precisionLabel: { marginTop: 2, color: colors.textMuted, fontSize: 6, fontWeight: '900' },
  requestCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 22, backgroundColor: '#0D141A', borderWidth: 1, borderColor: '#2A3742' }, accept: { minHeight: 36, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.volt }, acceptText: { color: '#080A0C', fontSize: 7, fontWeight: '900' },
  pendingCard: { overflow: 'hidden', borderRadius: 20, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, pendingRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#192129' }, pendingName: { color: colors.text, fontSize: 11, fontWeight: '900' }, pendingState: { color: colors.textMuted, fontSize: 7, fontWeight: '900' },
  empty: { minHeight: 220, justifyContent: 'center', padding: 22, borderRadius: 28, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border, gap: 9 }, emptyEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 }, emptyTitle: { maxWidth: 320, color: colors.text, fontSize: 27, lineHeight: 28, fontWeight: '900', letterSpacing: -1 }, emptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 17 }, skeleton: { height: 170, borderRadius: 24, backgroundColor: '#10161D' },
});
