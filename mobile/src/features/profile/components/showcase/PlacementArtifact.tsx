import { Image, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/src/theme';

import { SHOWCASE_PALETTE } from './showcasePalette';

const PLACEMENT_ARTIFACT_ASSET = require('../../../../../assets/showcase/showcase-placement-artifact-v1.png');

type PlacementArtifactProps = {
  compact: boolean;
  size: number;
};

export default function PlacementArtifact({ compact, size }: PlacementArtifactProps) {
  return (
    <View
      accessible
      accessibilityLabel="Cristal de classement dormant, rang non classé"
      style={[styles.root, { height: size, width: size * 1.16 }]}
      testID="placement-artifact"
    >
      <View style={[styles.ambientLight, compact && styles.ambientLightCompact]} />
      <View style={[styles.shadow, { width: size * 0.78 }]} />
      <Image
        resizeMode="contain"
        source={PLACEMENT_ARTIFACT_ASSET}
        style={styles.artifact}
        testID="placement-artifact-image"
      />
      <Text style={[styles.question, compact && styles.questionCompact]}>?</Text>
      <View style={[styles.contactLight, compact && styles.contactLightCompact]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative', alignItems: 'center', justifyContent: 'flex-end' },
  artifact: { zIndex: 2, width: '100%', height: '100%' },
  ambientLight: { position: 'absolute', zIndex: 0, top: '13%', width: '48%', height: '62%', borderRadius: 999, backgroundColor: 'rgba(49,215,226,.07)', boxShadow: '0 0 24px rgba(49,215,226,.10)' },
  ambientLightCompact: { opacity: 0.68 },
  shadow: { position: 'absolute', zIndex: 0, bottom: 0, height: 8, borderRadius: 999, backgroundColor: 'rgba(0,0,0,.82)', transform: [{ scaleY: 0.4 }] },
  question: { position: 'absolute', zIndex: 3, top: '39%', width: '100%', color: SHOWCASE_PALETTE.textMuted, fontFamily: fonts.display, fontSize: 20, lineHeight: 22, opacity: 0.66, textAlign: 'center', textShadowColor: 'rgba(0,0,0,.84)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  questionCompact: { fontSize: 12, lineHeight: 14 },
  contactLight: { position: 'absolute', zIndex: 1, bottom: 1, width: '56%', height: 2, borderRadius: 999, backgroundColor: SHOWCASE_PALETTE.cyan, opacity: 0.34 },
  contactLightCompact: { height: 1, opacity: 0.28 },
});
