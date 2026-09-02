import Swords from 'lucide-react-native/icons/swords';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { FEATURE_STATE_COPY } from '@/src/components/ui/FeatureStateView';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { Surface } from '@/src/components/ui/Surface';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

import type { CircleWeeklyData, CircleWeeklyRow, FriendRow, FriendsData } from '../types';

const RANKING_PAGE_SIZE = 10;

type CircleActivityViewProps = {
  busy: string | null;
  data: FriendsData;
  loading: boolean;
  onAccept: (id: string) => void;
  onCancel: (id: string) => void;
  onChallenge: (player: CircleWeeklyRow) => void;
  onOpenProfile: (pseudo: string) => void;
  onReject: (id: string) => void;
};

export default function CircleActivityView(props: CircleActivityViewProps) {
  if (props.loading) return <CircleActivitySkeleton />;

  const requests = <FriendRequestsSection {...props} />;

  return (
    <View style={styles.activity} testID="circle-activity-view">
      {requests}
      <WeeklyRanking
        onChallenge={props.onChallenge}
        onOpen={props.onOpenProfile}
        weekly={props.data.weekly}
      />
    </View>
  );
}

function CircleActivitySkeleton() {
  return (
    <SkeletonGroup
      label={FEATURE_STATE_COPY.circle.loading.title}
      style={styles.activity}
      testID="circle-activity-loading"
    >
      <View style={[styles.skeleton, styles.requestsSkeleton]}>
        <View style={styles.skeletonHeading}>
          <Skeleton height={10} radius="pill" width={112} />
          <Skeleton height={24} radius="pill" width={34} />
        </View>
        <View style={styles.skeletonRequestRow}>
          <Skeleton height={44} radius="pill" width={44} />
          <View style={styles.skeletonRequestCopy}>
            <Skeleton height={14} radius="pill" width="62%" />
            <Skeleton height={8} radius="pill" tone="subtle" width="42%" />
          </View>
          <Skeleton height={38} radius="md" width={84} />
        </View>
      </View>
      <View style={[styles.skeleton, styles.rankingSkeleton]}>
        <View style={styles.skeletonHeading}>
          <View style={styles.skeletonRequestCopy}>
            <Skeleton height={9} radius="pill" width={96} />
            <Skeleton height={20} radius="sm" width={164} />
          </View>
          <Skeleton height={10} radius="pill" tone="subtle" width={54} />
        </View>
        {[0, 1, 2].map((item) => (
          <View key={item} style={styles.skeletonRankingRow}>
            <Skeleton height={24} radius="sm" width={30} />
            <Skeleton height={40} radius="pill" width={40} />
            <View style={styles.skeletonRequestCopy}>
              <Skeleton height={13} radius="pill" width="58%" />
              <Skeleton height={8} radius="pill" tone="subtle" width="36%" />
            </View>
            <Skeleton height={20} radius="sm" width={48} />
          </View>
        ))}
      </View>
    </SkeletonGroup>
  );
}

function FriendRequestsSection({
  busy,
  data,
  onAccept,
  onCancel,
  onOpenProfile,
  onReject,
}: CircleActivityViewProps) {
  const pendingCount = data.recues.length + data.envoyees.length;
  return (
    <View style={styles.section} testID="circle-requests-section">
      <SectionHeading
        eyebrow="DEMANDES"
        meta={pendingCount ? `${pendingCount} EN ATTENTE` : 'À JOUR'}
        title="QUI ENTRE DANS TON CERCLE ?"
      />

      <Surface border="subtle" padding="none" radius="lg" tone="low">
        {data.recues.map((friend, index) => (
          <RequestRow
            disabled={busy === friend.id}
            friend={friend}
            key={friend.id}
            onAccept={() => onAccept(friend.id)}
            onOpen={() => onOpenProfile(friend.pseudo)}
            onReject={() => onReject(friend.id)}
            separated={index > 0}
          />
        ))}

        {data.envoyees.map((friend, index) => (
          <PendingRow
            disabled={busy === friend.id}
            friend={friend}
            key={friend.id}
            onCancel={() => onCancel(friend.id)}
            onOpen={() => onOpenProfile(friend.pseudo)}
            separated={data.recues.length > 0 || index > 0}
          />
        ))}

        {!pendingCount ? (
          <View style={styles.requestsEmpty}>
            <View style={styles.requestsEmptyDot} />
            <View style={styles.requestsEmptyCopy}>
              <Text style={styles.requestsEmptyTitle}>AUCUNE DEMANDE EN ATTENTE</Text>
              <Text style={styles.requestsEmptyText}>Ton Cercle est à jour.</Text>
            </View>
          </View>
        ) : null}
      </Surface>
    </View>
  );
}

