import Ellipsis from 'lucide-react-native/icons/ellipsis';
import Search from 'lucide-react-native/icons/search';
import type { ReactNode, RefObject } from 'react';
import { memo, useCallback, useRef } from 'react';
import type { ListRenderItemInfo } from 'react-native';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { StateView } from '@/src/components/ui/StateView';
import { Surface } from '@/src/components/ui/Surface';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

import type { FriendRow, FriendsData, PlayerSearchRow } from '../types';

type CircleDirectoryViewProps = {
  busy: string | null;
  data: FriendsData;
  hasError: boolean;
  header: ReactNode;
  loading: boolean;
  onChangeSearch: (value: string) => void;
  onOpenActions: (friend: FriendRow, target: View | null) => void;
  onOpenProfile: (pseudo: string) => void;
  onRefresh: () => void;
  onSearchAction: (player: PlayerSearchRow) => void;
  refreshing: boolean;
  results: PlayerSearchRow[];
  search: string;
  searchError: string | null;
  searching: boolean;
};

export default function CircleDirectoryView({
  busy,
  data,
  hasError,
  header,
  loading,
  onChangeSearch,
  onOpenActions,
  onOpenProfile,
  onRefresh,
  onSearchAction,
  refreshing,
  results,
  search,
  searchError,
  searching,
}: CircleDirectoryViewProps) {
  const inputRef = useRef<TextInput>(null);

  const renderFriend = useCallback(({ item }: ListRenderItemInfo<FriendRow>) => {
    return (
      <FriendListRow
        busy={busy === item.id}
        friend={item}
        onOpenActions={onOpenActions}
        onOpenProfile={onOpenProfile}
      />
    );
  }, [busy, onOpenActions, onOpenProfile]);

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={loading ? [] : data.amis}
      initialNumToRender={10}
      keyboardShouldPersistTaps="handled"
      keyExtractor={(friend) => friend.id}
      ListEmptyComponent={loading ? (
        <DirectorySkeleton />
      ) : hasError ? null : (
        <StateView
          action={{ label: 'CHERCHER UN JOUEUR', onPress: () => inputRef.current?.focus() }}
          description="Recherche un pseudo pour lancer ta première rivalité."
          testID="circle-friends-empty"
          title="Ton Cercle attend son premier allié."
          variant="empty"
        />
      )}
      ListHeaderComponent={(
        <View style={styles.header}>
          {header}
          <SearchPanel
            busy={busy}
            inputRef={inputRef}
            onAction={onSearchAction}
            onChangeSearch={onChangeSearch}
            onOpenProfile={onOpenProfile}
            results={results}
            search={search}
            searchError={searchError}
            searching={searching}
          />
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionEyebrow}>RÉPERTOIRE</Text>
              <Text style={styles.sectionTitle}>TOUS TES AMIS</Text>
            </View>
            <Text style={styles.sectionMeta}>{loading ? '—' : `${data.amis.length} JOUEUR${data.amis.length === 1 ? '' : 'S'}`}</Text>
          </View>
        </View>
      )}
      maxToRenderPerBatch={10}
      refreshControl={(
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.volt} />
      )}
      renderItem={renderFriend}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      style={styles.root}
      testID="circle-directory-view"
      windowSize={7}
    />
  );
}

