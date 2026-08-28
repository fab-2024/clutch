import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { BaseSheet } from '@/src/components/overlays/BaseSheet';
import { useResponsiveLayout } from '@/src/components/layout/useResponsiveLayout';
import { Button } from '@/src/components/ui/Button';
import { SegmentedControl, type SegmentedControlItem } from '@/src/components/ui/SegmentedControl';
import { StateView } from '@/src/components/ui/StateView';
import { publicAppUrl } from '@/src/config/release';
import { useSnackbar } from '@/src/providers/SnackbarProvider';
import { colors, layout, spacing, typography } from '@/src/theme';

import {
  answerFriendRequest,
  loadFriends,
  removeFriend,
  requestFriend,
  searchPlayers,
} from '../api';
import type { CircleWeeklyRow, FriendRow, FriendsData, PlayerSearchRow } from '../types';
import CircleActivityView from './CircleActivityView';
import CircleDirectoryView from './CircleDirectoryView';

const EMPTY: FriendsData = { amis: [], recues: [], envoyees: [], weekly: null };

export type CircleView = 'activity' | 'friends';

export type CirclePreviewState = {
  data: FriendsData;
  error?: string | null;
  loading?: boolean;
  search?: string;
  searchError?: string | null;
  searching?: boolean;
  searchResults?: PlayerSearchRow[];
};

export default function FriendsScreen() {
  return <CirclePeopleScreen />;
}

export function FriendRequestsScreen() {
  return <CirclePeopleScreen focusRequests />;
}