function RequestRow({
  disabled,
  friend,
  onAccept,
  onOpen,
  onReject,
  separated,
}: {
  disabled: boolean;
  friend: FriendRow;
  onAccept: () => void;
  onOpen: () => void;
  onReject: () => void;
  separated: boolean;
}) {
  return (
    <View style={[styles.requestRow, separated && styles.rowSeparated]}>
      <Pressable
        accessibilityLabel={`Voir le profil de ${friend.pseudo}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.requestIdentity, pressed && styles.pressed]}
      >
        <Avatar pseudo={friend.pseudo} />
        <View style={styles.requestCopy}>
          <Text numberOfLines={1} style={styles.requestName}>{friend.pseudo}</Text>
          <Text style={styles.requestMeta}>veut rejoindre ton Cercle</Text>
        </View>
      </Pressable>
      <View style={styles.requestActions}>
        <View style={styles.requestAction}>
          <Button
            accessibilityLabel={`Refuser la demande de ${friend.pseudo}`}
            disabled={disabled}
            fullWidth
            label="REFUSER"
            onPress={onReject}
            size="compact"
            variant="ghost"
          />
        </View>
        <View style={styles.requestAction}>
          <Button
            accessibilityLabel={`Accepter la demande de ${friend.pseudo}`}
            disabled={disabled}
            fullWidth
            label="ACCEPTER"
            onPress={onAccept}
            size="compact"
          />
        </View>
      </View>
    </View>
  );
}

function PendingRow({
  disabled,
  friend,
  onCancel,
  onOpen,
  separated,
}: {
  disabled: boolean;
  friend: FriendRow;
  onCancel: () => void;
  onOpen: () => void;
  separated: boolean;
}) {
  return (
    <View style={[styles.pendingRow, separated && styles.rowSeparated]}>
      <Pressable
        accessibilityLabel={`Voir le profil de ${friend.pseudo}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [styles.pendingIdentity, pressed && styles.pressed]}
      >
        <Avatar pseudo={friend.pseudo} small />
        <View style={styles.requestCopy}>
          <Text numberOfLines={1} style={styles.requestName}>{friend.pseudo}</Text>
          <Text style={styles.requestMeta}>demande envoyée</Text>
        </View>
      </Pressable>
      <Button
        accessibilityLabel={`Annuler la demande envoyée à ${friend.pseudo}`}
        disabled={disabled}
        label="ANNULER"
        onPress={onCancel}
        size="compact"
        variant="ghost"
      />
    </View>
  );
}

