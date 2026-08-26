import { StyleSheet, View } from 'react-native';

import type { EquippedCosmetics } from '@/src/features/shop/types';
import type { LevelFrameVariant } from '@/src/features/profile/levelFrames/types';

import type { ProfileData } from '../types';
import ProfileIdentityCard from './ProfileIdentityCard';
import ProfileShortcut from './ProfileShortcut';
import ProfileSignatureCard, { signatureEquippedCount } from './ProfileSignatureCard';
import ProfileVitrinePreviewCard from './ProfileVitrinePreviewCard';

type OwnProfileOverviewProps = {
  cosmetics?: EquippedCosmetics | null;
  data: ProfileData | null;
  loading: boolean;
  levelFrameVariant: LevelFrameVariant;
  onModify: () => void;
  onOpenActivations: () => void;
  onOpenLocker: () => void;
  onOpenShop: () => void;
  onOpenShowcase: () => void;
  onOpenVisitor: () => void;
  preview?: boolean;
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
  onOpenLocker,
  onOpenShop,
  onOpenShowcase,
  onOpenVisitor,
  preview = false,
  pseudo,
  rankAccent,
  rankLabel,
}: OwnProfileOverviewProps) {
  const equippedCount = signatureEquippedCount(cosmetics);

  return (
    <>
      <ProfileIdentityCard
        cosmetics={cosmetics}
        data={data}
        loading={loading}
        levelFrameVariant={levelFrameVariant}
        onModify={onModify}
        pseudo={pseudo}
      />
      <ProfileVitrinePreviewCard
        cosmetics={cosmetics}
        data={data}
        loading={loading}
        onOpenShowcase={onOpenShowcase}
        onOpenVisitor={onOpenVisitor}
        preview={preview}
        pseudo={pseudo}
        rankAccent={rankAccent}
        rankLabel={rankLabel}
      />
      <ProfileSignatureCard
        cosmetics={cosmetics}
        level={data?.level.level ?? 0}
        levelFrameVariant={levelFrameVariant}
        loading={loading}
        onOpenLocker={onOpenLocker}
        pseudo={pseudo}
        relicLevel={data?.favoriteTeam?.relique_niveau ?? 1}
      />
      <View style={styles.shortcuts}>
        <ProfileShortcut
          accessibilityLabel="Ouvrir mes objets dans le Locker"
          glyph="▤"
          label="LOCKER"
          meta={loading ? '—' : `${equippedCount} ÉQUIPÉ${equippedCount === 1 ? '' : 'S'}`}
          onPress={onOpenLocker}
        />
        <ProfileShortcut
          accessibilityLabel="Ouvrir le catalogue de la Boutique"
          glyph="⌁"
          label="BOUTIQUE"
          meta="COSMÉTIQUES"
          onPress={onOpenShop}
        />
        <ProfileShortcut
          accent="#A982FF"
          accessibilityLabel="Ouvrir les activations"
          glyph="ϟ"
          label="ACTIVATIONS"
          meta="NOVA WEEK"
          onPress={onOpenActivations}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  shortcuts: { marginHorizontal: 16, flexDirection: 'row', gap: 6 },
});
