import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import {
  showcaseAtmosphereColor,
  type ShowcaseAtmosphere,
  type ShowcaseAtmosphereStaticReason,
} from './showcaseAtmosphere';

const STATIC_DUST = [
  [8, 22], [18, 68], [29, 36], [39, 81], [51, 18], [61, 63],
  [72, 31], [82, 76], [91, 49], [47, 51], [68, 88],
] as const;

export default function ShowcaseAtmosphereFallback({
  atmosphere,
  reason,
}: {
  atmosphere: ShowcaseAtmosphere;
  reason: ShowcaseAtmosphereStaticReason;
}) {
  return (
    <View
      accessibilityElementsHidden
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      testID={`showcase-atmosphere-static-${reason}`}
    >
      <LinearGradient
        colors={[
          showcaseAtmosphereColor(atmosphere.rankColor, atmosphere.intensity * 0.17),
          'rgba(0,0,0,0)',
        ]}
        end={{ x: 0.72, y: 0.66 }}
        start={{ x: 0.08, y: 0.12 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[
          'rgba(0,0,0,0)',
          showcaseAtmosphereColor(atmosphere.teamColor, atmosphere.intensity * 0.13),
          'rgba(0,0,0,0)',
        ]}
        end={{ x: 1, y: 0.58 }}
        locations={[0, 0.78, 1]}
        start={{ x: 0.3, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[
          showcaseAtmosphereColor(atmosphere.lightingColor, atmosphere.intensity * 0.09),
          'rgba(0,0,0,0)',
        ]}
        end={{ x: 0.52, y: 0.78 }}
        start={{ x: 0.48, y: 0.02 }}
        style={styles.centralLight}
      />
      {atmosphere.effect === 'blue-wall' ? (
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(22,141,255,.72)', 'rgba(185,227,255,.86)', 'rgba(22,141,255,.72)', 'rgba(0,0,0,0)']}
          end={{ x: 1, y: 0.5 }}
          locations={[0, 0.22, 0.5, 0.78, 1]}
          start={{ x: 0, y: 0.5 }}
          style={styles.blueWallContour}
          testID="showcase-blue-wall-static-contour"
        />
      ) : null}
      {atmosphere.effect === 'm8-sparkle' ? (
        <View style={styles.m8Star} testID="showcase-m8-static-star">
          <View style={styles.m8StarGlow} />
          <View style={[styles.m8StarRay, styles.m8StarRayVertical]} />
          <View style={[styles.m8StarRay, styles.m8StarRayHorizontal]} />
          <View style={styles.m8StarCore} />
        </View>
      ) : null}
      {atmosphere.effect === 'neon-pulse' ? (
        <View style={styles.neonPulse} testID="showcase-neon-static-pulse">
          <View style={[styles.neonPulseRing, styles.neonPulseRingOuter]} />
          <View style={[styles.neonPulseRing, styles.neonPulseRingInner]} />
          <View style={styles.neonPulseRayCyan} />
          <View style={styles.neonPulseRayMagenta} />
          <View style={styles.neonPulseCore} />
        </View>
      ) : null}
      {atmosphere.effect === 'forge-resonance' ? (
        <View style={styles.forgeResonance} testID="showcase-forge-static-resonance">
          <View style={[styles.forgeResonanceRing, styles.forgeResonanceRingOuter]} />
          <View style={[styles.forgeResonanceRing, styles.forgeResonanceRingMiddle]} />
          <View style={[styles.forgeResonanceRing, styles.forgeResonanceRingInner]} />
          <View style={styles.forgeResonanceRayOrange} />
          <View style={styles.forgeResonanceRayTeal} />
          <View style={styles.forgeResonanceCore} />
        </View>
      ) : null}
      {STATIC_DUST.slice(0, atmosphere.dustCount).map(([left, top], index) => (
        <View
          key={`static-showcase-dust-${left}-${top}`}
          style={[
            styles.dust,
            {
              backgroundColor: showcaseAtmosphereColor(
                index % 3 === 0 ? atmosphere.cosmeticColor : atmosphere.lightingColor,
                atmosphere.intensity * (index % 2 === 0 ? 0.54 : 0.34),
              ),
              height: index % 4 === 0 ? 2 : 1,
              left: `${left}%`,
              top: `${top}%`,
              width: index % 4 === 0 ? 2 : 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blueWallContour: {
    position: 'absolute',
    top: '61%',
    right: '8%',
    left: '8%',
    height: 2,
    opacity: 0.88,
  },
  centralLight: {
    position: 'absolute',
    top: 0,
    bottom: '12%',
    left: '34%',
    width: '32%',
    opacity: 0.72,
  },
  dust: {
    position: 'absolute',
    borderRadius: 999,
  },
  forgeResonance: {
    position: 'absolute',
    top: '51%',
    left: '50%',
    width: 260,
    height: 120,
    marginLeft: -130,
    marginTop: -60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgeResonanceCore: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#FFF3DF',
    boxShadow: '0 0 16px rgba(240,106,58,.95)',
  },
  forgeResonanceRayOrange: {
    position: 'absolute',
    width: 260,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#F06A3A',
    opacity: 0.74,
  },
  forgeResonanceRayTeal: {
    position: 'absolute',
    top: 66,
    width: 168,
    height: 1,
    borderRadius: 999,
    backgroundColor: '#43BFC1',
    opacity: 0.7,
  },
  forgeResonanceRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  forgeResonanceRingInner: {
    width: 52,
    height: 52,
    borderColor: 'rgba(255,176,111,.72)',
  },
  forgeResonanceRingMiddle: {
    width: 82,
    height: 82,
    borderColor: 'rgba(67,191,193,.68)',
  },
  forgeResonanceRingOuter: {
    width: 112,
    height: 112,
    borderColor: 'rgba(240,106,58,.66)',
  },
  m8Star: {
    position: 'absolute',
    top: '12%',
    left: '50%',
    width: 80,
    height: 80,
    marginLeft: -40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  m8StarCore: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 0 14px rgba(185,220,255,.9)',
  },
  m8StarGlow: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: 'rgba(185,220,255,.13)',
  },
  m8StarRay: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#EAF5FF',
    opacity: 0.92,
  },
  m8StarRayHorizontal: {
    width: 70,
    height: 2,
  },
  m8StarRayVertical: {
    width: 2,
    height: 70,
  },
  neonPulse: {
    position: 'absolute',
    top: '46%',
    left: '50%',
    width: 240,
    height: 96,
    marginLeft: -120,
    marginTop: -48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neonPulseCore: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 0 16px rgba(88,223,255,.95)',
  },
  neonPulseRayCyan: {
    position: 'absolute',
    width: 240,
    height: 2,
    borderRadius: 999,
    backgroundColor: '#58DFFF',
    opacity: 0.72,
  },
  neonPulseRayMagenta: {
    position: 'absolute',
    width: 150,
    height: 1,
    top: 52,
    borderRadius: 999,
    backgroundColor: '#E27AFF',
    opacity: 0.76,
  },
  neonPulseRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  neonPulseRingInner: {
    width: 58,
    height: 58,
    borderColor: 'rgba(226,122,255,.72)',
  },
  neonPulseRingOuter: {
    width: 92,
    height: 92,
    borderColor: 'rgba(88,223,255,.68)',
  },
});
