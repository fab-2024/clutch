import { useId } from 'react';
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

import type { RelicStageArtworkConfig } from '@/src/features/social/faction/relicArtwork';
import type { RelicContainer } from '@/src/features/social/faction/types';

export function RelicStaticLiquidArtwork({
  config,
  container,
  levelLift = 0,
}: {
  config: RelicStageArtworkConfig;
  container: RelicContainer;
  levelLift?: number;
}) {
  const uniqueId = useId().replace(/:/g, '');
  const level = config.liquidLevel - Math.max(0, Math.min(55, levelLift * 3));
  const clipId = `relic-liquid-clip-${container}-${uniqueId}`;
  const depthId = `relic-liquid-depth-${container}-${uniqueId}`;
  const volumeId = `relic-liquid-volume-${container}-${uniqueId}`;
  const surfaceLeft = config.liquidSurfaceX - config.liquidSurfaceWidth * .42;
  const surfaceRight = config.liquidSurfaceX + config.liquidSurfaceWidth * .42;

  return (
    <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
      <Defs>
        <ClipPath id={clipId}><Path d={config.interiorPath} /></ClipPath>
        <SvgLinearGradient id={depthId} x1="0" x2="0" y1="0" y2="1">
          <Stop offset={0} stopColor="#6C2B91" stopOpacity=".3" />
          <Stop offset={0.46} stopColor="#35105A" stopOpacity=".42" />
          <Stop offset={1} stopColor="#0D0824" stopOpacity=".5" />
        </SvgLinearGradient>
        <RadialGradient cx="50%" cy="56%" id={volumeId} r="62%">
          <Stop offset={0} stopColor="#6C2B91" stopOpacity=".34" />
          <Stop offset={0.58} stopColor="#6C2B91" stopOpacity=".18" />
          <Stop offset={1} stopColor="#35105A" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Rect fill={`url(#${depthId})`} height={1000 - level} width="1000" y={level} />
        <Rect fill={`url(#${volumeId})`} height={1000 - level} width="1000" y={level} />
        <Path
          d={`M${surfaceLeft} ${level + 92} C${config.liquidSurfaceX - 58} ${level + 50} ${config.liquidSurfaceX - 18} ${level + 112} ${config.liquidSurfaceX + 22} ${level + 72} C${config.liquidSurfaceX + 52} ${level + 43} ${surfaceRight - 18} ${level + 76} ${surfaceRight} ${level + 96}`}
          fill="none"
          opacity=".22"
          stroke="#6C2B91"
          strokeLinecap="round"
          strokeWidth="4"
        />
        <Ellipse
          cx={config.liquidSurfaceX}
          cy={level}
          fill="#35105A"
          opacity=".42"
          rx={config.liquidSurfaceWidth / 2}
          ry="14"
        />
        <Ellipse
          cx={config.liquidSurfaceX}
          cy={level}
          fill="none"
          opacity=".68"
          rx={config.liquidSurfaceWidth / 2}
          ry="14"
          stroke="#6C2B91"
          strokeWidth="3"
        />
        <Path
          d={`M${surfaceLeft} ${level} C${config.liquidSurfaceX - config.liquidSurfaceWidth * .22} ${level + 10} ${config.liquidSurfaceX + config.liquidSurfaceWidth * .22} ${level + 10} ${surfaceRight} ${level}`}
          fill="none"
          opacity=".38"
          stroke="#31D7E2"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </G>
    </Svg>
  );
}
