import { Image, StyleSheet, View } from 'react-native';

import { CosmeticAvatar } from '@/src/features/shop/components/CosmeticRenderer';
import type { EquippedCosmetics } from '@/src/features/shop/types';

import { playerAvatarById, type PlayerAvatar as PlayerAvatarItem } from './catalog';

type PlayerAvatarProps = {
  avatarId?: string | null;
  cosmetics?: EquippedCosmetics | null;
  label: string;
  size?: number;
};

export default function PlayerAvatar({
  avatarId,
  cosmetics,
  label,
  size = 48,
}: PlayerAvatarProps) {
  const avatar = playerAvatarById(avatarId);
  const artworkSize = Math.max(18, size - 6);

  return (
    <CosmeticAvatar
      artwork={avatar ? <SpriteArtwork avatar={avatar} size={artworkSize} /> : undefined}
      cosmetics={cosmetics}
      label={avatar ? `${label}, avatar ${avatar.label}` : label}
      size={size}
    />
  );
}

function SpriteArtwork({ avatar, size }: { avatar: PlayerAvatarItem; size: number }) {
  const scale = size / avatar.crop.size;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.clip, { width: size, height: size }]}
    >
      <Image
        resizeMode="stretch"
        source={avatar.source}
        style={{
          position: 'absolute',
          width: avatar.sheet.width * scale,
          height: avatar.sheet.height * scale,
          left: -avatar.crop.x * scale,
          top: -avatar.crop.y * scale,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});
