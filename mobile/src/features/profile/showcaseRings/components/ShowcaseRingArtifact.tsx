import { Image, Pressable, StyleSheet, View } from 'react-native';

import type { EquippedShowcaseRing } from '../types';

type ShowcaseRingArtifactProps = {
  compact?: boolean;
  onPress?: () => void;
  ring: EquippedShowcaseRing;
  size: number;
};

export default function ShowcaseRingArtifact({
  compact = false,
  onPress,
  ring,
  size,
}: ShowcaseRingArtifactProps) {
  return (
    <Pressable
      accessibilityLabel={`Anneau ${ring.familyName}, ${ring.name}, palier ${ring.stage}`}
      accessibilityRole={onPress ? 'button' : 'image'}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        { height: size, width: size },
        pressed && styles.pressed,
      ]}
      testID={`showcase-ring-artifact-${ring.family}`}
    >
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          compact && styles.glowCompact,
          { backgroundColor: `${ring.accent}28`, boxShadow: `0 0 ${compact ? 8 : 18}px ${ring.accent}35` },
        ]}
      />
      <View pointerEvents="none" style={styles.contactShadow} />
      <Image resizeMode="contain" source={ring.asset} style={styles.image} />
      <View pointerEvents="none" style={[styles.contactLine, { backgroundColor: ring.accent }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative', flexShrink: 0, alignItems: 'center', justifyContent: 'flex-end' },
  image: { zIndex: 2, width: '100%', height: '100%' },
  glow: { position: 'absolute', zIndex: 0, left: '18%', right: '18%', bottom: '8%', height: '54%', borderRadius: 999, opacity: 0.72 },
  glowCompact: { opacity: 0.5 },
  contactShadow: { position: 'absolute', zIndex: 0, left: '24%', right: '24%', bottom: '5%', height: 6, borderRadius: 999, backgroundColor: 'rgba(0,0,0,.88)', transform: [{ scaleY: 0.35 }] },
  contactLine: { position: 'absolute', zIndex: 3, left: '35%', right: '35%', bottom: '6%', height: 1, borderRadius: 999, opacity: 0.58 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
