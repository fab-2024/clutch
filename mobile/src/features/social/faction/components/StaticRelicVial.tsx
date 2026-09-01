import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  RELIC_STAGE_ARTWORK,
} from '@/src/features/social/faction/relicArtwork';
import type { RelicContainer } from '@/src/features/social/faction/types';

import {
  RelicStaticLiquidArtwork,
  RelicVesselForegroundArtwork,
} from './RelicEnergyArtwork';

type Props = {
  container: RelicContainer;
  fillRatio?: number;
  height: number;
  opacity?: number;
  renderLiquid?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  width: number;
};

export default function StaticRelicVial({
  container,
  fillRatio = 1,
  height,
  opacity = 1,
  renderLiquid = true,
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
      {renderLiquid ? (
        <View style={StyleSheet.absoluteFill} testID={testID ? `${testID}-elixir` : undefined}>
          <RelicStaticLiquidArtwork config={config} container={container} fillRatio={fillRatio} />
        </View>
      ) : null}
      {config.foregroundPaths?.length ? (
        <View style={StyleSheet.absoluteFill} testID={testID ? `${testID}-foreground` : undefined}>
          <RelicVesselForegroundArtwork config={config} container={container} />
        </View>
      ) : null}
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
