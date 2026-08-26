import { Pressable, StyleSheet, View } from 'react-native';

import type { PublicAchievementBadge } from '../types';
import AchievementBadgeArtwork from './AchievementBadgeArtwork';

type ShowcaseAchievementBadgeProps = {
  badge: PublicAchievementBadge;
  compact: boolean;
  onPress?: () => void;
  size: number;
};

export default function ShowcaseAchievementBadge({
  badge,
  compact,
  onPress,
  size,
}: ShowcaseAchievementBadgeProps) {
  const content = (
    <View style={[styles.artifact, { height: size * 1.12, width: size }]}>
      <View style={[styles.glow, compact && styles.glowCompact, { backgroundColor: badge.accent }]} />
      <AchievementBadgeArtwork badge={badge} size={size} />
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      accessibilityLabel={`Ouvrir le badge ${badge.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  artifact: { position: 'relative', alignItems: 'center', justifyContent: 'flex-end' },
  glow: { position: 'absolute', top: '20%', width: '80%', aspectRatio: 1, borderRadius: 999, opacity: .14, boxShadow: '0 0 16px rgba(49,215,226,.12)' },
  glowCompact: { opacity: .08 },
  pressed: { opacity: .72, transform: [{ scale: .97 }] },
});