function WeeklyRanking({
  onChallenge,
  onOpen,
  weekly,
}: {
  onChallenge: (player: CircleWeeklyRow) => void;
  onOpen: (pseudo: string) => void;
  weekly: CircleWeeklyData | null;
}) {
  const [visibleCount, setVisibleCount] = useState(RANKING_PAGE_SIZE);
  useEffect(() => setVisibleCount(RANKING_PAGE_SIZE), [weekly?.semaine]);
  const ranking = weekly?.classement.filter((player) => !player.moi) ?? [];
  if (!ranking.length) return null;
  const visibleRanking = ranking.slice(0, visibleCount);

  return (
    <View style={styles.section} testID="circle-weekly-ranking">
      <SectionHeading
        eyebrow="ACTIVITÉ"
        meta={`${ranking.length} JOUEURS`}
        title="CLASSEMENT DE LA SEMAINE"
      />
      <Surface border="subtle" padding="none" radius="lg" tone="low">
        {visibleRanking.map((player, index) => (
          <View
            key={player.id}
            style={[
              styles.rankingRow,
              index > 0 && styles.rowSeparated,
            ]}
          >
            <Text style={[styles.rankingPosition, player.rang <= 3 && styles.rankingPositionTop]}>
              {String(player.rang).padStart(2, '0')}
            </Text>
            <Pressable
              accessibilityLabel={`Voir le profil de ${player.pseudo}`}
              accessibilityRole="button"
              onPress={() => onOpen(player.pseudo)}
              style={({ pressed }) => [styles.rankingIdentity, pressed && styles.pressed]}
            >
              <Avatar pseudo={player.pseudo} small />
              <View style={styles.rankingCopy}>
                <Text numberOfLines={1} style={styles.rankingName}>{player.pseudo}</Text>
                <Text style={styles.rankingMeta}>
                  {player.victoires}/{player.calls} calls · {player.precision_pct == null ? '—' : `${Math.round(player.precision_pct)}%`}
                </Text>
              </View>
            </Pressable>
            <Text style={[styles.rankingDelta, player.frags_hebdo < 0 && styles.rankingDeltaLoss]}>
              {signed(player.frags_hebdo)}
            </Text>
            <Pressable
              accessibilityLabel={`Défier ${player.pseudo}`}
              accessibilityRole="button"
              onPress={() => onChallenge(player)}
              style={({ pressed }) => [styles.challengeButton, pressed && styles.pressed]}
            >
              <Swords color={colors.volt} size={19} strokeWidth={2.1} />
            </Pressable>
          </View>
        ))}

        {visibleRanking.length < ranking.length ? (
          <View style={styles.rankingMore}>
            <Button
              fullWidth
              label={`VOIR LA SUITE · ${visibleRanking.length}/${ranking.length}`}
              onPress={() => setVisibleCount((count) => count + RANKING_PAGE_SIZE)}
              size="compact"
              variant="ghost"
            />
          </View>
        ) : null}
      </Surface>
    </View>
  );
}

function SectionHeading({ eyebrow, meta, title }: { eyebrow: string; meta: string; title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingCopy}>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionMeta}>{meta}</Text>
    </View>
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

function signed(value: number) {
  const amount = Number(value || 0);
  return `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${Math.abs(amount)}`;
}

const styles = StyleSheet.create({
  activity: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeading: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  sectionHeadingCopy: {
    flex: 1,
    minWidth: 0,
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
    flexShrink: 0,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  requestRow: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  requestIdentity: {
    minHeight: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requestCopy: {
    flex: 1,
    minWidth: 0,
  },
  requestName: {
    ...typography.bodyComfortStrong,
    color: colors.text,
  },
  requestMeta: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textSecondary,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  requestAction: {
    flex: 1,
    minWidth: 0,
  },
  pendingRow: {
    minHeight: 70,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingIdentity: {
    flex: 1,
    minWidth: 0,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowSeparated: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  requestsEmpty: {
    minHeight: 76,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requestsEmptyDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.success,
  },
  requestsEmptyCopy: {
    flex: 1,
    minWidth: 0,
  },
  requestsEmptyTitle: {
    ...typography.control,
    color: colors.text,
  },
  requestsEmptyText: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textSecondary,
  },
  rankingRow: {
    minHeight: 76,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankingPosition: {
    ...typography.control,
    width: 24,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  rankingPositionTop: {
    color: colors.volt,
  },
  rankingIdentity: {
    flex: 1,
    minWidth: 0,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankingCopy: {
    flex: 1,
    minWidth: 0,
  },
  rankingName: {
    ...typography.bodyComfortStrong,
    color: colors.text,
  },
  rankingMeta: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textSecondary,
  },
  rankingDelta: {
    ...typography.bodyComfortStrong,
    minWidth: 34,
    color: colors.volt,
    textAlign: 'right',
  },
  rankingDeltaLoss: {
    color: colors.liveText,
  },
  challengeButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInteractive,
  },
  rankingMore: {
    padding: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
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
  skeleton: {
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  requestsSkeleton: {
    minHeight: 138,
    padding: spacing.md,
    justifyContent: 'space-between',
    borderRadius: radius.lg,
  },
  rankingSkeleton: {
    minHeight: 250,
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.lg,
  },
  skeletonHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  skeletonRequestRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  skeletonRequestCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  skeletonRankingRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: {
    opacity: 0.76,
  },
});