export function CirclePeopleScreen({
  focusRequests = false,
  initialView = 'activity',
  previewState,
}: {
  focusRequests?: boolean;
  initialView?: CircleView;
  previewState?: CirclePreviewState;
}) {
  const { isShortLandscape } = useResponsiveLayout();
  const previewMode = previewState !== undefined;
  const [view, setView] = useState<CircleView>(initialView);
  const [data, setData] = useState<FriendsData>(previewState?.data ?? EMPTY);
  const [search, setSearch] = useState(previewState?.search ?? '');
  const [results, setResults] = useState<PlayerSearchRow[]>(previewState?.searchResults ?? []);
  const [loading, setLoading] = useState(previewState?.loading ?? !previewMode);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(previewState?.searching ?? false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(previewState?.error ?? null);
  const [searchError, setSearchError] = useState<string | null>(previewState?.searchError ?? null);
  const [selectedFriend, setSelectedFriend] = useState<FriendRow | null>(null);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const searchRequest = useRef(0);
  const actionReturnRef = useRef<View | null>(null);
  const { showSnackbar } = useSnackbar();

  const load = useCallback(async (refresh = false) => {
    if (previewState) {
      setData(previewState.data);
      setLoading(Boolean(previewState.loading));
      setError(previewState.error ?? null);
      setRefreshing(false);
      return;
    }
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setData(await loadFriends());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Impossible de charger ton Cercle.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [previewState]);

  useEffect(() => { void load(); }, [load]);

  const runSearch = useCallback(async (term: string) => {
    const requestId = ++searchRequest.current;
    setSearching(true);
    setSearchError(null);
    if (previewState) {
      setResults(previewState.searchResults ?? []);
      setSearching(Boolean(previewState.searching));
      setSearchError(previewState.searchError ?? null);
      return;
    }
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
  }, [previewState]);

  useEffect(() => {
    const value = search.trim();
    if (value.length < 2) {
      searchRequest.current += 1;
      setResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    const timer = setTimeout(() => { void runSearch(value); }, previewMode ? 0 : 280);
    return () => clearTimeout(timer);
  }, [previewMode, runSearch, search]);

  async function act(id: string, kind: 'add' | 'accept' | 'reject' | 'remove' | 'cancel') {
    const searchPlayer = results.find((result) => result.id === id);
    const player = searchPlayer
      ?? [...data.amis, ...data.recues, ...data.envoyees].find((candidate) => candidate.id === id);
    const pseudo = player?.pseudo ?? 'Ce joueur';
    setBusy(id);
    setError(null);
    try {
      if (previewMode) {
        setData((current) => applyPreviewAction(current, id, kind, searchPlayer));
        setResults((current) => updatePreviewResults(current, id, kind));
        showSnackbar({ message: circleActionMessage(kind, pseudo), tone: 'success' });
        return true;
      }
      if (kind === 'add') await requestFriend(id);
      else if (kind === 'accept') await answerFriendRequest(id, true);
      else if (kind === 'reject') await answerFriendRequest(id, false);
      else await removeFriend(id);
      await load();
      if (search.trim().length >= 2) await runSearch(search.trim());
      showSnackbar({ message: circleActionMessage(kind, pseudo), tone: 'success' });
      return true;
    } catch (caught) {
      showSnackbar({
        message: caught instanceof Error ? caught.message : 'Cette action n’a pas pu être synchronisée.',
        tone: 'error',
      });
      return false;
    } finally {
      setBusy(null);
    }
  }

  const closeFriendActions = useCallback(() => {
    setSelectedFriend(null);
    setConfirmRemoval(false);
  }, []);

  const openProfile = useCallback((pseudo: string) => {
    actionReturnRef.current = null;
    closeFriendActions();
    router.push({ pathname: '/u/[pseudo]', params: { pseudo } });
  }, [closeFriendActions]);

  const challengePlayer = useCallback((player: Pick<CircleWeeklyRow, 'id' | 'pseudo'>) => {
    actionReturnRef.current = null;
    closeFriendActions();
    router.push({
      pathname: '/(tabs)/matches',
      params: { duelRivalId: player.id, duelRivalPseudo: player.pseudo },
    });
  }, [closeFriendActions]);

  const openFriendActions = useCallback((friend: FriendRow, target: View | null) => {
    actionReturnRef.current = target;
    setConfirmRemoval(false);
    setSelectedFriend(friend);
  }, []);

  async function removeSelectedFriend() {
    if (!selectedFriend) return;
    if (!confirmRemoval) {
      setConfirmRemoval(true);
      return;
    }
    const id = selectedFriend.id;
    const removed = await act(id, 'remove');
    if (removed) {
      actionReturnRef.current = null;
      closeFriendActions();
    }
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
        showSnackbar({ message: 'Carte copiée, prête à être partagée.', tone: 'success' });
      } else {
        await Share.share({ message: shareText, ...(url ? { url } : {}) });
        showSnackbar({ message: 'Ta carte est prête à être partagée.', tone: 'success' });
      }
    } catch {
      showSnackbar({ message: 'Le partage a été interrompu. Réessaie depuis ta semaine.', tone: 'error' });
    }
  }

  const pendingCount = data.recues.length + data.envoyees.length;
  const viewItems: readonly SegmentedControlItem<CircleView>[] = [
    { value: 'activity', label: 'ACTIVITÉ', badge: pendingCount || undefined },
    { value: 'friends', label: 'TOUS LES AMIS' },
  ];
  const header = (
    <CircleHeader
      focusRequests={focusRequests}
      items={viewItems}
      onChange={setView}
      view={view}
    />
  );
  const hasContent = Boolean(data.weekly || data.amis.length || data.recues.length || data.envoyees.length);
  const errorState = error ? (
    <StateView
      action={{ label: 'RÉESSAYER', onPress: () => void load() }}
      compact
      description={error}
      testID="circle-error-state"
      title="Ton Cercle ne répond pas."
      variant="error"
    />
  ) : null;

  return (
    <View style={styles.root}>
      {view === 'activity' ? (
        <ScrollView
          contentContainerStyle={[styles.activityContent, isShortLandscape && styles.activityContentLandscape]}
          refreshControl={(
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.volt} />
          )}
          showsVerticalScrollIndicator={false}
          testID="circle-activity-scroll"
        >
          {header}
          {errorState}
          {!error || hasContent ? (
            <CircleActivityView
              busy={busy}
              data={data}
              focusRequests={focusRequests}
              loading={loading}
              onAccept={(id) => void act(id, 'accept')}
              onCancel={(id) => void act(id, 'cancel')}
              onChallenge={challengePlayer}
              onOpenMatches={() => router.push('/(tabs)/matches')}
              onOpenProfile={openProfile}
              onReject={(id) => void act(id, 'reject')}
              onShare={() => void sharePerformance()}
            />
          ) : null}
        </ScrollView>
      ) : (
        <CircleDirectoryView
          busy={busy}
          data={data}
          hasError={Boolean(error)}
          header={(
            <>
              {header}
              {errorState}
            </>
          )}
          loading={loading}
          onChangeSearch={setSearch}
          onOpenActions={openFriendActions}
          onOpenProfile={openProfile}
          onRefresh={() => void load(true)}
          onSearchAction={(player) => void act(
            player.id,
            player.relation === 'demande_recue'
              ? 'accept'
              : player.relation === 'demande_envoyee'
                ? 'cancel'
                : 'add',
          )}
          refreshing={refreshing}
          results={results}
          search={search}
          searchError={searchError}
          searching={searching}
        />
      )}

      <BaseSheet
        dismissible={!selectedFriend || busy !== selectedFriend.id}
        eyebrow="ACTIONS DU CERCLE"
        footer={selectedFriend ? (
          <View style={styles.sheetFooter}>
            {confirmRemoval ? (
              <Text accessibilityLiveRegion="polite" style={styles.removalWarning}>
                {selectedFriend.pseudo} ne figurera plus dans tes classements privés.
              </Text>
            ) : null}
            <Button
              accessibilityLabel={confirmRemoval
                ? `Confirmer le retrait de ${selectedFriend.pseudo}`
                : `Retirer ${selectedFriend.pseudo} de mon Cercle`}
              fullWidth
              label={confirmRemoval ? 'CONFIRMER LE RETRAIT' : 'RETIRER DU CERCLE'}
              loading={busy === selectedFriend.id}
              onPress={() => void removeSelectedFriend()}
              variant="destructive"
            />
          </View>
        ) : null}
        onClose={closeFriendActions}
        returnFocusRef={actionReturnRef}
        scrollable={false}
        size="medium"
        testID="circle-friend-actions-sheet"
        title={selectedFriend?.pseudo ?? 'Actions'}
        visible={Boolean(selectedFriend)}
      >
        {selectedFriend ? (
          <View style={styles.sheetActions}>
            <Button
              disabled={busy === selectedFriend.id}
              fullWidth
              label="VOIR LE PROFIL"
              onPress={() => openProfile(selectedFriend.pseudo)}
              variant="secondary"
            />
            <Button
              disabled={busy === selectedFriend.id}
              fullWidth
              label="DÉFIER SUR UN MATCH"
              onPress={() => challengePlayer(selectedFriend)}
              variant="secondary"
            />
          </View>
        ) : null}
      </BaseSheet>
    </View>
  );
}

