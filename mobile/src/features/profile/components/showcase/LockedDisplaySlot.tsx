import { Image, StyleSheet, View } from 'react-native';

import {
  SHOWCASE_COLLECTIBLE_ASSETS,
  type ShowcasePhysicalObjectKind,
} from './ShowcasePhysicalObject';
import { SHOWCASE_PALETTE } from './showcasePalette';

type LockedDisplaySlotProps = {
  kind: ShowcasePhysicalObjectKind;
  size: number;
  testID: string;
};

const LOCKED_METRICS: Record<ShowcasePhysicalObjectKind, { height: number; width: number }> = {
  frame: { height: 1.36, width: 1.22 },
  title: { height: 1.02, width: 1.72 },
  core: { height: 1.42, width: 1.08 },
  banner: { height: 1.44, width: 1.04 },
  badge: { height: 1.38, width: 1.12 },
};

export default function LockedDisplaySlot({ kind, size, testID }: LockedDisplaySlotProps) {
  const metrics = LOCKED_METRICS[kind];
  const width = size * metrics.width;

  return (
    <View
      accessibilityElementsHidden
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.root, { height: size * metrics.height, width }]}
      testID={testID}
    >
      <View style={[styles.shadow, { width: width * 0.62 }]} />
      <Image
        resizeMode="contain"
        source={SHOWCASE_COLLECTIBLE_ASSETS[kind]}
        style={styles.silhouette}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative', alignItems: 'center', justifyContent: 'flex-end', opacity: 0.86 },
  silhouette: { width: '100%', height: '100%', opacity: 0.32, tintColor: SHOWCASE_PALETTE.lockedSteel },
  shadow: { position: 'absolute', bottom: 0, height: 3, borderRadius: 999, backgroundColor: 'rgba(0,0,0,.68)', transform: [{ scaleY: 0.42 }] },
});
