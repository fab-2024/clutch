import Swords from 'lucide-react-native/icons/swords';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { FEATURE_STATE_COPY } from '@/src/components/ui/FeatureStateView';
import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { StateView } from '@/src/components/ui/StateView';
import { Surface } from '@/src/components/ui/Surface';
import { CosmeticAvatar } from '@/src/features/shop/components/CosmeticRenderer';
import { useCosmetics } from '@/src/providers/CosmeticsProvider';
import { colors, layout, radius, spacing, typography } from '@/src/theme';

import type { CircleWeeklyData, CircleWeeklyRow, FriendRow, FriendsData } from '../types';

const RANKING_PAGE_SIZE = 10;

type CircleActivityViewProps = {
  busy: string | null;
  data: FriendsData;
  focusRequests: boolean;
  loading: boolean;
  onAccept: (id: string) => void;
  onCancel: (id: string) => void;
  onChallenge: (player: CircleWeeklyRow) => void;
  onOpenMatches: () => void;
  onOpenProfile: (pseudo: string) => void;
  onReject: (id: string) => void;
  onShare: () => void;
};

export default function CircleActivityView(props: CircleActivityViewProps) {
  if (props.loading) return <CircleActivitySkeleton />;

  const performance = (
    <WeeklyPerformanceCard
      onOpenMatches={props.onOpenMatches}
      onShare={props.onShare}
      weekly={props.data.weekly}
    />
  );
  const requests = <FriendRequestsSection {...props} />;

  return (
    <View style={styles.activity} testID="circle-activity-view">
      {props.focusRequests ? requests : performance}
      {props.focusRequests ? performance : requests}
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
      <View style={[styles.skeleton, styles.performanceSkeleton]}>
        <View style={styles.skeletonHeading}>
          <Skeleton height={9} radius="pill" width={84} />
          <Skeleton height={9} radius="pill" tone="subtle" width={74} />
        </View>
        <View style={styles.skeletonRank}>
          <Skeleton height={58} radius="md" width={78} />
          <Skeleton height={24} radius="sm" tone="subtle" width={88} />
        </View>
        <View style={styles.skeletonMetrics}>
          {[0, 1, 2].map((item) => <Skeleton height={48} key={item} radius="md" width="29%" />)}
        </View>
        <Skeleton height={44} radius="md" width="100%" />
      </View>
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

function WeeklyPerformanceCard({
  onOpenMatches,
  onShare,
  weekly,
}: {
  onOpenMatches: () => void;
  onShare: () => void;
  weekly: CircleWeeklyData | null;
}) {
  const me = weekly?.moi;
  if (!me) {
    return (
      <StateView
        action={{ label: 'FAIRE UN CALL', onPress: onOpenMatches }}
        compact
        description="Tes calls réglés et ceux de tes amis apparaîtront ici du lundi au dimanche."
        testID="circle-weekly-empty"
        title="Le classement démarre avec ton premier verdict."
        variant="empty"
      />
    );
  }

  const precision = me.precision_pct == null ? '—' : `${Math.round(me.precision_pct)}%`;
  const accessibilityLabel = `Cette semaine, rang ${me.rang} sur ${me.participants}, ${signed(me.frags_hebdo)} Frags, ${me.victoires} victoires sur ${me.calls} calls, ${precision} de réussite`;

  return (
    <View style={styles.performanceCard} testID="circle-performance-card">
      <View style={styles.performanceAccent} />
      <View accessible accessibilityLabel={accessibilityLabel}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={styles.performanceTop}>
            <View>
              <Text style={styles.sectionEyebrow}>TA SEMAINE</Text>
              <Text style={styles.performancePeriod}>{weekLabel(weekly)}</Text>
            </View>
            <Text style={styles.performanceWeek}>{weekly?.semaine || 'SEMAINE EN COURS'}</Text>
          </View>

          <View style={styles.performanceRankRow}>
            <Text style={styles.performanceRank}>#{me.rang}</Text>
            <Text style={styles.performanceOf}>SUR {me.participants}{'\n'}DANS TON CERCLE</Text>
          </View>

          <View style={styles.performanceStats}>
            <WeeklyStat accent label="FRAGS" value={signed(me.frags_hebdo)} />
            <View style={styles.performanceDivider} />
            <WeeklyStat label="CALLS" value={`${me.victoires}/${me.calls}`} />
            <View style={styles.performanceDivider} />
            <WeeklyStat label="RÉUSSITE" value={precision} />
          </View>
        </View>
      </View>

      <Button
        accessibilityLabel="Partager mon bilan de la semaine"
        fullWidth
        label="PARTAGER MON BILAN"
        onPress={onShare}
        size="compact"
        variant="secondary"
      />
    </View>
  );
}

function WeeklyStat({ accent = false, label, value }: { accent?: boolean; label: string; value: string }) {
  return (
    <View style={styles.weeklyStat}>
      <Text style={[styles.weeklyStatValue, accent && styles.weeklyStatValueAccent]}>{value}</Text>
      <Text style={styles.weeklyStatLabel}>{label}</Text>
    </View>
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
  const { equipped } = useCosmetics();
  const [visibleCount, setVisibleCount] = useState(RANKING_PAGE_SIZE);
  useEffect(() => setVisibleCount(RANKING_PAGE_SIZE), [weekly?.semaine]);
  if (!weekly?.classement.length) return null;
  const visibleRanking = weekly.classement.slice(0, visibleCount);

  return (
    <View style={styles.section} testID="circle-weekly-ranking">
      <SectionHeading
        eyebrow="ACTIVITÉ"
        meta={`${weekly.classement.length} JOUEURS`}
        title="CLASSEMENT DE LA SEMAINE"
      />
      <Surface border="subtle" padding="none" radius="lg" tone="low">
        {visibleRanking.map((player, index) => (
          <View
            key={player.id}
            style={[
              styles.rankingRow,
              player.moi && styles.rankingRowMine,
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
              {player.moi ? (
                <CosmeticAvatar cosmetics={equipped} label={player.pseudo} size={36} />
              ) : <Avatar pseudo={player.pseudo} small />}
              <View style={styles.rankingCopy}>
                <Text numberOfLines={1} style={styles.rankingName}>{player.moi ? 'TOI' : player.pseudo}</Text>
                <Text style={styles.rankingMeta}>
                  {player.victoires}/{player.calls} calls · {player.precision_pct == null ? '—' : `${Math.round(player.precision_pct)}%`}
                </Text>
              </View>
            </Pressable>
            <Text style={[styles.rankingDelta, player.frags_hebdo < 0 && styles.rankingDeltaLoss]}>
              {signed(player.frags_hebdo)}
            </Text>
            {!player.moi ? (
              <Pressable
                accessibilityLabel={`Défier ${player.pseudo}`}
                accessibilityRole="button"
                onPress={() => onChallenge(player)}
                style={({ pressed }) => [styles.challengeButton, pressed && styles.pressed]}
              >
                <Swords color={colors.volt} size={19} strokeWidth={2.1} />
              </Pressable>
            ) : null}
          </View>
        ))}

        {visibleRanking.length < weekly.classement.length ? (
          <View style={styles.rankingMore}>
            <Button
              fullWidth
              label={`VOIR LA SUITE · ${visibleRanking.length}/${weekly.classement.length}`}
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

function weekLabel(weekly: CircleWeeklyData | null) {
  if (!weekly?.debut || !weekly.fin) return 'SEMAINE EN COURS';
  const start = new Date(weekly.debut);
  const end = new Date(new Date(weekly.fin).getTime() - 1);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return 'SEMAINE EN COURS';
  return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`.toUpperCase();
}

const styles = StyleSheet.create({
  activity: {
    gap: spacing.lg,
  },
  performanceCard: {
    position: 'relative',
    overflow: 'hidden',
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  performanceAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.volt,
  },
  performanceTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  performancePeriod: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textSecondary,
  },
  performanceWeek: {
    ...typography.metadata,
    flexShrink: 1,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  performanceRankRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  performanceRank: {
    ...typography.displayLarge,
    color: colors.text,
  },
  performanceOf: {
    ...typography.control,
    marginBottom: 2,
    color: colors.textSecondary,
  },
  performanceStats: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  weeklyStat: {
    minWidth: 68,
    alignItems: 'center',
  },
  weeklyStatValue: {
    ...typography.metricSmall,
    color: colors.text,
  },
  weeklyStatValueAccent: {
    color: colors.volt,
  },
  weeklyStatLabel: {
    ...typography.metadata,
    marginTop: 2,
    color: colors.textSecondary,
  },
  performanceDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderSubtle,
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
  rankingRowMine: {
    backgroundColor: colors.surfaceInteractive,
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
  performanceSkeleton: {
    minHeight: 268,
    padding: spacing.md,
    justifyContent: 'space-between',
    borderRadius: radius.lg,
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
  skeletonRank: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  skeletonMetrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skeletonRequestRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  skeletonRequestCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  skeletonRankingRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pressed: {
    opacity: 0.76,
  },
});
