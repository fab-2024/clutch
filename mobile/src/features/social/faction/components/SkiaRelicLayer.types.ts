import type { SharedValue } from 'react-native-reanimated';

import type { RelicStageArtworkConfig } from '@/src/features/social/faction/relicArtwork';
import type { RelicContainer } from '@/src/features/social/faction/types';

export type SkiaRelicLayerProps = {
  accent: string;
  config: RelicStageArtworkConfig;
  container: RelicContainer;
  energy: SharedValue<number>;
  instabilityEnergy: number;
  levelLift: number;
  mutation?: {
    fromConfig: RelicStageArtworkConfig;
    fromContainer: RelicContainer;
    phase: SharedValue<number>;
    toConfig: RelicStageArtworkConfig;
    toContainer: RelicContainer;
  } | null;
  phase: SharedValue<number>;
  reduceMotion: boolean;
  supporterPhase: SharedValue<number>;
  tapPhase: SharedValue<number>;
};
