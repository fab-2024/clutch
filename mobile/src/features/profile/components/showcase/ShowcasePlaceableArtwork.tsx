import { Image, StyleSheet, Text } from 'react-native';

import AchievementBadgeArtwork from '../../achievementBadges/components/AchievementBadgeArtwork';
import { showcasePlaceableGlyph, type ShowcasePlaceableItem } from './roomEditor';

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
    return <Image resizeMode="contain" source={item.image} style={styles.image} />;
  }
  return <Text style={[styles.glyph, { color: item.accent }]}>{showcasePlaceableGlyph(item.kind)}</Text>;
}

const styles = StyleSheet.create({
  image: { width: '88%', height: '88%' },
  glyph: { fontSize: 24, lineHeight: 28 },
});