function SearchPanel({
  busy,
  inputRef,
  onAction,
  onChangeSearch,
  onOpenProfile,
  results,
  search,
  searchError,
  searching,
}: {
  busy: string | null;
  inputRef: RefObject<TextInput | null>;
  onAction: (player: PlayerSearchRow) => void;
  onChangeSearch: (value: string) => void;
  onOpenProfile: (pseudo: string) => void;
  results: PlayerSearchRow[];
  search: string;
  searchError: string | null;
  searching: boolean;
}) {
  const hasQuery = search.trim().length >= 2;
  return (
    <Surface border="subtle" padding="md" radius="lg" tone="low" testID="circle-search-panel">
      <Text style={styles.searchEyebrow}>AGRANDIR TON CERCLE</Text>
      <Text style={styles.searchTitle}>Trouve un joueur.</Text>
      <View style={styles.searchInputShell}>
        <Search color={colors.textSecondary} size={19} strokeWidth={2} />
        <TextInput
          accessibilityLabel="Chercher un joueur par pseudo"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onChangeSearch}
          placeholder="Chercher un pseudo…"
          placeholderTextColor={colors.textDisabled}
          ref={inputRef}
          returnKeyType="search"
          style={styles.searchInput}
          value={search}
        />
      </View>

      {searching ? (
        <Text accessibilityLiveRegion="polite" style={styles.searchState}>RECHERCHE…</Text>
      ) : null}
      {searchError ? (
        <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.searchError}>{searchError}</Text>
      ) : null}
      {!searching && hasQuery && !searchError && !results.length ? (
        <Text accessibilityLiveRegion="polite" style={styles.searchState}>AUCUN JOUEUR TROUVÉ</Text>
      ) : null}

      {results.map((player, index) => (
        <SearchResultRow
          busy={busy === player.id}
          index={index}
          key={player.id}
          onAction={() => onAction(player)}
          onOpen={() => onOpenProfile(player.pseudo)}
          player={player}
        />
      ))}
    </Surface>
  );
}

