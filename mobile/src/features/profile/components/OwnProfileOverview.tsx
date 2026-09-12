import Pencil from 'lucide-react-native/icons/pencil';
import UserRoundPlus from 'lucide-react-native/icons/user-round-plus';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import { PlayerIdentityCard } from '../identity/PlayerIdentityCard';
import CallStreakCard from '@/src/features/retention/components/CallStreakCard';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import type { LevelFrameVariant } from '@/src/features/profile/levelFrames/types';
import { colors, radius, spacing, typography } from '@/src/theme';

import type { ProfileData } from '../types';
import ProfileOverviewSections from './ProfileOverviewSections';

type OwnProfileOverviewProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  loading: boolean;
  levelFrameVariant: LevelFrameVariant;
  onAddFriend: () => void;
  onEditAvatar: () => void;
  onModify: () => void;
  onOpenAchievements: () => void;
  onOpenJerseys: () => void;
  onOpenRank: () => void;
  onOpenShowcase: () => void;
  onOpenTrophies: () => void;
  pseudo: string;
  rankAccent: string;
  rankLabel: string;
};

export default function OwnProfileOverview({
  cosmetics,
  data,
  loading,
  onAddFriend,
  onEditAvatar,
  onModify,
  onOpenAchievements,
  onOpenJerseys,
  onOpenRank,
  onOpenShowcase,
  onOpenTrophies,
  pseudo,
  rankAccent,
  rankLabel,
}: OwnProfileOverviewProps) {
  if (loading && !data) return <ProfileOverviewSkeleton />;

  return (
    <>
      <ProfileIdentityCard
        cosmetics={cosmetics}
        data={data}
        loading={loading}
        onAddFriend={onAddFriend}
        onEditAvatar={onEditAvatar}
        onModify={onModify}
        pseudo={pseudo}
      />
      <ProfileOverviewSections
        cosmetics={cosmetics}
        data={data}
        loading={loading}
        onOpenAchievements={onOpenAchievements}
        onOpenJerseys={onOpenJerseys}
        onOpenRank={onOpenRank}
        onOpenShowcase={onOpenShowcase}
        onOpenTrophies={onOpenTrophies}
        rankAccent={rankAccent}
        rankLabel={rankLabel}
      />
      <CallStreakCard />
    </>
  );
}

function ProfileIdentityCard({
  cosmetics,
  data,
  loading,
  onAddFriend,
  onEditAvatar,
  onModify,
  pseudo,
}: {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  loading: boolean;
  onAddFriend: () => void;
  onEditAvatar: () => void;
  onModify: () => void;
  pseudo: string;
}) {
  const displayedPseudo = data?.pseudo || pseudo;
  const publicProfile = !loading && data?.publicProfile !== false;
  return <View testID="profile-identity-card" style={{ marginHorizontal: spacing.md, gap: 10 }}>
    <PlayerIdentityCard pseudo={displayedPseudo} avatarId={data?.avatarId} cosmetics={cosmetics} team={data?.favoriteTeam} grade={data?.ranking.grade} season={data?.ranking.saison_nom} />
    <View style={styles.identityActions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Ajouter un ami" disabled={loading} onPress={onAddFriend} style={styles.friendAction}>
        <UserRoundPlus color="#070A0E" size={21} /><Text style={styles.friendActionText}>AJOUTER UN AMI</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Modifier ma photo de profil" disabled={loading || !data} onPress={onEditAvatar} style={styles.editAvatarAction}><Pencil color={colors.text} size={21} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Modifier la visibilité de mon profil" disabled={loading} onPress={onModify} style={styles.status}><Text style={[styles.statusText, { color: colors.textSecondary }]}>{loading ? 'SYNCHRO' : publicProfile ? 'PUBLIC' : 'PRIVÉ'}</Text></Pressable>
    </View>
  </View>;
}

function ProfileOverviewSkeleton() {
  return (
    <SkeletonGroup label="Chargement du profil" style={styles.loading} testID="profile-overview-loading">
      <View style={styles.identitySkeleton}>
        <Skeleton height={94} radius="lg" width={94} />
        <View style={styles.identitySkeletonCopy}>
          <Skeleton height={24} radius="sm" width="66%" />
          <Skeleton height={10} radius="pill" tone="subtle" width="48%" />
          <Skeleton height={48} radius="md" width="100%" />
        </View>
      </View>
      <Skeleton height={204} radius="lg" style={styles.skeletonInset} width="auto" />
      <Skeleton height={156} radius="lg" style={styles.skeletonInset} tone="subtle" width="auto" />
      <View style={styles.collectionSkeleton}>
        <Skeleton height={22} radius="sm" width="36%" />
        {[0, 1, 2, 3].map((item) => <Skeleton height={92} key={item} radius="md" width="100%" />)}
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  loading: {
    gap: spacing.md,
  },
  identityCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 164,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.backgroundDeep,
  },
  identityContent: {
    flex: 1,
    minWidth: 0,
    gap: spacing.md,
  },
  identityTopRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  pseudo: {
    ...typography.displaySmall,
    color: colors.text,
  },
  profileTitle: {
    ...typography.metadata,
    marginTop: 3,
    color: colors.textSecondary,
    letterSpacing: 0.25,
  },
  status: {
    minHeight: 30,
    flexShrink: 0,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceLow,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  statusText: {
    ...typography.control,
  },
  identityActions: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  friendAction: {
    minWidth: 0,
    minHeight: 50,
    flex: 1,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.volt,
    borderWidth: 1,
    borderColor: '#F3FF8E',
  },
  friendActionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  friendActionText: {
    ...typography.action,
    color: '#070A0E',
    letterSpacing: 0.2,
  },
  editAvatarAction: {
    width: 50,
    height: 50,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceLow,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  disabled: {
    opacity: 0.42,
  },
  pressed: {
    opacity: 0.72,
  },
  identitySkeleton: {
    minHeight: 164,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surfaceLow,
  },
  identitySkeletonCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
  },
  skeletonInset: {
    marginHorizontal: spacing.md,
  },
  collectionSkeleton: {
    marginHorizontal: spacing.md,
    gap: spacing.xs,
  },
});
