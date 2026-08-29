import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { RELIC_STAGE_ARTWORK } from '@/src/features/social/faction/relicArtwork';
import type { RelicContainer } from '@/src/features/social/faction/types';

import { RelicStaticLiquidArtwork } from './RelicEnergyArtwork';

type Props = {
  container: RelicContainer;
  height: number;
  levelLift?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  width: number;
};

export default function StaticRelicVial({
  container,
  height,
  levelLift = 0,
  opacity = 1,
  style,
  testID,
  width,
}: Props) {
  const config = RELIC_STAGE_ARTWORK[container];

  return (
    <View pointerEvents="none" style={[styles.viewport, { height, opacity, width }, style]} testID={testID}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={config.asset}
        style={styles.scene}
        testID={testID ? `${testID}-scene` : undefined}
      />
      <View style={StyleSheet.absoluteFill} testID={testID ? `${testID}-elixir` : undefined}>
        <RelicStaticLiquidArtwork config={config} container={container} levelLift={levelLift} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'relative',
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: '#010308',
  },
  scene: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
