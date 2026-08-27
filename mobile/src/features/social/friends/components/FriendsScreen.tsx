import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { CosmeticAvatar } from '@/src/features/shop/components/CosmeticRenderer';
import { publicAppUrl } from '@/src/config/release';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

import {
  answerFriendRequest,
  loadFriends,
  removeFriend,
  requestFriend,
  searchPlayers,
} from '../api';
import type { CircleWeeklyData, CircleWeeklyRow, FriendRow, FriendsData, PlayerSearchRow } from '../types';

const EMPTY: FriendsData = { amis: [], recues: [], envoyees: [], weekly: null };
const RANKING_PAGE_SIZE = 10;

export default function FriendsScreen() {
  return <CirclePeopleScreen />;
}

export function FriendRequestsScreen() {
  return <CirclePeopleScreen />;
}

function CirclePeopleScreen() {
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
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const searchRequest = useRef(0);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
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
  }, [runSearch, search]);

  async function act(id: string, kind: 'add' | 'accept' | 'reject' | 'remove' | 'cancel') {
    setBusy(id); setError(null);
    try {
      if (kind === 'add') await requestFriend(id);
      else if (kind === 'accept') await answerFriendRequest(id, true);
      else if (kind === 'reject') await answerFriendRequest(id, false);
      else await removeFriend(id);
      setConfirmRemoveId(null);
      await load();
      if (search.trim().length >= 2) await runSearch(search.trim());
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Action impossible.'); }
    finally { setBusy(null); }
  }

  function openProfile(pseudo: string) {
    router.push({ pathname: '/player/[pseudo]', params: { pseudo } });
  }

  function challengePlayer(player: CircleWeeklyRow) {
    router.push({
      pathname: '/(tabs)/matches',
      params: { duelRivalId: player.id, duelRivalPseudo: player.pseudo },
    });
  }

  async function sharePerformance() {
    const me = data.weekly?.moi;
    if (!me) return;
    const precision = me.precision_pct == null ? '—' : `${Math.round(me.precision_pct)}%`;
    const message = `Ma semaine GRIFF : #${me.rang}/${me.participants} dans mon Cercle · ${signed(me.frags_hebdo)} Frags · ${me.victoires}/${me.calls} calls · ${precision} de réussite.`;
    const url = publicAppUrl('/') ?? '';
    const shareText = url ? `${message} ${url}` : message;
    try {
      if (Platform.OS === 'web' && globalThis.navigator?.clipboard) {
        await globalThis.navigator.clipboard.writeText(shareText);
        setShareMessage('CARTE COPIÉE · PRÊTE À ÊTRE PARTAGÉE.');
      } else {
        await Share.share({ message: shareText, ...(url ? { url } : {}) });
        setShareMessage('CARTE PRÊTE À ÊTRE PARTAGÉE.');
      }
    } catch {
      setShareMessage(message);
    }
  }

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
        <Text style={styles.subtitle}>Gère tes amis et tes demandes au même endroit, compare vos ratings et construis vos prochaines rivalités.</Text>
      </View>

      {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View> : null}

      <FriendRequestsInbox
        busy={busy}
        data={data}
        loading={loading}
        onAccept={(id) => void act(id, 'accept')}
        onCancel={(id) => void act(id, 'cancel')}
        onOpen={openProfile}
        onReject={(id) => void act(id, 'reject')}
      />

      {loading ? <View style={styles.weeklySkeleton} /> : <WeeklyPerformanceCard weekly={data.weekly} onShare={() => void sharePerformance()} />}
      {shareMessage ? <Text style={styles.shareMessage}>{shareMessage}</Text> : null}

      <WeeklyRanking weekly={data.weekly} onChallenge={challengePlayer} onOpen={openProfile} />

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
    </ScrollView>
  );
}

