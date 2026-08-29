import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonGroup } from '@/src/components/ui/Skeleton';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import type { LevelFrameVariant } from '@/src/features/profile/levelFrames/types';
import { colors, radius, spacing } from '@/src/theme';

import type { ProfileData } from '../types';
import ProfileOverviewSections from './ProfileOverviewSections';
import ProfileVitrinePreviewCard from './ProfileVitrinePreviewCard';

type OwnProfileOverviewProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  loading: boolean;
  levelFrameVariant: LevelFrameVariant;
  onModify: () => void;
  onOpenActivations: () => void;
  onOpenBadges: () => void;
  onOpenFaction: () => void;
  onOpenJerseys: () => void;
  onOpenRank: () => void;
  onOpenShowcase: () => void;
  onOpenTrophies: () => void;
  onOpenVisitor: () => void;
  pseudo: string;
  rankAccent: string;
  rankLabel: string;
};

export default function OwnProfileOverview({
  cosmetics,
  data,
  loading,
  levelFrameVariant,
  onModify,
  onOpenActivations,
  onOpenBadges,
  onOpenFaction,
  onOpenJerseys,
  onOpenRank,
  onOpenShowcase,
  onOpenTrophies,
  onOpenVisitor,
  pseudo,
  rankAccent,
  rankLabel,
}: OwnProfileOverviewProps) {
  if (loading && !data) return <ProfileOverviewSkeleton />;

  return (
    <>
      <ProfileVitrinePreviewCard
        cosmetics={cosmetics}
        data={data}
        levelFrameVariant={levelFrameVariant}
        loading={loading}
        onOpenShowcase={onOpenShowcase}
        onOpenVisibility={onModify}
        onOpenVisitor={onOpenVisitor}
        pseudo={pseudo}
        rankAccent={rankAccent}
        rankLabel={rankLabel}
      />
      <ProfileOverviewSections
        cosmetics={cosmetics}
        data={data}
        loading={loading}
        onModify={onModify}
        onOpenActivations={onOpenActivations}
        onOpenBadges={onOpenBadges}
        onOpenFaction={onOpenFaction}
        onOpenJerseys={onOpenJerseys}
        onOpenRank={onOpenRank}
        onOpenTrophies={onOpenTrophies}
        rankAccent={rankAccent}
        rankLabel={rankLabel}
      />
    </>
  );
}

function ProfileOverviewSkeleton() {
  return (
    <SkeletonGroup label="Chargement du profil" style={styles.loading} testID="profile-overview-loading">
      <View style={styles.vitrine}>
        <View style={styles.identity}>
          <Skeleton height={58} radius="lg" width={58} />
          <View style={styles.identityCopy}>
            <Skeleton height={8} radius="pill" width={66} />
            <Skeleton height={20} radius="sm" width="64%" />
            <Skeleton height={8} radius="pill" tone="subtle" width="48%" />
          </View>
          <Skeleton height={24} radius="pill" width={62} />
        </View>
        <Skeleton radius="md" style={styles.scene} tone="highlight" width="100%" />
        <Skeleton height={48} radius="md" width="100%" />
        <Skeleton height={44} radius="md" tone="subtle" width="100%" />
      </View>

      <View style={styles.sections}>
        <View style={styles.progressCard}>
          <View style={styles.heading}>
            <Skeleton height={9} radius="pill" width={88} />
            <Skeleton height={9} radius="pill" width={122} />
          </View>
          <View style={styles.progressIdentity}>
            <Skeleton height={60} radius="lg" width={60} />
            <View style={styles.progressCopy}>
              <Skeleton height={25} radius="sm" width="68%" />
              <Skeleton height={8} radius="pill" tone="subtle" width="54%" />
            </View>
            <Skeleton height={34} radius="sm" width={62} />
          </View>
          <View style={styles.heading}>
            <Skeleton height={9} radius="pill" tone="subtle" width={104} />
            <Skeleton height={9} radius="pill" tone="subtle" width={92} />
          </View>
          <Skeleton height={7} radius="pill" width="100%" />
        </View>

        <View style={styles.collection}>
          <View style={styles.heading}>
            <View style={styles.collectionHeadingCopy}>
              <Skeleton height={9} radius="pill" width={78} />
              <Skeleton height={20} radius="sm" width={138} />
            </View>
            <Skeleton height={9} radius="pill" tone="subtle" width={102} />
          </View>
          <View style={styles.artifacts}>
            {[0, 1, 2, 3, 4].map((item) => <Skeleton height={58} key={item} radius="md" style={styles.artifact} />)}
          </View>
          <View style={styles.actions}>
            <Skeleton height={44} radius="md" width="48%" />
            <Skeleton height={44} radius="md" tone="subtle" width="48%" />
          </View>
        </View>

        <View style={styles.socialCard}>
          <Skeleton height={9} radius="pill" width={58} />
          <View style={styles.socialRow}>
            <Skeleton height={48} radius="md" width={48} />
            <View style={styles.socialCopy}>
              <Skeleton height={8} radius="pill" tone="subtle" width="42%" />
              <Skeleton height={16} radius="pill" width="72%" />
              <Skeleton height={8} radius="pill" tone="subtle" width="58%" />
            </View>
          </View>
          <View style={styles.socialDivider} />
          <Skeleton height={44} radius="md" tone="subtle" width="100%" />
        </View>
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  loading: { gap: spacing.md },
  vitrine: { marginHorizontal: spacing.md, padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: '#0A0D11', borderWidth: 1, borderColor: colors.borderStrong },
  identity: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  identityCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  scene: { aspectRatio: 1.84 },
  sections: { marginHorizontal: spacing.md, gap: spacing.md },
  progressCard: { minHeight: 206, padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderSubtle },
  heading: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  progressIdentity: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  collection: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.sm, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borderSubtle },
  collectionHeadingCopy: { gap: spacing.xs },
  artifacts: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  artifact: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  socialCard: { padding: spacing.md, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderSubtle },
  socialRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  socialCopy: { flex: 1, minWidth: 0, gap: spacing.xs },
  socialDivider: { height: 1, backgroundColor: colors.borderSubtle },
});
