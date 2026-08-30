import { Image, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';

import { ZERO_RANK_ACCENT, type SeasonalGradeDefinition, type SeasonalGradeState } from '../grades';
import { RankEmblem } from './RankEmblem';
import { journeyStyles as styles } from './SeasonJourney.styles';

const PEDESTAL_ASSET = require('../../../../assets/rank/rank-tier-pedestal-v1.png');

export type RankTierVisualState = 'future' | 'acquired' | 'current';

type RankTierPedestalProps = {
  accessibilityLabel: string;
  grade?: SeasonalGradeDefinition;
  pulse: SharedValue<number>;
  starting?: boolean;
  state: RankTierVisualState;
};

export function RankTierPedestal({
  accessibilityLabel,
  grade,
  pulse,
  starting = false,
  state,
}: RankTierPedestalProps) {
  const active = state === 'current';
  const accent = starting ? ZERO_RANK_ACCENT : grade?.accent ?? '#79CAFF';
  const gradeState = grade ? definitionState(grade) : undefined;
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: active ? interpolate(pulse.value, [0, 1], [0.15, 0.28]) : 0,
    transform: [{ scale: active ? interpolate(pulse.value, [0, 1], [0.96, 1.06]) : 1 }],
  }));

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={styles.pedestalRoot}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pedestalHalo,
          active && styles.pedestalHaloActive,
          { backgroundColor: accent },
          pulseStyle,
        ]}
      />
      {active ? (
        <Svg
          height={112}
          pointerEvents="none"
          style={styles.activeContour}
          viewBox="0 0 158 112"
          width={158}
        >
          <Polygon
            fill={accent}
            fillOpacity={0.045}
            points="79,34 139,57 79,77 19,57"
            stroke={accent}
            strokeOpacity={0.82}
            strokeWidth={1}
          />
        </Svg>
      ) : null}
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={PEDESTAL_ASSET}
        style={[
          styles.pedestalImage,
          state === 'future' && styles.pedestalFuture,
          state === 'acquired' && styles.pedestalAcquired,
          active && styles.pedestalCurrent,
        ]}
      />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          styles.emblem,
          state === 'future' && styles.pedestalFuture,
          state === 'acquired' && styles.pedestalAcquired,
        ]}
      >
        <RankEmblem
          grade={gradeState}
          size={78}
        />
      </View>
    </View>
  );
}

function definitionState(grade: SeasonalGradeDefinition): SeasonalGradeState {
  return {
    classe: true,
    objectif_placements: 0,
    placements_restants: 0,
    progression: 1,
    cle: grade.key,
    libelle: grade.label,
    ordre: 0,
    minimum: grade.minimum,
    plafond: grade.maximum ?? undefined,
  };
}
