import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';

import type {
  SeasonalGradeKey,
  SeasonalGradeState,
  SeasonalGradeSummary,
} from '../grades';
import { gradeDefinition } from '../grades';

type Props = {
  decorative?: boolean;
  grade?: SeasonalGradeState | SeasonalGradeSummary | null;
  size?: number;
};

const RANK_ASSETS: Record<SeasonalGradeKey, ImageSourcePropType> = {
  bronze: require('../../../../assets/rank/bronze-transparent.png'),
  argent: require('../../../../assets/rank/argent-transparent.png'),
  or: require('../../../../assets/rank/or-transparent.png'),
  platine: require('../../../../assets/rank/platine-transparent.png'),
  diamant: require('../../../../assets/rank/diamant-transparent.png'),
  mythique: require('../../../../assets/rank/mythique-transparent.png'),
  eternel: require('../../../../assets/rank/eternel-transparent.png'),
};

export function rankEmblemSource(key?: SeasonalGradeKey) {
  return RANK_ASSETS[key ?? 'bronze'];
}

/** Shared premium rank artwork used at every scale across the app. */
export function RankEmblem({ decorative = false, grade, size = 72 }: Props) {
  const key = grade?.cle ?? 'bronze';
  const accent = gradeDefinition(key)?.accent ?? '#C57943';
  const label = grade?.libelle ?? 'Bronze';

  return (
    <View
      accessibilityElementsHidden={decorative || undefined}
      accessibilityLabel={decorative ? undefined : `Emblème ${label}`}
      accessible={!decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : undefined}
      style={[styles.root, { height: size, width: size }]}
    >
      <View
        style={[
          styles.aura,
          {
            backgroundColor: accent,
            height: size * 0.72,
            width: size * 0.72,
          },
        ]}
      />
      <Image
        resizeMode="contain"
        source={rankEmblemSource(key)}
        style={{ height: size, width: size }}
        testID="rank-emblem-image"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.2,
  },
});
