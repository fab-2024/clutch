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
});
