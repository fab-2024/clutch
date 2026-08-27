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
import { gradeAccent, ZERO_RANK_ACCENT } from '../grades';

type Props = {
  grade?: SeasonalGradeState | SeasonalGradeSummary | null;
  size?: number;
  starting?: boolean;
};

const ZERO_RANK_ASSET = require('../../../../assets/rank/rank-zero-badge-v1.png');

const RANK_ASSETS: Record<SeasonalGradeKey, ImageSourcePropType> = {
  bronze: require('../../../../assets/rank/bronze-transparent.png'),
  argent: require('../../../../assets/rank/argent-transparent.png'),
  or: require('../../../../assets/rank/or-transparent.png'),
  platine: require('../../../../assets/rank/platine-transparent.png'),
  diamant: require('../../../../assets/rank/diamant-transparent.png'),
  mythique: require('../../../../assets/rank/mythique-transparent.png'),
};

/** Shared premium rank artwork used at every scale across the Rank experience. */
export function RankEmblem({ grade, size = 72, starting = false }: Props) {
  const accent = starting ? ZERO_RANK_ACCENT : gradeAccent(grade);
  const key = grade?.cle ?? 'bronze';

  return (
    <View
      accessibilityLabel={starting ? 'Emblème de départ, zéro Frag' : 'Emblème ' + (grade?.libelle ?? 'classé')}
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
        source={starting ? ZERO_RANK_ASSET : RANK_ASSETS[key]}
        style={{ height: size, width: size }}
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
