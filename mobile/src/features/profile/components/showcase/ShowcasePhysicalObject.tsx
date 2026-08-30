import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import { fonts } from '@/src/theme';

import { SHOWCASE_PALETTE, showcaseAlpha } from './showcasePalette';

export type ShowcasePhysicalObjectKind = 'frame' | 'title' | 'core' | 'banner' | 'badge';

export type ShowcasePhysicalObjectModel = {
  accent: string;
  id: string;
  image?: ImageSourcePropType;
  kind: ShowcasePhysicalObjectKind;
  name: string;
};

type ShowcasePhysicalObjectProps = {
  compact?: boolean;
  model: ShowcasePhysicalObjectModel;
  showName?: boolean;
  size: number;
  testID?: string;
};

export const SHOWCASE_COLLECTIBLE_ASSETS: Record<ShowcasePhysicalObjectKind, ImageSourcePropType> = {
  frame: require('../../../../../assets/showcase/collectibles/showcase-frame-v1.png'),
  title: require('../../../../../assets/showcase/collectibles/showcase-title-plaque-v1.png'),
  core: require('../../../../../assets/showcase/collectibles/showcase-core-v1.png'),
  banner: require('../../../../../assets/showcase/collectibles/showcase-banner-v1.png'),
  badge: require('../../../../../assets/showcase/collectibles/showcase-badge-v1.png'),
};

const OBJECT_METRICS: Record<ShowcasePhysicalObjectKind, { height: number; width: number }> = {
  frame: { height: 1.42, width: 1.28 },
  title: { height: 1.08, width: 1.82 },
  core: { height: 1.48, width: 1.12 },
  banner: { height: 1.5, width: 1.08 },
  badge: { height: 1.44, width: 1.18 },
};

export default function ShowcasePhysicalObject({
  compact = false,
  model,
  showName = false,
  size,
  testID,
}: ShowcasePhysicalObjectProps) {
  const metrics = OBJECT_METRICS[model.kind];
  const rootHeight = size * metrics.height;
  const rootWidth = size * metrics.width;

  return (
    <View
      accessible
      accessibilityLabel={`${physicalKindLabel(model.kind)} ${model.name}`}
      style={[styles.root, { height: rootHeight, width: rootWidth }]}
      testID={testID ?? `showcase-object-${model.kind}-${model.id}`}
    >
      <View style={[styles.contactShadow, compact && styles.contactShadowCompact, { width: rootWidth * 0.68 }]} />
      <View
        pointerEvents="none"
        style={[
          styles.accentBloom,
          accentBloomStyle(model.kind),
          { backgroundColor: showcaseAlpha(model.accent, compact ? '18' : '20') },
        ]}
      />
      <Image
        resizeMode="contain"
        source={model.image ?? SHOWCASE_COLLECTIBLE_ASSETS[model.kind]}
        style={styles.image}
        testID={`showcase-object-image-${model.kind}`}
      />
      <LocalizedAccent accent={model.accent} compact={compact} kind={model.kind} />
      {model.kind === 'title' && showName ? (
        <View pointerEvents="none" style={styles.titleCopy}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.46}
            numberOfLines={1}
            style={[styles.titleName, { fontSize: Math.max(5, size * 0.155) }]}
          >
            {model.name.toUpperCase()}
          </Text>
        </View>
      ) : null}
      <View
        pointerEvents="none"
        style={[
          styles.reflection,
          compact && styles.reflectionCompact,
          { backgroundColor: showcaseAlpha(model.accent, '84'), width: rootWidth * 0.54 },
        ]}
      />
    </View>
  );
}

function LocalizedAccent({
  accent,
  compact,
  kind,
}: {
  accent: string;
  compact: boolean;
  kind: ShowcasePhysicalObjectKind;
}) {
  if (kind === 'core' || kind === 'badge') {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.accentCore,
          kind === 'badge' ? styles.accentCoreBadge : styles.accentCoreCrystal,
          compact && styles.accentCoreCompact,
          { backgroundColor: showcaseAlpha(accent, '84'), boxShadow: `0 0 8px ${showcaseAlpha(accent, '42')}` },
        ]}
      />
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.accentEdge,
        kind === 'title' && styles.accentEdgeTitle,
        kind === 'banner' && styles.accentEdgeBanner,
        compact && styles.accentEdgeCompact,
        { backgroundColor: showcaseAlpha(accent, '98') },
      ]}
    />
  );
}

function accentBloomStyle(kind: ShowcasePhysicalObjectKind) {
  if (kind === 'title') return styles.accentBloomTitle;
  if (kind === 'banner') return styles.accentBloomBanner;
  return styles.accentBloomStandard;
}

function physicalKindLabel(kind: ShowcasePhysicalObjectKind) {
  if (kind === 'frame') return 'Cadre';
  if (kind === 'title') return 'Titre';
  if (kind === 'core') return 'Noyau';
  if (kind === 'banner') return 'Bannière';
  return 'Badge';
}

const styles = StyleSheet.create({
  root: { position: 'relative', alignItems: 'center', justifyContent: 'flex-end' },
  image: { zIndex: 2, width: '100%', height: '100%' },
  contactShadow: { position: 'absolute', zIndex: 0, bottom: 0, height: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,.82)', transform: [{ scaleY: 0.46 }] },
  contactShadowCompact: { height: 3 },
  reflection: { position: 'absolute', zIndex: 3, bottom: 0, height: 1, borderRadius: 999, opacity: 0.42 },
  reflectionCompact: { opacity: 0.32 },
  accentBloom: { position: 'absolute', zIndex: 1, borderRadius: 999, opacity: 0.58 },
  accentBloomStandard: { left: '31%', bottom: '18%', width: '38%', height: '35%' },
  accentBloomTitle: { left: '20%', bottom: '27%', width: '60%', height: '23%' },
  accentBloomBanner: { left: '28%', bottom: '20%', width: '44%', height: '46%' },
  accentCore: { position: 'absolute', zIndex: 3, borderRadius: 999, opacity: 0.5 },
  accentCoreBadge: { top: '31%', left: '42%', width: '16%', aspectRatio: 1 },
  accentCoreCrystal: { top: '33%', left: '44%', width: '12%', aspectRatio: 1 },
  accentCoreCompact: { opacity: 0.38 },
  accentEdge: { position: 'absolute', zIndex: 3, left: '22%', bottom: '24%', width: '18%', height: 1, borderRadius: 999, opacity: 0.55 },
  accentEdgeTitle: { left: '18%', bottom: '45%', width: '22%' },
  accentEdgeBanner: { left: '22%', bottom: '23%', width: '14%', transform: [{ rotate: '62deg' }] },
  accentEdgeCompact: { opacity: 0.44 },
  titleCopy: { position: 'absolute', zIndex: 4, top: '26%', right: '14%', height: '25%', left: '14%', alignItems: 'center', justifyContent: 'center' },
  titleName: { width: '100%', color: SHOWCASE_PALETTE.text, fontFamily: fonts.bold, letterSpacing: 0.18, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.88)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});
