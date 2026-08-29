import Expand from 'lucide-react-native/icons/expand';
import Eye from 'lucide-react-native/icons/eye';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import type { LevelFrameVariant } from '@/src/features/profile/levelFrames/types';
import type { EquippedCosmetics } from '@/src/features/shop/types';
import { colors, radius, spacing } from '@/src/theme';

import type { ProfileData } from '../types';
import ProfileVitrineIdentity from './ProfileVitrineIdentity';
import ProfileVitrinePreviewStage from './ProfileVitrinePreviewStage';
import { SHOWCASE_PALETTE } from './showcase/showcasePalette';

type ProfileVitrinePreviewCardProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  levelFrameVariant: LevelFrameVariant;
  loading: boolean;
  onOpenShowcase: () => void;
  onOpenVisibility: () => void;
  onOpenVisitor: () => void;
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
  pseudo,
  rankAccent,
  rankLabel,
}: ProfileVitrinePreviewCardProps) {
  const level = loading ? '—' : data?.level.level ?? '—';
  const displayedRank = loading ? '—' : rankLabel;
  const publicProfile = !loading && Boolean(data?.publicProfile);
  const privateProfile = !loading && Boolean(data && !data.publicProfile);
  const visitorDisabled = loading || !data;
  const profileTitle = loading
    ? 'Synchronisation du profil'
    : cosmetics?.title?.name
      || data?.profileTitle
      || data?.level.prestigeLabel
      || 'Supporter GRIFF';

  return (
    <View style={styles.card} testID="profile-vitrine-hero">
      <ProfileVitrineIdentity
        level={typeof level === 'number' ? level : null}
        levelFrameVariant={levelFrameVariant}
        loading={loading}
        profileTitle={profileTitle}
        pseudo={data?.pseudo || pseudo}
        publicProfile={publicProfile}
      />

      <ProfileVitrinePreviewStage
        data={data}
        loading={loading}
        rankAccent={rankAccent}
        rankLabel={displayedRank}
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
  actions: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
});
