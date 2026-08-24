import { Image, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';

import type { SeasonalGradeDefinition, SeasonalGradeState } from '../grades';
import { RankEmblem } from './RankEmblem';
import { journeyStyles as styles } from './SeasonJourney.styles';

const PEDESTAL_ASSET = require('../../../../assets/rank/rank-tier-pedestal-v1.png');

export type RankTierVisualState = 'future' | 'acquired' | 'current' | 'placement' | 'placementComplete';

type RankTierPedestalProps = {
  accessibilityLabel: string;
  grade?: SeasonalGradeDefinition;
  pulse: SharedValue<number>;
  state: RankTierVisualState;
};

export function RankTierPedestal({
  accessibilityLabel,
  grade,
  pulse,
  state,
}: RankTierPedestalProps) {
  const placement = state === 'placement' || state === 'placementComplete';
  const active = state === 'current' || state === 'placement';
  const accent = placement ? '#E8FF3D' : grade?.accent ?? '#79CAFF';
  const gradeState = grade ? definitionState(grade) : undefined;
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: active ? interpolate(pulse.value, [0, 1], [0.15, 0.28]) : 0,
    transform: [{ scale: active ? interpolate(pulse.value, [0, 1], [0.96, 1.06]) : 1 }],
  }));

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[styles.pedestalRoot, placement && styles.pedestalRootPlacement]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pedestalHalo,
          active && styles.pedestalHaloActive,
          placement && styles.pedestalHaloPlacement,
          { backgroundColor: accent },
          pulseStyle,
        ]}
      />
      {active ? (
        <Svg
          height={placement ? 128 : 112}
          pointerEvents="none"
          style={styles.activeContour}
          viewBox={`0 0 ${placement ? 184 : 158} ${placement ? 128 : 112}`}
          width={placement ? 184 : 158}
        >
          <Polygon
            fill={accent}
            fillOpacity={0.045}
            points={placement ? '92,38 166,65 92,88 18,65' : '79,34 139,57 79,77 19,57'}
            stroke={accent}
            strokeOpacity={0.82}
            strokeWidth={placement ? 1.4 : 1}
          />
        </Svg>
      ) : null}
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={PEDESTAL_ASSET}
        style={[
          styles.pedestalImage,
          placement && styles.pedestalImagePlacement,
          state === 'future' && styles.pedestalFuture,
          state === 'acquired' && styles.pedestalAcquired,
          state === 'placementComplete' && styles.pedestalPlacementComplete,
          active && styles.pedestalCurrent,
        ]}
      />
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          styles.emblem,
          placement && styles.emblemPlacement,
          state === 'future' && styles.pedestalFuture,
          state === 'acquired' && styles.pedestalAcquired,
          state === 'placementComplete' && styles.pedestalPlacementComplete,
        ]}
      >
        <RankEmblem
          grade={gradeState}
          placement={placement}
          size={placement ? 96 : 78}
        />
      </View>
    </View>
  );
}

function definitionState(grade: SeasonalGradeDefinition): SeasonalGradeState {
  return {
    classe: true,
    objectif_placements: 5,
    placements_restants: 0,
    progression: 1,
    cle: grade.key,
    libelle: grade.label,
    ordre: 0,
    minimum: grade.minimum,
    plafond: grade.maximum ?? undefined,
  };
}
