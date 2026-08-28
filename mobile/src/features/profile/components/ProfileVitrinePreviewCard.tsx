import Expand from 'lucide-react-native/icons/expand';
import Eye from 'lucide-react-native/icons/eye';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { resolveEquippedAchievementBadges } from '@/src/features/profile/achievementBadges/equipment';
import { useAchievementBadgeEquipment } from '@/src/features/profile/achievementBadges/useAchievementBadgeEquipment';
import LevelFrame from '@/src/features/profile/levelFrames/components/LevelFrame';
import type { LevelFrameVariant } from '@/src/features/profile/levelFrames/types';
import {
  adaptShowcaseRingStats,
  resolveEquippedShowcaseRing,
} from '@/src/features/profile/showcaseRings/progression';
import { useShowcaseRingEquipment } from '@/src/features/profile/showcaseRings/useShowcaseRingEquipment';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { colors, radius, spacing, typography } from '@/src/theme';

import type { ProfileData } from '../types';
import ShowcaseRoomScene from './showcase/ShowcaseRoomScene';
import { SHOWCASE_PALETTE } from './showcase/showcasePalette';

type ProfileVitrinePreviewCardProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  levelFrameVariant: LevelFrameVariant;
  loading: boolean;
  onOpenShowcase: () => void;
  onOpenVisibility: () => void;
  onOpenVisitor: () => void;
  preview?: boolean;
  pseudo: string;
  rankAccent: string;
  rankLabel: string;
};

export default function ProfileVitrinePreviewCard({
  cosmetics,
  data,
  levelFrameVariant,
  loading,
  onOpenShowcase,
  onOpenVisibility,
  onOpenVisitor,
  preview = false,
  pseudo,
  rankAccent,
  rankLabel,
}: ProfileVitrinePreviewCardProps) {
  const ringEquipment = useShowcaseRingEquipment(
    preview ? `preview-${pseudo}` : pseudo,
    preview ? 'rank' : null,
  );
  const ringStats = useMemo(() => adaptShowcaseRingStats(data), [data]);
  const equippedRing = useMemo(
    () => resolveEquippedShowcaseRing(ringStats, ringEquipment.family),
    [ringEquipment.family, ringStats],
  );
  const fallbackBadgeIds = useMemo(
    () => data?.pinnedBadges.map((badge) => badge.id) ?? [],
    [data?.pinnedBadges],
  );
  const badgeEquipment = useAchievementBadgeEquipment(
    preview ? `preview-${pseudo}` : pseudo,
    fallbackBadgeIds,
  );
  const equippedBadges = useMemo(
    () => resolveEquippedAchievementBadges(data?.badges ?? [], badgeEquipment.slots),
    [badgeEquipment.slots, data?.badges],
  );
  const level = loading ? '—' : data?.level.level ?? '—';
  const displayedRank = loading ? '—' : rankLabel;
  const publicProfile = !loading && Boolean(data?.publicProfile);
  const privateProfile = !loading && Boolean(data && !data.publicProfile);
  const visitorDisabled = loading || !data;
  const status = loading ? 'SYNCHRO' : publicProfile ? 'PUBLIC' : 'PRIVÉ';
  const statusLabel = loading ? 'en synchronisation' : publicProfile ? 'publique' : 'privée';
  const statusColor = loading ? colors.textMuted : publicProfile ? colors.success : colors.liveText;
  const profileTitle = loading
    ? 'Synchronisation du profil'
    : cosmetics?.title?.name
      || data?.profileTitle
      || data?.level.prestigeLabel
      || 'Supporter GRIFF';

  return (
    <View style={styles.card} testID="profile-vitrine-hero">
      <View style={styles.identityRow}>
        <LevelFrame
          level={typeof level === 'number' ? level : 0}
          size={58}
          variant={levelFrameVariant}
        />
        <View
          accessible
          accessibilityLabel={`${data?.pseudo || pseudo}, ${profileTitle}, niveau ${level}, vitrine ${statusLabel}`}
          style={styles.identityCopy}
        >
          <View style={styles.identityEyebrowRow}>
            <Text numberOfLines={1} style={styles.eyebrow}>VITRINE</Text>
            <View style={styles.status}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{status}</Text>
            </View>
          </View>
          <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={styles.pseudo}>
            {data?.pseudo || pseudo}
          </Text>
          <Text numberOfLines={1} style={styles.profileTitle}>{profileTitle.toUpperCase()}</Text>
        </View>
      </View>

      <ShowcaseRoomScene
        cosmetics={cosmetics}
        data={data}
        equippedBadges={equippedBadges}
        equippedRing={equippedRing}
        loading={loading}
        mode="preview"
        rankAccent={rankAccent}
        rankLabel={displayedRank}
        style={styles.scene}
      />

      <View style={styles.actions}>
        <Button
          accessibilityHint="Ouvre la scène complète en mode paysage"
          accessibilityLabel="Ouvrir ma Vitrine en paysage"
          disabled={loading}
          fullWidth
          label="ENTRER DANS MA VITRINE"
          leading={<Expand color={colors.background} size={18} strokeWidth={2.2} />}
          onPress={onOpenShowcase}
        />
        <Button
          accessibilityHint={privateProfile ? 'Ouvre les réglages du profil pour choisir sa visibilité' : 'Affiche la version publique de ton profil'}
          accessibilityLabel={privateProfile ? 'Modifier la visibilité de mon profil' : 'Voir ma Vitrine comme visiteur'}
          disabled={visitorDisabled}
          fullWidth
          label={privateProfile ? 'RÉGLER LA VISIBILITÉ' : 'VOIR COMME VISITEUR'}
          leading={<Eye color={visitorDisabled ? colors.textDisabled : colors.text} size={17} strokeWidth={2.1} />}
          onPress={privateProfile ? onOpenVisibility : onOpenVisitor}
          size="compact"
          variant="ghost"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: SHOWCASE_PALETTE.graphite,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  identityRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identityCopy: {
    flex: 1,
    minWidth: 0,
  },
  identityEyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.control,
    color: colors.volt,
    letterSpacing: 0.7,
  },
  pseudo: {
    ...typography.sectionTitle,
    marginTop: 1,
    color: colors.text,
  },
  profileTitle: {
    ...typography.metadata,
    marginTop: 1,
    color: colors.textSecondary,
    letterSpacing: 0.25,
  },
  status: {
    minHeight: 24,
    flexShrink: 0,
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  statusText: {
    ...typography.metadata,
    fontFamily: typography.control.fontFamily,
  },
  scene: {
    marginTop: spacing.md,
    borderRadius: radius.md,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
});
