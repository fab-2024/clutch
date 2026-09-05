import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import { colors } from '@/src/theme';

export type AppAtmosphereTone = 'standard' | 'rank';

export function AppAtmosphere({ tone = 'standard' }: { tone?: AppAtmosphereTone }) {
  const rank = tone === 'rank';

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      testID={`app-atmosphere-${tone}`}
    >
      <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 430 920" width="100%">
        <Defs>
          <LinearGradient id="canvas" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={rank ? '#0B2635' : colors.atmosphereTop} />
            <Stop offset="0.34" stopColor={colors.atmosphereMid} />
            <Stop offset="0.72" stopColor="#081721" />
            <Stop offset="1" stopColor={colors.atmosphereBottom} />
          </LinearGradient>
          <RadialGradient cx="52%" cy={rank ? '2%' : '8%'} id="topBloom" rx="72%" ry="48%">
            <Stop offset="0" stopColor={rank ? '#1B819F' : colors.atmosphereCyan} stopOpacity={rank ? 0.42 : 0.24} />
            <Stop offset="0.42" stopColor="#0D4358" stopOpacity={rank ? 0.28 : 0.16} />
            <Stop offset="1" stopColor="#07131D" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient cx="53%" cy="44%" id="bodyBloom" rx="68%" ry="58%">
            <Stop offset="0" stopColor="#0D3C50" stopOpacity={rank ? 0.2 : 0.13} />
            <Stop offset="0.62" stopColor="#092331" stopOpacity="0.08" />
            <Stop offset="1" stopColor="#06101A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient cx="50%" cy="38%" id="edgeVignette" rx="72%" ry="76%">
            <Stop offset="0.48" stopColor="#000000" stopOpacity="0" />
            <Stop offset="0.78" stopColor="#01070D" stopOpacity="0.18" />
            <Stop offset="1" stopColor="#00050A" stopOpacity="0.58" />
          </RadialGradient>
          <LinearGradient id="bottomVignette" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0.58" stopColor="#000000" stopOpacity="0" />
            <Stop offset="1" stopColor="#00050A" stopOpacity="0.36" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#canvas)" height="920" width="430" />
        <Rect fill="url(#topBloom)" height="920" width="430" />
        <Rect fill="url(#bodyBloom)" height="920" width="430" />
        <Rect fill="url(#edgeVignette)" height="920" width="430" />
        <Rect fill="url(#bottomVignette)" height="920" width="430" />
      </Svg>
    </View>
  );
}
