import { Asset } from 'expo-asset';
import { Image, StyleSheet, Text, type ImageURISource } from 'react-native';

import AchievementBadgeArtwork from '../../achievementBadges/components/AchievementBadgeArtwork';
import { showcasePlaceableGlyph, type ShowcasePlaceableItem } from './roomEditor';

export function showcasePlaceableAspectRatio(item?: ShowcasePlaceableItem | null) {
  if (!item?.image) return 1;
  const source = Asset.fromModule(item.image as number | string | Required<Pick<ImageURISource, 'uri' | 'width' | 'height'>>);
  return source.width && source.height ? source.width / source.height : 1;
}

export default function ShowcasePlaceableArtwork({
  item,
  size,
}: {
  item: ShowcasePlaceableItem;
  size: number;
}) {
  if (item.badge) {
    return <AchievementBadgeArtwork badge={item.badge} showStand={false} size={size / 1.12} />;
  }
  if (item.image) {
    const ratio = showcasePlaceableAspectRatio(item);
    const dimensions = ratio >= 1
      ? { height: size / ratio, width: size }
      : { height: size, width: size * ratio };
    return <Image resizeMode="contain" source={item.image} style={dimensions} />;
  }
  return <Text style={[styles.glyph, { color: item.accent }]}>{showcasePlaceableGlyph(item.kind)}</Text>;
}

const styles = StyleSheet.create({ glyph: { fontSize: 24, lineHeight: 28 } });
