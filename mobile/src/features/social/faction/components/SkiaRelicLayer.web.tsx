import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

import type { SkiaRelicLayerProps } from './SkiaRelicLayer.types';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 270;
const SKIA_WEB_OPTIONS = { locateFile: () => '/canvaskit.wasm' };
const loadSkiaRelicCanvas = () => import('./SkiaRelicCanvas');

export default function SkiaRelicLayerWeb(props: SkiaRelicLayerProps) {
  return (
    <WithSkiaWeb
      componentProps={props}
      fallback={<SkiaRelicFallback config={props.config} />}
      getComponent={loadSkiaRelicCanvas}
      opts={SKIA_WEB_OPTIONS}
    />
  );
}

function SkiaRelicFallback({ config }: Pick<SkiaRelicLayerProps, 'config'>) {
  return (
    <View pointerEvents="none" style={styles.fallback}>
      {config.neutralMatte ? null : (
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={config.asset}
          style={[
            styles.image,
            {
              height: config.layout.height,
              left: (CANVAS_WIDTH - config.layout.width) / 2,
              top: config.layout.top,
              width: config.layout.width,
            },
          ]}
        />
      )}
      <View style={styles.loaderAura} />
      <ActivityIndicator color="#62E6EF" size="small" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    position: 'relative',
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
  },
  loaderAura: {
    position: 'absolute',
    left: CANVAS_WIDTH / 2 - 30,
    top: 178,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(49,215,226,.08)',
    boxShadow: '0 0 24px rgba(49,215,226,.28)',
  },
  loader: {
    position: 'absolute',
    left: CANVAS_WIDTH / 2 - 10,
    top: 198,
  },
});
