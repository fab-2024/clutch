import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/src/theme';

/** The streak's filled flame, shared by the Hub card and its detail screen. */
export function CallStreakFlame({ height }: { height: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Svg width={height * 2 / 3} height={height} viewBox="0 0 160 240">
        <Path
          fill={colors.volt}
          d="M114 2C94 44 113 61 137 94C161 126 166 148 152 172C139 194 114 208 94 215L139 140C117 109 82 81 83 48C62 79 87 101 81 122C76 143 49 152 37 169C18 195 40 221 76 238C29 233 1 207 2 180C3 148 34 127 46 94C57 108 51 126 47 135C72 125 77 113 68 91C54 57 70 30 114 2Z"
        />
        <Path fill="#FFB438" d="M94 219L128 202L114 228L87 238Z" />
      </Svg>
    </View>
  );
}

export function CallStreakGlow() {
  const id = useId().replace(/:/g, '');
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.glow}>
      <Svg width="100%" height="100%" viewBox="0 0 430 510" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="34%" rx="48%" ry="45%">
            <Stop offset="0" stopColor="#00BDE8" stopOpacity="0.42" />
            <Stop offset="0.35" stopColor="#006D8B" stopOpacity="0.25" />
            <Stop offset="1" stopColor="#03111C" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="430" height="510" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', top: -32, left: -16, right: -16, height: 510 },
});