function FriendRequestsInbox({
  busy,
  data,
  loading,
  onAccept,
  onCancel,
  onOpen,
  onReject,
}: {
  busy: string | null;
  data: FriendsData;
  loading: boolean;
  onAccept: (id: string) => void;
  onCancel: (id: string) => void;
  onOpen: (pseudo: string) => void;
  onReject: (id: string) => void;
}) {
  const pendingCount = data.recues.length + data.envoyees.length;

  return (
    <View style={styles.requestsInbox}>
      <View style={styles.requestsInboxHeading}>
        <View style={styles.requestsInboxCopy}>
          <Text style={styles.requestsInboxEyebrow}>DEMANDES</Text>
          <Text style={styles.requestsInboxTitle}>QUI ENTRE DANS TON CERCLE ?</Text>
        </View>
        <View style={styles.requestsInboxCount}>
          <Text style={styles.requestsInboxCountText}>{loading ? '—' : pendingCount}</Text>
        </View>
      </View>

      {loading ? <View style={styles.requestsSkeleton} /> : (
        <>
          {data.recues.length ? (
            <View style={styles.requestGroup}>
              <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>REÇUES</Text><Text style={styles.sectionMeta}>{data.recues.length}</Text></View>
              {data.recues.map((friend) => (
                <RequestCard
                  key={friend.id}
                  friend={friend}
                  disabled={busy === friend.id}
                  onAccept={() => onAccept(friend.id)}
                  onOpen={() => onOpen(friend.pseudo)}
                  onReject={() => onReject(friend.id)}
                />
              ))}
            </View>
          ) : null}

          {data.envoyees.length ? (
            <View style={styles.requestGroup}>
              <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>ENVOYÉES</Text><Text style={styles.sectionMeta}>{data.envoyees.length}</Text></View>
              <View style={styles.pendingCard}>{data.envoyees.slice(0, 8).map((friend) => (
                <View key={friend.id} style={styles.pendingRow}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Voir le profil de ${friend.pseudo}`} onPress={() => onOpen(friend.pseudo)} style={styles.pendingCopy}>
                    <Text style={styles.pendingName}>{friend.pseudo}</Text><Text style={styles.pendingState}>DEMANDE ENVOYÉE</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" disabled={busy === friend.id} onPress={() => onCancel(friend.id)} style={({ pressed }) => [styles.cancel, busy === friend.id && styles.disabled, pressed && styles.pressed]}><Text style={styles.cancelText}>ANNULER</Text></Pressable>
                </View>
              ))}</View>
            </View>
          ) : null}

          {!pendingCount ? <EmptyRequests text="Aucune demande en attente pour le moment." /> : null}
        </>
      )}
    </View>
  );
}

function WeeklyPerformanceCard({ weekly, onShare }: { weekly: CircleWeeklyData | null; onShare: () => void }) {
  const me = weekly?.moi;
  if (!me) {
    return (
      <View style={styles.weeklyEmpty}>
        <Text style={styles.weeklyEyebrow}>CERCLE // SEMAINE EN COURS</Text>
        <Text style={styles.weeklyEmptyTitle}>LE CLASSEMENT DÉMARRE AVEC TON PREMIER VERDICT.</Text>
        <Text style={styles.weeklyEmptyCopy}>Tes calls réglés et ceux de tes amis apparaîtront ici, du lundi au dimanche.</Text>
      </View>
    );
  }

  const precision = me.precision_pct == null ? '—' : `${Math.round(me.precision_pct)}%`;
  return (
    <View style={styles.performanceCard}>
      <View style={styles.performanceGlow} />
      <View style={styles.performanceTop}>
        <View><Text style={styles.weeklyEyebrow}>CARTE DE PERFORMANCE</Text><Text style={styles.weeklyPeriod}>{weekLabel(weekly)}</Text></View>
        <View style={styles.weekPill}><Text style={styles.weekPillText}>{weekly?.semaine || 'SEMAINE'}</Text></View>
      </View>
      <View style={styles.performanceRankRow}>
        <Text style={styles.performanceRank}>#{me.rang}</Text>
        <Text style={styles.performanceOf}>/ {me.participants}{'\n'}DANS TON CERCLE</Text>
      </View>
      <View style={styles.performanceStats}>
        <WeeklyStat label="FRAGS" value={signed(me.frags_hebdo)} accent />
        <View style={styles.performanceDivider} />
        <WeeklyStat label="CALLS" value={`${me.victoires}/${me.calls}`} />
        <View style={styles.performanceDivider} />
        <WeeklyStat label="PRÉCISION" value={precision} />
      </View>
      <Pressable accessibilityRole="button" onPress={onShare} style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
        <Text style={styles.shareButtonText}>PARTAGER MA CARTE</Text><Text style={styles.shareButtonArrow}>↗</Text>
      </Pressable>
    </View>
  );
}

function WeeklyStat({ accent = false, label, value }: { accent?: boolean; label: string; value: string }) {
  return <View style={styles.weeklyStat}><Text style={[styles.weeklyStatValue, accent && styles.weeklyStatValueAccent]}>{value}</Text><Text style={styles.weeklyStatLabel}>{label}</Text></View>;
}

function WeeklyRanking({ weekly, onChallenge, onOpen }: {
  weekly: CircleWeeklyData | null;
  onChallenge: (player: CircleWeeklyRow) => void;
  onOpen: (pseudo: string) => void;
}) {
  const { equipped } = useCosmetics();
  const [visibleCount, setVisibleCount] = useState(RANKING_PAGE_SIZE);
  useEffect(() => setVisibleCount(RANKING_PAGE_SIZE), [weekly?.semaine]);
  if (!weekly?.classement.length) return null;
  const visibleRanking = weekly.classement.slice(0, visibleCount);
  return (
    <View style={styles.weeklySection}>
      <View style={styles.sectionHeading}><Text style={styles.sectionLabel}>CLASSEMENT DE LA SEMAINE</Text><Text style={styles.sectionMeta}>{weekly.classement.length}</Text></View>
      <View style={styles.weeklyList}>
        {visibleRanking.map((player) => (
          <View key={player.id} style={[styles.weeklyRow, player.moi && styles.weeklyRowMine]}>
            <Text style={[styles.weeklyRank, player.rang <= 3 && styles.weeklyRankTop]}>{String(player.rang).padStart(2, '0')}</Text>
            <Pressable accessibilityRole="button" onPress={() => onOpen(player.pseudo)} style={({ pressed }) => [styles.weeklyIdentity, pressed && styles.pressed]}>
              {player.moi
                ? <CosmeticAvatar cosmetics={equipped} label={player.pseudo} size={34} />
                : <View style={styles.avatarSmall}><Text style={styles.avatarSmallText}>{initials(player.pseudo)}</Text></View>}
              <View style={styles.weeklyPlayerCopy}>
                <Text numberOfLines={1} style={styles.weeklyPlayerName}>{player.moi ? 'TOI' : player.pseudo}</Text>
                <Text style={styles.weeklyPlayerMeta}>{player.victoires}/{player.calls} calls · {player.precision_pct == null ? '—' : `${Math.round(player.precision_pct)}%`}</Text>
              </View>
            </Pressable>
            <Text style={[styles.weeklyDelta, player.frags_hebdo < 0 && styles.weeklyDeltaLoss]}>{signed(player.frags_hebdo)}</Text>
            {!player.moi ? <Pressable accessibilityLabel={`Défier ${player.pseudo}`} accessibilityRole="button" onPress={() => onChallenge(player)} style={({ pressed }) => [styles.challengeButton, pressed && styles.pressed]}><Text style={styles.challengeButtonText}>⚔</Text></Pressable> : null}
          </View>
        ))}
      </View>
      {visibleRanking.length < weekly.classement.length ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setVisibleCount((count) => count + RANKING_PAGE_SIZE)}
          style={({ pressed }) => [styles.rankingMore, pressed && styles.pressed]}
        >
          <Text style={styles.rankingMoreText}>VOIR LA SUITE DU CLASSEMENT</Text>
          <Text style={styles.rankingMoreMeta}>{visibleRanking.length}/{weekly.classement.length}</Text>
        </Pressable>
      ) : null}
    </View>
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
function signed(value: number) { const amount = Number(value || 0); return `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${Math.abs(amount)}`; }
function weekLabel(weekly: CircleWeeklyData | null) {
  if (!weekly?.debut || !weekly.fin) return 'SEMAINE EN COURS';
  const start = new Date(weekly.debut);
  const end = new Date(new Date(weekly.fin).getTime() - 1);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 'SEMAINE EN COURS';
  return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`.toUpperCase();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center', padding: spacing.md, paddingBottom: layout.tabBarContentInset, gap: 22 },
  intro: { gap: 8, paddingTop: 4 }, eyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1.1 }, title: { ...typography.displayMedium, maxWidth: 365, color: colors.text }, subtitle: { ...typography.body, maxWidth: 365, color: colors.textMuted },
  error: { padding: 12, borderRadius: radius.md, backgroundColor: '#1A1012', borderWidth: 1, borderColor: '#4A2027' }, errorText: { ...typography.body, color: '#FF9AA2' },
  weeklySkeleton: { height: 330, borderRadius: 29, backgroundColor: '#10161D' },
  weeklyEmpty: { minHeight: 220, justifyContent: 'center', padding: 21, borderRadius: 29, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border, gap: 9 },
  weeklyEmptyTitle: { ...typography.displaySmall, maxWidth: 330, color: colors.text },
  weeklyEmptyCopy: { ...typography.body, maxWidth: 330, color: colors.textMuted },
  performanceCard: { position: 'relative', overflow: 'hidden', minHeight: 330, padding: 19, borderRadius: 29, backgroundColor: '#0C120C', borderWidth: 1, borderColor: '#46531F' },
  performanceGlow: { position: 'absolute', right: -75, top: -85, width: 230, height: 230, borderRadius: 115, backgroundColor: '#71851E', opacity: .22 },
  performanceTop: { zIndex: 2, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  weeklyEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: 1 },
  weeklyPeriod: { ...typography.caption, marginTop: 4, color: '#A9B28E' },
  weekPill: { minHeight: 29, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#18200F', borderWidth: 1, borderColor: '#46531F' },
  weekPillText: { ...typography.label, color: '#C8D59A', letterSpacing: .25 },
  performanceRankRow: { zIndex: 2, marginTop: 22, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  performanceRank: { ...typography.metricLarge, color: colors.text, fontSize: 78, lineHeight: 76, letterSpacing: -4 },
  performanceOf: { ...typography.eyebrow, marginBottom: 8, color: '#A9B28E', lineHeight: 15, letterSpacing: .7 },
  performanceStats: { zIndex: 2, minHeight: 72, marginTop: 17, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderRadius: 18, backgroundColor: 'rgba(5,9,7,.58)', borderWidth: 1, borderColor: '#303A1C' },
  weeklyStat: { minWidth: 72, alignItems: 'center' }, weeklyStatValue: { ...typography.metricSmall, color: colors.text }, weeklyStatValueAccent: { color: colors.volt }, weeklyStatLabel: { ...typography.eyebrow, marginTop: 3, color: colors.textMuted, letterSpacing: .45 },
  performanceDivider: { width: 1, height: 34, backgroundColor: '#35401F' },
  shareButton: { zIndex: 2, minHeight: 48, marginTop: 13, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, backgroundColor: colors.volt },
  shareButtonText: { ...typography.action, color: '#080A0C', letterSpacing: .45 }, shareButtonArrow: { color: '#080A0C', fontSize: 18, fontWeight: '900' },
  shareMessage: { ...typography.label, marginTop: -12, color: colors.volt, letterSpacing: .35 },
  weeklySection: { gap: 9 }, weeklyList: { overflow: 'hidden', borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border },
  rankingMore: { minHeight: 48, paddingHorizontal: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0D1217', borderWidth: 1, borderColor: '#303A43' },
  rankingMoreText: { ...typography.action, color: colors.volt, letterSpacing: .25 }, rankingMoreMeta: { ...typography.label, color: colors.textMuted },
  weeklyRow: { minHeight: 76, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: '#192129' },
  weeklyRowMine: { backgroundColor: '#12190E' }, weeklyRank: { ...typography.label, width: 23, color: '#68737D' }, weeklyRankTop: { color: colors.volt },
  weeklyIdentity: { flex: 1, minWidth: 0, minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 9 }, weeklyPlayerCopy: { flex: 1, minWidth: 0 }, weeklyPlayerName: { ...typography.bodyStrong, color: colors.text }, weeklyPlayerMeta: { ...typography.caption, marginTop: 3, color: colors.textMuted },
  weeklyDelta: { ...typography.bodyStrong, minWidth: 32, color: colors.volt, textAlign: 'right' }, weeklyDeltaLoss: { color: '#FF8E99' },
  challengeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#1A220F', borderWidth: 1, borderColor: '#48551F' }, challengeButtonText: { color: colors.volt, fontSize: 17 },
  requestsInbox: { padding: 14, borderRadius: 25, backgroundColor: '#0A100D', borderWidth: 1, borderColor: '#334019', gap: 14 },
  requestsInboxHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  requestsInboxCopy: { flex: 1, minWidth: 0 },
  requestsInboxEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .9 },
  requestsInboxTitle: { ...typography.cardTitle, marginTop: 5, color: colors.text },
  requestsInboxCount: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#18200F', borderWidth: 1, borderColor: '#4B5A20' },
  requestsInboxCountText: { ...typography.cardTitle, color: colors.volt },
  requestGroup: { gap: 8 },
  requestsSkeleton: { height: 112, borderRadius: 20, backgroundColor: '#121A16' },
  section: { gap: 9 }, sectionHeading: { flexDirection: 'row', justifyContent: 'space-between' }, sectionLabel: { ...typography.eyebrow, color: colors.textMuted, letterSpacing: .9 }, sectionMeta: { ...typography.label, color: colors.textMuted },
  searchShell: { padding: 17, borderRadius: 25, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border, gap: 9 }, searchEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 }, searchTitle: { ...typography.cardTitle, color: colors.text }, searchInput: { ...typography.bodyStrong, minHeight: 52, paddingHorizontal: 14, borderRadius: 15, backgroundColor: '#070B0F', borderWidth: 1, borderColor: '#263039', color: colors.text }, searchState: { ...typography.caption, paddingVertical: 5, color: colors.textMuted, textAlign: 'center' }, searchError: { ...typography.body, color: '#FF9AA2' },
  searchRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, borderRadius: 14, backgroundColor: '#0D1319', borderWidth: 1, borderColor: '#1D2730' }, searchIdentity: { flex: 1, minWidth: 0, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10 }, avatarSmall: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E' }, avatarSmallText: { ...typography.label, color: colors.volt }, searchName: { ...typography.bodyStrong, flex: 1, color: colors.text }, searchAction: { minHeight: 40, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.volt }, searchActionSecondary: { backgroundColor: '#11161C', borderWidth: 1, borderColor: '#303A43' }, searchActionText: { ...typography.action, color: '#080A0C' }, searchActionTextSecondary: { color: colors.textMuted }, relation: { ...typography.label, color: colors.textMuted },
  friendCard: { minHeight: 124, gap: 7, padding: 12, borderRadius: 22, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, friendMain: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11 }, friendRank: { ...typography.label, width: 22, color: '#697580' }, avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#171E0E', borderWidth: 1, borderColor: '#3A461D' }, avatarText: { ...typography.label, color: colors.volt }, friendCopy: { flex: 1, minWidth: 0 }, friendNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, friendName: { ...typography.bodyStrong, flexShrink: 1, color: colors.text }, friendMeta: { ...typography.caption, marginTop: 4, color: colors.textMuted }, tag: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: '#171E0E' }, tagText: { ...typography.label, color: colors.volt }, precisionBlock: { alignItems: 'flex-end' }, precision: { ...typography.cardTitle, color: colors.text }, precisionLabel: { ...typography.caption, marginTop: 2, color: colors.textMuted }, remove: { minHeight: 38, alignSelf: 'flex-end', paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#3A2A30', backgroundColor: '#151014' }, removeConfirm: { backgroundColor: '#35151C', borderColor: '#6B2A37' }, removeText: { ...typography.label, color: '#C98A95' }, removeTextConfirm: { color: '#FF9AA2' },
  requestCard: { minHeight: 124, gap: 10, padding: 12, borderRadius: 22, backgroundColor: '#0D141A', borderWidth: 1, borderColor: '#2A3742' }, requestIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10 }, requestActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 7 }, reject: { minHeight: 42, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#151216', borderWidth: 1, borderColor: '#3A2B32' }, rejectText: { ...typography.action, color: '#C28A94' }, accept: { minHeight: 42, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.volt }, acceptText: { ...typography.action, color: '#080A0C' },
  pendingCard: { overflow: 'hidden', borderRadius: 20, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, pendingRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: '#192129' }, pendingCopy: { flex: 1, minWidth: 0, minHeight: 70, justifyContent: 'center' }, pendingName: { ...typography.bodyStrong, color: colors.text }, pendingState: { ...typography.caption, marginTop: 3, color: colors.textMuted }, cancel: { minHeight: 40, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#303A43' }, cancelText: { ...typography.label, color: colors.textMuted },
  emptyRequests: { minHeight: 102, padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#0B1015', borderWidth: 1, borderColor: colors.border }, emptyRequestsDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#3A444D' }, emptyRequestsText: { ...typography.body, flex: 1, color: colors.textMuted },
  empty: { minHeight: 236, justifyContent: 'center', padding: 22, borderRadius: 28, backgroundColor: '#0A0F14', borderWidth: 1, borderColor: colors.border, gap: 9 }, emptyEyebrow: { ...typography.eyebrow, color: colors.volt, letterSpacing: .8 }, emptyTitle: { ...typography.displaySmall, maxWidth: 320, color: colors.text }, emptyText: { ...typography.body, color: colors.textMuted }, skeleton: { height: 170, borderRadius: 24, backgroundColor: '#10161D' },
  disabled: { opacity: 0.48 }, pressed: { opacity: 0.74 },
});