function SearchResultRow({
  busy,
  index,
  onAction,
  onOpen,
  player,
}: {
  busy: boolean;
  index: number;
  onAction: () => void;
  onOpen: () => void;
  player: PlayerSearchRow;
}) {
  const actionable = player.relation !== 'ami';
  const actionLabel = player.relation === 'demande_recue'
    ? 'ACCEPTER'
    : player.relation === 'demande_envoyee'
      ? 'ANNULER'
      : 'AJOUTER';
  return (
    <View style={[styles.searchResult, index > 0 && styles.searchResultSeparated]}>
      <Pressable
        accessibilityLabel={`Voir le profil de ${player.pseudo}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.searchIdentity, pressed && styles.pressed]}
      >
        <Avatar pseudo={player.pseudo} small />
        <Text numberOfLines={1} style={styles.searchName}>{player.pseudo}</Text>
      </Pressable>
      {actionable ? (
        <Button
          accessibilityLabel={`${actionLabel.toLowerCase()} ${player.pseudo}`}
          disabled={busy}
          label={actionLabel}
          onPress={onAction}
          size="compact"
          variant={player.relation === 'demande_envoyee' ? 'ghost' : 'secondary'}
        />
      ) : (
        <Button label="VOIR" onPress={onOpen} size="compact" variant="ghost" />
      )}
    </View>
  );
}

const FriendListRow = memo(function FriendListRow({
  busy,
  friend,
  onOpenActions,
  onOpenProfile,
}: {
  busy: boolean;
  friend: FriendRow;
  onOpenActions: (friend: FriendRow, target: View | null) => void;
  onOpenProfile: (pseudo: string) => void;
}) {
  const actionRef = useRef<View>(null);
  const calls = Number(friend.paris ?? 0);
  const wins = Number(friend.gagnes ?? 0);
  const precision = calls ? Math.round((wins / calls) * 100) : null;
  const accessibilityLabel = `${friend.pseudo}, ${format(friend.solde ?? 1000)} Frags, ${calls} pronostics, ${precision == null ? 'aucune précision disponible' : `${precision}% de réussite`}`;

  return (
    <View style={styles.friendRow}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={() => onOpenProfile(friend.pseudo)}
        style={({ pressed }) => [styles.friendIdentity, pressed && styles.pressed]}
      >
        <Avatar pseudo={friend.pseudo} />
        <View style={styles.friendCopy}>
          <View style={styles.friendNameRow}>
            <Text numberOfLines={1} style={styles.friendName}>{friend.pseudo}</Text>
            {friend.tag_favori ? <Text style={styles.friendTeam}>{friend.tag_favori}</Text> : null}
          </View>
          <Text numberOfLines={1} style={styles.friendMeta}>
            {format(friend.solde ?? 1000)} Frags · {calls} pronostic{calls === 1 ? '' : 's'}
          </Text>
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.precision}>
          <Text style={styles.precisionValue}>{precision == null ? '—' : `${precision}%`}</Text>
          <Text style={styles.precisionLabel}>RÉUSSITE</Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={`Actions pour ${friend.pseudo}`}
        accessibilityRole="button"
        accessibilityState={{ busy }}
        disabled={busy}
        onPress={() => onOpenActions(friend, actionRef.current)}
        ref={actionRef}
        style={({ pressed }) => [styles.moreButton, busy && styles.disabled, pressed && styles.pressed]}
      >
        <Ellipsis color={colors.textSecondary} size={21} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
});

function DirectorySkeleton() {
  return (
    <SkeletonGroup
      label="Chargement de la liste d’amis"
      style={styles.directorySkeleton}
      testID="circle-directory-loading"
    >
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.skeletonRow}>
          <Skeleton height={44} radius="pill" width={44} />
          <View style={styles.skeletonCopy}>
            <Skeleton height={14} radius="pill" width="54%" />
            <Skeleton height={9} radius="pill" tone="subtle" width="72%" />
          </View>
          <Skeleton height={30} radius="sm" width={58} />
          <Skeleton height={44} radius="md" tone="subtle" width={44} />
        </View>
      ))}
    </SkeletonGroup>
  );
}

function Avatar({ pseudo, small = false }: { pseudo: string; small?: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, small && styles.avatarSmall]}
    >
      <Text style={styles.avatarText}>{initials(pseudo)}</Text>
    </View>
  );
}

function initials(value: string) {
  const parts = value.trim().split(/[\s._-]+/).filter(Boolean);
  return parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (parts[0] || '?').slice(0, 2).toUpperCase();
}

function format(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: layout.tabBarContentInset,
  },
  header: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchEyebrow: {
    ...typography.control,
    color: colors.volt,
  },
  searchTitle: {
    ...typography.sectionTitle,
    marginTop: 2,
    color: colors.text,
  },
  searchInputShell: {
    minHeight: layout.controlHeight,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  searchInput: {
    ...typography.bodyComfortStrong,
    flex: 1,
    minWidth: 0,
    minHeight: layout.controlHeight,
    color: colors.text,
  },
  searchState: {
    ...typography.metadata,
    marginTop: spacing.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  searchError: {
    ...typography.bodyComfort,
    marginTop: spacing.sm,
    color: colors.liveText,
  },
  searchResult: {
    minHeight: 66,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchResultSeparated: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  searchIdentity: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchName: {
    ...typography.bodyComfortStrong,
    flex: 1,
    color: colors.text,
  },
  sectionHeading: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionEyebrow: {
    ...typography.control,
    color: colors.volt,
  },
  sectionTitle: {
    ...typography.cardTitle,
    marginTop: 2,
    color: colors.text,
  },
  sectionMeta: {
    ...typography.metadata,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  friendRow: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  friendIdentity: {
    flex: 1,
    minWidth: 0,
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  friendCopy: {
    flex: 1,
    minWidth: 0,
  },
  friendNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  friendName: {
    ...typography.bodyComfortStrong,
    flexShrink: 1,
    color: colors.text,
  },
  friendTeam: {
    ...typography.metadata,
    color: colors.volt,
  },
  friendMeta: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textSecondary,
  },
  precision: {
    alignItems: 'flex-end',
  },
  precisionValue: {
    ...typography.cardTitle,
    color: colors.text,
  },
  precisionLabel: {
    ...typography.metadata,
    color: colors.textSecondary,
  },
  moreButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceInteractive,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  avatarSmall: {
    width: 36,
    height: 36,
  },
  avatarText: {
    ...typography.control,
    color: colors.volt,
  },
  directorySkeleton: {
    gap: 1,
  },
  skeletonRow: {
    minHeight: 82,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
  },
  skeletonCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  disabled: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.76,
  },
});
