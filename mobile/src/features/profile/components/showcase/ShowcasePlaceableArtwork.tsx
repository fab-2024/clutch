import { Asset } from 'expo-asset';
import { Image, StyleSheet, Text, View, type ImageURISource } from 'react-native';

import AchievementBadgeArtwork from '../../achievementBadges/components/AchievementBadgeArtwork';
import { showcasePlaceableGlyph, type ShowcasePlaceableItem } from './roomEditor';

export default function ShowcasePlaceableArtwork({
  item,
  size,
  frontalBase = false,
}: {
  item: ShowcasePlaceableItem;
  frontalBase?: boolean;
  size: number;
}) {
  if (item.badge) {
    return <AchievementBadgeArtwork badge={item.badge} showStand={false} size={size / 1.12} />;
  }
  if (item.image) {
    const source = Asset.fromModule(item.image as number | string | Required<Pick<ImageURISource, 'uri' | 'width' | 'height'>>);
    const ratio = source.width && source.height ? source.width / source.height : 1;
    const dimensions = ratio >= 1
      ? { height: size / ratio, width: size }
      : { height: size, width: size * ratio };
    if (frontalBase && item.kind !== 'rank' && item.kind !== 'banner' && item.kind !== 'frame' && item.kind !== 'title') {
      const itemId = item.id.replace(/^cosmetic:/, '');
      const topFraction = itemId === 'conclave-arcanique-brumousse' ? 0.74 : 0.82;
      const bottomFraction = itemId === 'conclave-arcanique-brumousse' ? 0.9 : 0.95;
      const topHeight = dimensions.height * topFraction;
      const baseHeight = dimensions.height * (bottomFraction - topFraction);
      const bottomHeight = dimensions.height * (1 - bottomFraction);
      const baseScale = 0.5;
      // Flatten the base's top face while preserving the body and front rim.
      // Keeping all three slices contiguous avoids stretching the whole object.
      const slices = [
        { sourceY: 0, sourceHeight: topHeight, scale: 1 },
        { sourceY: topHeight, sourceHeight: baseHeight, scale: baseScale },
        { sourceY: topHeight + baseHeight, sourceHeight: bottomHeight, scale: 1 },
      ];
      return (
        <View style={{ width: dimensions.width, height: topHeight + baseHeight * baseScale + bottomHeight }}>
          {slices.map(({ sourceY, sourceHeight, scale }) => (
            <View key={sourceY} style={{ width: dimensions.width, height: sourceHeight * scale, overflow: 'hidden' }}>
              <View style={{ width: dimensions.width, height: sourceHeight, transformOrigin: '50% 0%', transform: [{ scaleY: scale }] }}>
                <Image accessible={false} resizeMode="contain" source={item.image} style={[dimensions, { position: 'absolute', top: -sourceY }]} />
              </View>
            </View>
          ))}
        </View>
      );
    }
    return <Image resizeMode="contain" source={item.image} style={dimensions} />;
  }
  return <Text style={[styles.glyph, { color: item.accent }]}>{showcasePlaceableGlyph(item.kind)}</Text>;
}

const styles = StyleSheet.create({ glyph: { fontSize: 24, lineHeight: 28 } });
