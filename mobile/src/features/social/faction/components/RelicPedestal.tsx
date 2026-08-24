import { Image, StyleSheet, View } from 'react-native';

import TeamLogo from '@/src/features/onboarding/components/TeamLogo';
import type { CommunityFaction } from '@/src/features/social/faction/types';

const PEDESTAL_ASSET = require('../../../../../assets/social/faction-relic-pedestal.png');

const PEDESTAL_TOP = 231;
const PEDESTAL_WIDTH = 286;
const PEDESTAL_HEIGHT = 143;
const FRONT_LIP_OFFSET = 41;
const FRONT_LIP_HEIGHT = 7;

type RelicPedestalProps = {
  accent: string;
  faction: CommunityFaction | null;
};

export default function RelicPedestal({ accent, faction }: RelicPedestalProps) {
  return (
    <View pointerEvents="none" style={[styles.frame, styles.medallionLayer]}>
      <View style={styles.logoSocket}>
        {faction ? (
          <TeamLogo
            accent={accent}
            contentScale={0.92}
            frameless
            name={faction.nom}
            size={34}
            tag={faction.tag}
            uri={faction.logo}
          />
        ) : (
          <View style={[styles.emptyGem, { backgroundColor: accent }]} />
        )}
      </View>
    </View>
  );
}

export function RelicPedestalBack() {
  return (
    <View pointerEvents="none" style={[styles.frame, styles.backLayer]}>
      <PedestalImage />
    </View>
  );
}

export function RelicPedestalFrontLip() {
  return (
    <View pointerEvents="none" style={styles.frontLipMask}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={PEDESTAL_ASSET}
        style={styles.frontLipAsset}
      />
    </View>
  );
}

function PedestalImage() {
  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={PEDESTAL_ASSET}
      style={styles.asset}
    />
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    top: PEDESTAL_TOP,
    width: PEDESTAL_WIDTH,
    height: PEDESTAL_HEIGHT,
  },
  backLayer: { zIndex: 3 },
  asset: {
    width: '100%',
    height: '100%',
  },
  frontLipMask: {
    position: 'absolute',
    zIndex: 6,
    top: PEDESTAL_TOP + FRONT_LIP_OFFSET,
    width: PEDESTAL_WIDTH,
    height: FRONT_LIP_HEIGHT,
    overflow: 'hidden',
  },
  frontLipAsset: {
    position: 'absolute',
    top: -FRONT_LIP_OFFSET,
    width: PEDESTAL_WIDTH,
    height: PEDESTAL_HEIGHT,
  },
  medallionLayer: { zIndex: 8 },
  logoSocket: {
    position: 'absolute',
    left: 123,
    top: 55,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyGem: {
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
    boxShadow: '0 0 10px rgba(216,142,82,.4)',
  },
});
