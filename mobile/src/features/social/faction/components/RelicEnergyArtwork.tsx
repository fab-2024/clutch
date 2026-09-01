import { useId } from 'react';
import Svg, {
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import {
  relicLiquidLevelForRatio,
  relicLiquidMeniscusPathForLevel,
  relicLiquidSurfaceForLevel,
  relicLiquidVolumePathForLevel,
  type RelicStageArtworkConfig,
} from '@/src/features/social/faction/relicArtwork';
import type { RelicContainer } from '@/src/features/social/faction/types';

export function RelicStaticLiquidArtwork({
  config,
  container,
  fillRatio,
}: {
  config: RelicStageArtworkConfig;
  container: RelicContainer;
  fillRatio: number;
}) {
  const uniqueId = useId().replace(/:/g, '');
  const normalizedRatio = Math.max(0, Math.min(1, fillRatio));
  const level = relicLiquidLevelForRatio(config, normalizedRatio);
  const surface = relicLiquidSurfaceForLevel(config, level);
  const clipId = `relic-liquid-clip-${container}-${uniqueId}`;
  const depthId = `relic-liquid-depth-${container}-${uniqueId}`;
  const bodyId = `relic-liquid-body-${container}-${uniqueId}`;
  const edgeId = `relic-liquid-edge-${container}-${uniqueId}`;
  const sedimentId = `relic-liquid-sediment-${container}-${uniqueId}`;
  const volumeDepth = Math.max(0, config.liquidFloor - level);
  const volumePath = relicLiquidVolumePathForLevel(config, level, 10);
  const meniscusPath = relicLiquidMeniscusPathForLevel(config, level, 12);
  const sedimentLevel = Math.max(level, config.liquidFloor - Math.max(24, volumeDepth * .34));
  const sedimentPath = relicLiquidVolumePathForLevel(config, sedimentLevel, 12);
  const surfaceLeft = surface.left + surface.width * .12;
  const surfaceRight = surface.right - surface.width * .12;

  if (!volumePath) return null;

  return (
    <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
      <Defs>
        <ClipPath id={clipId}><Path d={config.interiorPath} /></ClipPath>
        <SvgLinearGradient id={depthId} x1="0" x2="0" y1="0" y2="1">
          <Stop offset={0} stopColor="#3A084A" stopOpacity=".82" />
          <Stop offset={.42} stopColor="#210329" stopOpacity=".9" />
          <Stop offset={1} stopColor="#08000C" stopOpacity=".96" />
        </SvgLinearGradient>
        <RadialGradient cx="48%" cy="28%" id={bodyId} r="78%">
          <Stop offset={0} stopColor="#713184" stopOpacity=".52" />
          <Stop offset={.38} stopColor="#431052" stopOpacity=".3" />
          <Stop offset={.72} stopColor="#1A0222" stopOpacity=".2" />
          <Stop offset={1} stopColor="#060009" stopOpacity=".54" />
        </RadialGradient>
        <SvgLinearGradient id={edgeId} x1="0" x2="1" y1="0" y2="0">
          <Stop offset={0} stopColor="#050008" stopOpacity=".78" />
          <Stop offset={.18} stopColor="#18021F" stopOpacity=".32" />
          <Stop offset={.46} stopColor="#9B65A9" stopOpacity=".09" />
          <Stop offset={.62} stopColor="#371043" stopOpacity=".12" />
          <Stop offset={1} stopColor="#040006" stopOpacity=".82" />
        </SvgLinearGradient>
        <SvgLinearGradient id={sedimentId} x1="0" x2="0" y1="0" y2="1">
          <Stop offset={0} stopColor="#18021F" stopOpacity=".08" />
          <Stop offset={.38} stopColor="#0A000E" stopOpacity=".48" />
          <Stop offset={1} stopColor="#030005" stopOpacity=".88" />
        </SvgLinearGradient>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Path
          d={volumePath}
          fill={`url(#${depthId})`}
          testID={`relic-liquid-volume-${container}`}
        />
        <Path d={volumePath} fill={`url(#${bodyId})`} />
        <Path d={volumePath} fill={`url(#${edgeId})`} />
        {sedimentPath ? <Path d={sedimentPath} fill={`url(#${sedimentId})`} /> : null}

        <Path
          d={`M${surface.left + surface.width * .16} ${level + volumeDepth * .2} C${surface.x - surface.width * .32} ${level + volumeDepth * .43} ${surface.x + surface.width * .18} ${level + volumeDepth * .58} ${surface.x + surface.width * .29} ${level + volumeDepth * .84}`}
          fill="none"
          opacity={.08 + normalizedRatio * .05}
          stroke="#B582C0"
          strokeLinecap="round"
          strokeWidth={Math.max(5, Math.min(13, surface.width * .075))}
        />
        <Path
          d={`M${surface.right - surface.width * .18} ${level + volumeDepth * .14} C${surface.x + surface.width * .3} ${level + volumeDepth * .34} ${surface.x - surface.width * .1} ${level + volumeDepth * .62} ${surface.x - surface.width * .24} ${level + volumeDepth * .9}`}
          fill="none"
          opacity=".1"
          stroke="#050008"
          strokeLinecap="round"
          strokeWidth={Math.max(7, Math.min(17, surface.width * .1))}
        />

        <Path d={meniscusPath} fill="#09000D" opacity=".84" />
        <Path d={meniscusPath} fill="#4A1458" opacity=".38" />
        <Path
          d={`M${surfaceLeft} ${level} C${surface.x - surface.width * .22} ${level + 10} ${surface.x + surface.width * .22} ${level + 10} ${surfaceRight} ${level}`}
          fill="none"
          opacity=".68"
          stroke="#8E4FA0"
          strokeLinecap="round"
          strokeWidth="2.3"
        />
        <Path
          d={`M${surface.x - surface.width * .24} ${level - 1} C${surface.x - surface.width * .1} ${level - 4} ${surface.x + surface.width * .03} ${level - 3.5} ${surface.x + surface.width * .14} ${level - .5}`}
          fill="none"
          opacity=".38"
          stroke="#D8BADF"
          strokeLinecap="round"
          strokeWidth="1.35"
        />
      </G>
    </Svg>
  );
}

export function RelicVesselForegroundArtwork({
  config,
  container,
}: {
  config: RelicStageArtworkConfig;
  container: RelicContainer;
}) {
  const uniqueId = useId().replace(/:/g, '');
  const paths = config.foregroundPaths;
  if (!paths?.length) return null;

  const clipId = `relic-foreground-clip-${container}-${uniqueId}`;

  return (
    <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
      <Defs>
        <ClipPath id={clipId}>
          {paths.map((path, index) => <Path d={path} key={`${container}-foreground-${index}`} />)}
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <SvgImage
          height="1000"
          href={config.asset}
          preserveAspectRatio="xMidYMid slice"
          width="1000"
          x="0"
          y="0"
        />
      </G>
    </Svg>
  );
}
