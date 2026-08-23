import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

import type {
  SeasonalGradeKey,
  SeasonalGradeState,
  SeasonalGradeSummary,
} from '../grades';
import { gradeAccent } from '../grades';

type Props = {
  grade?: SeasonalGradeState | SeasonalGradeSummary | null;
  placement?: boolean;
  size?: number;
};

const RANK_ASSETS: Record<SeasonalGradeKey, ImageSourcePropType> = {
  bronze: require('../../../../assets/rank/bronze-transparent.png'),
  argent: require('../../../../assets/rank/argent-transparent.png'),
  or: require('../../../../assets/rank/or-transparent.png'),
  platine: require('../../../../assets/rank/platine-transparent.png'),
  diamant: require('../../../../assets/rank/diamant-transparent.png'),
  mythique: require('../../../../assets/rank/mythique-transparent.png'),
};

/** Shared premium rank artwork used at every scale across the Rank experience. */
export function RankEmblem({ grade, placement = false, size = 72 }: Props) {
  const accent = gradeAccent(placement ? null : grade);
  const key = grade?.cle ?? 'bronze';

  return (
    <View
      accessibilityLabel={placement ? 'Emblème de placement' : 'Emblème ' + (grade?.libelle ?? 'classé')}
      style={[styles.root, { height: size, width: size }]}
    >
      {placement ? (
        <PlacementEmblem accent={accent} size={size} />
      ) : (
        <>
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
            source={RANK_ASSETS[key]}
            style={{ height: size, width: size }}
          />
        </>
      )}
    </View>
  );
}

function PlacementEmblem({ accent, size }: { accent: string; size: number }) {
  const shellSize = size * 0.62;
  return (
    <>
      <View
        style={[
          styles.placementAura,
          {
            borderColor: accent + '44',
            height: size * 0.82,
            width: size * 0.82,
          },
        ]}
      />
      <View
        style={[
          styles.placementShell,
          {
            borderColor: accent + '99',
            height: shellSize,
            width: shellSize,
          },
        ]}
      >
        <View
          style={[
            styles.placementCore,
            {
              backgroundColor: accent + '18',
              borderColor: accent + 'AA',
              height: shellSize * 0.52,
              width: shellSize * 0.52,
            },
          ]}
        />
      </View>
      <Text style={[styles.question, { color: accent, fontSize: size * 0.28 }]}>?</Text>
    </>
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
  placementAura: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    opacity: 0.5,
    transform: [{ rotate: '-12deg' }, { scaleX: 1.12 }],
  },
  placementShell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  placementCore: {
    borderRadius: 5,
    borderWidth: 1,
  },
  question: {
    fontFamily: 'SpaceMono_700Bold',
  },
});