function CircleHeader({
  focusRequests,
  items,
  onChange,
  view,
}: {
  focusRequests: boolean;
  items: readonly SegmentedControlItem<CircleView>[];
  onChange: (view: CircleView) => void;
  view: CircleView;
}) {
  const { isShortLandscape } = useResponsiveLayout();
  const title = view === 'friends'
    ? 'TOUS TES AMIS.'
    : focusRequests
      ? 'TES DEMANDES.'
      : 'L’ACTIVITÉ DU CERCLE.';
  const subtitle = view === 'friends'
    ? 'Trouve un pseudo, ouvre un profil ou prépare une rivalité.'
    : focusRequests
      ? 'Réponds aux invitations avant de reprendre le fil de la semaine.'
      : 'Ta semaine, les nouvelles demandes et les rivalités qui progressent.';

  return (
    <View style={[styles.header, isShortLandscape && styles.headerLandscape]}>
      <View style={[styles.headerCopy, isShortLandscape && styles.headerCopyLandscape]}>
        <Text style={styles.eyebrow}>SOCIAL // CERCLE</Text>
        <Text style={[styles.title, isShortLandscape && styles.titleLandscape]}>{title}</Text>
        <Text numberOfLines={isShortLandscape ? 2 : undefined} style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.segmentWrap, isShortLandscape && styles.segmentWrapLandscape]}>
        <SegmentedControl
          accessibilityLabel="Vue du Cercle"
          items={items}
          onChange={onChange}
          testID="circle-view-switch"
          value={view}
        />
      </View>
    </View>
  );
}

