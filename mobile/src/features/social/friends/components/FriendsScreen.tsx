import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  answerFriendRequest,
  loadFriends,
  removeFriend,
  requestFriend,
  searchPlayers,
} from '../api';
import type { FriendRow, FriendsData, PlayerSearchRow } from '../types';
import { colors, radius, spacing } from '@/src/theme';

const EMPTY: FriendsData = { amis: [], recues: [], envoyees: [] };
type CircleView = 'friends' | 'requests';

export default function FriendsScreen() {
  return <CirclePeopleScreen view="friends" />;
}

export function FriendRequestsScreen() {
  return <CirclePeopleScreen view="requests" />;
}

function CirclePeopleScreen({ view }: { view: CircleView }) {
  const [data, setData] = useState<FriendsData>(EMPTY);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PlayerSearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRequest = useRef(0);

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try { setData(await loadFriends()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Impossible de charger tes amis.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runSearch = useCallback(async (term: string) => {
    const requestId = ++searchRequest.current;
    setSearching(true);
    setSearchError(null);
    try {
      const next = await searchPlayers(term);
      if (requestId === searchRequest.current) setResults(next);
    } catch {
      if (requestId === searchRequest.current) {
        setResults([]);
        setSearchError('Recherche indisponible. Réessaie dans un instant.');
      }
    } finally {
      if (requestId === searchRequest.current) setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (view !== 'friends') return undefined;
    const value = search.trim();
    if (value.length < 2) {
      searchRequest.current += 1;
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    const timer = setTimeout(() => { void runSearch(value); }, 280);
    return () => clearTimeout(timer);
  }, [runSearch, search, view]);

  async function act(id: string, kind: 'add' | 'accept' | 'reject' | 'remove' | 'cancel') {
    setBusy(id); setError(null);
    try {
      if (kind === 'add') await requestFriend(id);
      else if (kind === 'accept') await answerFriendRequest(id, true);
      else if (kind === 'reject') await answerFriendRequest(id, false);
      else await removeFriend(id);
      setConfirmRemoveId(null);
      await load();
      if (view === 'friends' && search.trim().length >= 2) await runSearch(search.trim());
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Action impossible.'); }
    finally { setBusy(null); }
  }

  function openProfile(pseudo: string) {
    router.push({ pathname: '/player/[pseudo]', params: { pseudo } });
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
        <Text style={styles.title}>{view === 'friends' ? 'LES GENS DERRIÈRE LES PSEUDOS.' : 'QUI ENTRE DANS TON CERCLE ?'}</Text>
        <Text style={styles.subtitle}>{view === 'friends' ? 'Retrouve tes amis, compare vos ratings et construis vos prochaines rivalités.' : 'Accepte les nouvelles connexions et garde un œil sur les invitations déjà envoyées.'}</Text>
      </View>

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

      {view === 'friends' ? (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroCount}>{loading ? '—' : data.amis.length}</Text>
            <Text style={styles.heroLabel}>JOUEURS DANS TON CERCLE</Text>
            <View style={styles.heroLine} />
            <Text style={styles.heroCopy}>{topFriend ? `${topFriend.pseudo} est actuellement ton premier point de comparaison.` : 'Ton premier rival peut commencer par une simple recherche.'}</Text>
          </View>

          <View style={styles.searchShell}>
            <Text style={styles.searchEyebrow}>TROUVER UN JOUEUR</Text>
            <Text style={styles.searchTitle}>Ajoute quelqu’un à ton cercle.</Text>
            <TextInput accessibilityLabel="Chercher un joueur par pseudo" value={search} onChangeText={setSearch} placeholder="Chercher un pseudo…" placeholderTextColor="#596570" style={styles.searchInput} />
            {searching ? <Text style={styles.searchState}>RECHERCHE…</Text> : null}
            {searchError ? <Text style={styles.searchError}>{searchError}</Text> : null}
            {!searching && search.trim().length >= 2 && !searchError && !results.length ? <Text style={styles.searchState}>AUCUN JOUEUR TROUVÉ</Text> : null}
            {results.map((player) => (
              <SearchRow
                key={player.id}
                player={player}
                disabled={busy === player.id}
                onAction={() => void act(
                  player.id,
                  player.relation === 'demande_recue'
                    ? 'accept'
                    : player.relation === 'demande_envoyee'
                      ? 'cancel'
                      : 'add',
                )}
                onOpen={() => openProfile(player.pseudo)}
              />
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>TES AMIS</Text><Text style={styles.sectionMeta}>{data.amis.length}</Text></View>
            {loading ? <View style={styles.skeleton} /> : data.amis.length ? data.amis.map((friend, index) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                rank={index + 1}
                disabled={busy === friend.id}
                confirming={confirmRemoveId === friend.id}
                onOpen={() => openProfile(friend.pseudo)}
                onRemove={() => confirmRemoveId === friend.id ? void act(friend.id, 'remove') : setConfirmRemoveId(friend.id)}
              />
            )) : <EmptyFriends />}
          </View>
        </>
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroCount}>{loading ? '—' : data.recues.length}</Text>
            <Text style={styles.heroLabel}>DEMANDE{data.recues.length > 1 ? 'S' : ''} À TRAITER</Text>
            <View style={styles.heroLine} />
            <Text style={styles.heroCopy}>Les demandes reçues restent séparées de ta liste d’amis, pour garder le cercle lisible.</Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>REÇUES</Text><Text style={styles.sectionMeta}>{data.recues.length}</Text></View>
            {loading ? <View style={styles.skeleton} /> : data.recues.length ? data.recues.map((friend) => (
              <RequestCard
                key={friend.id}
                friend={friend}
                disabled={busy === friend.id}
                onAccept={() => void act(friend.id, 'accept')}
                onOpen={() => openProfile(friend.pseudo)}
                onReject={() => void act(friend.id, 'reject')}
              />
            )) : <EmptyRequests text="Aucune demande reçue pour le moment." />}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>ENVOYÉES</Text><Text style={styles.sectionMeta}>{data.envoyees.length}</Text></View>
            {data.envoyees.length ? (
              <View style={styles.pendingCard}>{data.envoyees.slice(0, 8).map((friend) => (
                <View key={friend.id} style={styles.pendingRow}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Voir le profil de ${friend.pseudo}`} onPress={() => openProfile(friend.pseudo)} style={styles.pendingCopy}>
                    <Text style={styles.pendingName}>{friend.pseudo}</Text><Text style={styles.pendingState}>DEMANDE ENVOYÉE</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" disabled={busy === friend.id} onPress={() => void act(friend.id, 'cancel')} style={({ pressed }) => [styles.cancel, busy === friend.id && styles.disabled, pressed && styles.pressed]}><Text style={styles.cancelText}>ANNULER</Text></Pressable>
                </View>
              ))}</View>
            ) : <EmptyRequests text="Aucune demande envoyée en attente." />}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function FriendCard({ friend, rank, disabled, confirming, onOpen, onRemove }: { friend: FriendRow; rank: number; disabled: boolean; confirming: boolean; onOpen: () => void; onRemove: () => void }) {
  const bets = Number(friend.paris ?? 0);
  const wins = Number(friend.gagnes ?? 0);
  const precision = bets ? Math.round((wins / bets) * 100) : null;
  return (
    <View style={styles.friendCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Voir le profil de ${friend.pseudo}`} onPress={onOpen} style={({ pressed }) => [styles.friendMain, pressed && styles.pressed]}>
        <Text style={styles.friendRank}>0{rank}</Text>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(friend.pseudo)}</Text></View>
        <View style={styles.friendCopy}>
          <View style={styles.friendNameRow}><Text numberOfLines={1} style={styles.friendName}>{friend.pseudo}</Text>{friend.tag_favori ? <View style={styles.tag}><Text style={styles.tagText}>{friend.tag_favori}</Text></View> : null}</View>
          <Text style={styles.friendMeta}>{format(friend.solde ?? 1000)} Frags · {bets} pronostic{bets > 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.precisionBlock}><Text style={styles.precision}>{precision == null ? '—' : `${precision}%`}</Text><Text style={styles.precisionLabel}>RÉUSSITE</Text></View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${confirming ? 'Confirmer le retrait de' : 'Retirer'} ${friend.pseudo}`} disabled={disabled} onPress={onRemove} style={({ pressed }) => [styles.remove, confirming && styles.removeConfirm, disabled && styles.disabled, pressed && styles.pressed]}><Text style={[styles.removeText, confirming && styles.removeTextConfirm]}>{confirming ? 'CONFIRMER' : 'RETIRER'}</Text></Pressable>
    </View>
  );
}

function RequestCard({ friend, disabled, onAccept, onReject, onOpen }: { friend: FriendRow; disabled: boolean; onAccept: () => void; onReject: () => void; onOpen: () => void }) {
  return (
    <View style={styles.requestCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Voir le profil de ${friend.pseudo}`} onPress={onOpen} style={styles.requestIdentity}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(friend.pseudo)}</Text></View>
        <View style={styles.friendCopy}><Text style={styles.friendName}>{friend.pseudo}</Text><Text style={styles.friendMeta}>veut rejoindre ton cercle</Text></View>
      </Pressable>
      <View style={styles.requestActions}>
        <Pressable accessibilityRole="button" disabled={disabled} onPress={onReject} style={({ pressed }) => [styles.reject, disabled && styles.disabled, pressed && styles.pressed]}><Text style={styles.rejectText}>REFUSER</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={disabled} onPress={onAccept} style={({ pressed }) => [styles.accept, disabled && styles.disabled, pressed && styles.pressed]}><Text style={styles.acceptText}>ACCEPTER</Text></Pressable>
      </View>
    </View>
  );
}

function SearchRow({ player, disabled, onAction, onOpen }: { player: PlayerSearchRow; disabled: boolean; onAction: () => void; onOpen: () => void }) {
  const actionable = player.relation !== 'ami';
  const actionLabel = player.relation === 'demande_recue'
    ? 'ACCEPTER'
    : player.relation === 'demande_envoyee'
      ? 'ANNULER'
      : 'AJOUTER';
  return (
    <View style={styles.searchRow}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Voir le profil de ${player.pseudo}`} onPress={onOpen} style={({ pressed }) => [styles.searchIdentity, pressed && styles.pressed]}>
        <View style={styles.avatarSmall}><Text style={styles.avatarSmallText}>{initials(player.pseudo)}</Text></View>
        <Text style={styles.searchName}>{player.pseudo}</Text>
      </Pressable>
      {actionable ? <Pressable accessibilityRole="button" disabled={disabled} onPress={onAction} style={({ pressed }) => [styles.searchAction, player.relation === 'demande_envoyee' && styles.searchActionSecondary, disabled && styles.disabled, pressed && styles.pressed]}><Text style={[styles.searchActionText, player.relation === 'demande_envoyee' && styles.searchActionTextSecondary]}>{actionLabel}</Text></Pressable> : <Pressable accessibilityRole="button" onPress={onOpen}><Text style={styles.relation}>VOIR</Text></Pressable>}
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

function EmptyRequests({ text }: { text: string }) {
  return (
    <View style={styles.emptyRequests}>
      <View style={styles.emptyRequestsDot} />
      <Text style={styles.emptyRequestsText}>{text}</Text>
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
  searchShell: { padding: 17, borderRadius: 25, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 9 }, searchEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 }, searchTitle: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: -0.4 }, searchInput: { minHeight: 50, paddingHorizontal: 14, borderRadius: 15, backgroundColor: '#070B0F', borderWidth: 1, borderColor: '#263039', color: colors.text, fontSize: 13, fontWeight: '700' }, searchState: { paddingVertical: 5, color: colors.textMuted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center' }, searchError: { color: '#FF9AA2', fontSize: 9, lineHeight: 14 },
  searchRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, borderRadius: 14, backgroundColor: '#0D1319', borderWidth: 1, borderColor: '#1D2730' }, searchIdentity: { flex: 1, minWidth: 0, minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10 }, avatarSmall: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E' }, avatarSmallText: { color: colors.volt, fontSize: 7, fontWeight: '900' }, searchName: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '900' }, searchAction: { minHeight: 31, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.volt }, searchActionSecondary: { backgroundColor: '#11161C', borderWidth: 1, borderColor: '#303A43' }, searchActionText: { color: '#080A0C', fontSize: 7, fontWeight: '900' }, searchActionTextSecondary: { color: colors.textMuted }, relation: { color: colors.textMuted, fontSize: 7, fontWeight: '900' },
  friendCard: { minHeight: 105, gap: 7, padding: 12, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, friendMain: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11 }, friendRank: { width: 22, color: '#596570', fontSize: 9, fontWeight: '900' }, avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#3A461D' }, avatarText: { color: colors.volt, fontSize: 9, fontWeight: '900' }, friendCopy: { flex: 1, minWidth: 0 }, friendNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, friendName: { flexShrink: 1, color: colors.text, fontSize: 13, fontWeight: '900' }, friendMeta: { marginTop: 4, color: colors.textMuted, fontSize: 9 }, tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: '#171E0E' }, tagText: { color: colors.volt, fontSize: 6, fontWeight: '900' }, precisionBlock: { alignItems: 'flex-end' }, precision: { color: colors.text, fontSize: 15, fontWeight: '900' }, precisionLabel: { marginTop: 2, color: colors.textMuted, fontSize: 6, fontWeight: '900' }, remove: { minHeight: 28, alignSelf: 'flex-end', paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#3A2A30', backgroundColor: '#151014' }, removeConfirm: { backgroundColor: '#35151C', borderColor: '#6B2A37' }, removeText: { color: '#B57B85', fontSize: 6, fontWeight: '900' }, removeTextConfirm: { color: '#FF9AA2' },
  requestCard: { minHeight: 108, gap: 10, padding: 12, borderRadius: 22, backgroundColor: '#0D141A', borderWidth: 1, borderColor: '#2A3742' }, requestIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 }, requestActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 7 }, reject: { minHeight: 36, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#151216', borderWidth: 1, borderColor: '#3A2B32' }, rejectText: { color: '#C28A94', fontSize: 7, fontWeight: '900' }, accept: { minHeight: 36, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.volt }, acceptText: { color: '#080A0C', fontSize: 7, fontWeight: '900' },
  pendingCard: { overflow: 'hidden', borderRadius: 20, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, pendingRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#192129' }, pendingCopy: { flex: 1, minWidth: 0, minHeight: 58, justifyContent: 'center' }, pendingName: { color: colors.text, fontSize: 11, fontWeight: '900' }, pendingState: { marginTop: 3, color: colors.textMuted, fontSize: 7, fontWeight: '900' }, cancel: { minHeight: 30, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#303A43' }, cancelText: { color: colors.textMuted, fontSize: 6, fontWeight: '900' },
  emptyRequests: { minHeight: 92, padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, emptyRequestsDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#3A444D' }, emptyRequestsText: { flex: 1, color: colors.textMuted, fontSize: 10, lineHeight: 15 },
  empty: { minHeight: 220, justifyContent: 'center', padding: 22, borderRadius: 28, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border, gap: 9 }, emptyEyebrow: { color: colors.volt, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 }, emptyTitle: { maxWidth: 320, color: colors.text, fontSize: 27, lineHeight: 28, fontWeight: '900', letterSpacing: -1 }, emptyText: { color: colors.textMuted, fontSize: 11, lineHeight: 17 }, skeleton: { height: 170, borderRadius: 24, backgroundColor: '#10161D' },
  disabled: { opacity: 0.48 }, pressed: { opacity: 0.74 },
});
