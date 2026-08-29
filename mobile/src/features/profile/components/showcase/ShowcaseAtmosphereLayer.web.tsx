import type { EquippedCosmetics } from '@/src/features/shop/types';

import type { ProfileTeam } from '../../types';
import ShowcaseAtmosphereFallback from './ShowcaseAtmosphereFallback';
import {
  resolveShowcaseAtmosphere,
  type ShowcaseAtmospherePerformanceReport,
  type ShowcaseAtmosphereQuality,
} from './showcaseAtmosphere';

export type ShowcaseAtmosphereLayerProps = {
  active: boolean;
  cosmetics?: EquippedCosmetics | null;
  favoriteTeam?: ProfileTeam | null;
  height: number;
  lightingAccent: string;
  onPerformanceReport?: (report: ShowcaseAtmospherePerformanceReport) => void;
  quality?: ShowcaseAtmosphereQuality;
  rankAccent: string;
  rankOrder?: number | null;
  reduceMotion: boolean;
  width: number;
};

export default function ShowcaseAtmosphereLayerWeb({
  cosmetics,
  favoriteTeam,
  lightingAccent,
  rankAccent,
  rankOrder,
}: ShowcaseAtmosphereLayerProps) {
  const atmosphere = resolveShowcaseAtmosphere({
    cosmetics,
    favoriteTeam,
    lightingAccent,
    rankAccent,
    rankOrder,
  });

  return <ShowcaseAtmosphereFallback atmosphere={atmosphere} reason="web" />;
}