function applyPreviewAction(
  data: FriendsData,
  id: string,
  kind: 'add' | 'accept' | 'reject' | 'remove' | 'cancel',
  player?: PlayerSearchRow,
): FriendsData {
  if (kind === 'accept') {
    const accepted = data.recues.find((friend) => friend.id === id);
    return {
      ...data,
      amis: accepted ? [...data.amis, accepted] : data.amis,
      recues: data.recues.filter((friend) => friend.id !== id),
    };
  }
  if (kind === 'reject') return { ...data, recues: data.recues.filter((friend) => friend.id !== id) };
  if (kind === 'cancel') return { ...data, envoyees: data.envoyees.filter((friend) => friend.id !== id) };
  if (kind === 'remove') return { ...data, amis: data.amis.filter((friend) => friend.id !== id) };
  if (kind === 'add' && player) {
    return {
      ...data,
      envoyees: [...data.envoyees, { id: player.id, pseudo: player.pseudo }],
    };
  }
  return data;
}

function circleActionMessage(
  kind: 'add' | 'accept' | 'reject' | 'remove' | 'cancel',
  pseudo: string,
) {
  if (kind === 'add') return `Demande envoyée à ${pseudo}.`;
  if (kind === 'accept') return `${pseudo} rejoint ton Cercle.`;
  if (kind === 'reject') return `Demande de ${pseudo} refusée.`;
  if (kind === 'remove') return `${pseudo} a été retiré de ton Cercle.`;
  return `Demande à ${pseudo} annulée.`;
}

function updatePreviewResults(
  results: PlayerSearchRow[],
  id: string,
  kind: 'add' | 'accept' | 'reject' | 'remove' | 'cancel',
) {
  return results.map((player) => {
    if (player.id !== id) return player;
    if (kind === 'add') return { ...player, relation: 'demande_envoyee' };
    if (kind === 'accept') return { ...player, relation: 'ami' };
    if (kind === 'cancel' || kind === 'reject') return { ...player, relation: 'aucune' };
    return player;
  });
}

function signed(value: number) {
  const amount = Number(value || 0);
  return `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${Math.abs(amount)}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  activityContent: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: layout.tabBarContentInset,
    gap: spacing.lg,
  },
  activityContentLandscape: {
    maxWidth: layout.wideContentMaxWidth,
    gap: 12,
  },
  header: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  headerLandscape: {
    paddingTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  headerCopy: {
    gap: spacing.xs,
  },
  headerCopyLandscape: { flex: 1, minWidth: 0 },
  eyebrow: {
    ...typography.control,
    color: colors.volt,
  },
  title: {
    ...typography.displayMedium,
    maxWidth: 390,
    color: colors.text,
  },
  titleLandscape: { fontSize: 32, lineHeight: 34 },
  subtitle: {
    ...typography.bodyComfort,
    maxWidth: 390,
    color: colors.textSecondary,
  },
  segmentWrap: { width: '100%' },
  segmentWrapLandscape: { width: 220, flexShrink: 0 },
  sheetActions: {
    gap: spacing.sm,
  },
  sheetFooter: {
    gap: spacing.sm,
  },
  removalWarning: {
    ...typography.bodyComfort,
    color: colors.liveText,
    textAlign: 'center',
  },
});
