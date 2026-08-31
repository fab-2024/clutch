import {
  Canvas,
  Circle,
  FitBox,
  Group,
  LinearGradient,
  RadialGradient,
  Rect,
  rect,
  vec,
} from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import {
  cancelAnimation,
  Easing,
  runOnJS,
  type SharedValue,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { EquippedCosmetics } from '@/src/features/shop/types';

import type { ProfileTeam } from '../../types';
import ShowcaseAtmosphereFallback from './ShowcaseAtmosphereFallback';
import {
  resolveShowcaseAtmosphere,
  resolveShowcaseAtmosphereMode,
  showcaseAtmosphereColor,
  SHOWCASE_ATMOSPHERE_DROPPED_FRAME_LIMIT,
  SHOWCASE_ATMOSPHERE_FPS_FLOOR,
  SHOWCASE_ATMOSPHERE_SAMPLE_DURATION_MS,
  SHOWCASE_ATMOSPHERE_SAMPLE_WARMUP_MS,
  type ShowcaseAtmosphere,
  type ShowcaseAtmospherePerformanceReport,
  type ShowcaseAtmospherePerformanceStatus,
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

const ARTBOARD_WIDTH = 1_000;
const ARTBOARD_HEIGHT = 420;
const PERFORMANCE_FRAME_LIMIT_MS = 22;
const DUST = [
  [82, 344, 0.08, 0.75],
  [158, 252, 0.26, 0.45],
  [246, 365, 0.61, 0.58],
  [335, 226, 0.42, 0.38],
  [424, 318, 0.79, 0.72],
  [512, 188, 0.17, 0.42],
  [603, 350, 0.54, 0.64],
  [688, 238, 0.9, 0.4],
  [776, 370, 0.35, 0.7],
  [852, 270, 0.68, 0.5],
  [931, 336, 0.03, 0.62],
] as const;

export default function ShowcaseAtmosphereLayer({
  active,
  cosmetics,
  favoriteTeam,
  height,
  lightingAccent,
  onPerformanceReport,
  quality = 'auto',
  rankAccent,
  rankOrder,
  reduceMotion,
  width,
}: ShowcaseAtmosphereLayerProps) {
  const [performanceStatus, setPerformanceStatus] = useState<ShowcaseAtmospherePerformanceStatus>('untested');
  const atmosphere = useMemo(() => resolveShowcaseAtmosphere({
    cosmetics,
    favoriteTeam,
    lightingAccent,
    rankAccent,
    rankOrder,
  }), [cosmetics, favoriteTeam, lightingAccent, rankAccent, rankOrder]);
  const mode = resolveShowcaseAtmosphereMode({
    active,
    fullScreen: true,
    performanceStatus,
    platform: Platform.OS,
    quality,
    reduceMotion,
  });
  const handlePerformanceReport = useCallback((report: ShowcaseAtmospherePerformanceReport) => {
    setPerformanceStatus(report.passed ? 'passed' : 'failed');
    onPerformanceReport?.(report);
  }, [onPerformanceReport]);

  if (mode.kind === 'static') {
    return <ShowcaseAtmosphereFallback atmosphere={atmosphere} reason={mode.reason} />;
  }

  return (
    <View
      accessibilityElementsHidden
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      testID="showcase-atmosphere-animated"
    >
      <ShowcaseAtmosphereCanvas
        atmosphere={atmosphere}
        height={height}
        measurePerformance={performanceStatus === 'untested'}
        onPerformanceReport={handlePerformanceReport}
        width={width}
      />
    </View>
  );
}

function ShowcaseAtmosphereCanvas({
  atmosphere,
  height,
  measurePerformance,
  onPerformanceReport,
  width,
}: {
  atmosphere: ShowcaseAtmosphere;
  height: number;
  measurePerformance: boolean;
  onPerformanceReport: (report: ShowcaseAtmospherePerformanceReport) => void;
  width: number;
}) {
  const phase = useSharedValue(0);
  const impulse = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(phase);
    phase.value = 0;
    phase.value = withRepeat(
      withTiming(1, { duration: atmosphere.driftDurationMs, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(phase);
  }, [atmosphere.driftDurationMs, phase]);

  useEffect(() => {
    cancelAnimation(impulse);
    impulse.value = 0;
    if (atmosphere.effect === 'embers') {
      impulse.value = withSequence(
        withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      );
    } else if (atmosphere.effect === 'blue-wall') {
      impulse.value = withSequence(
        withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 750, easing: Easing.inOut(Easing.quad) }),
      );
    }
    return () => cancelAnimation(impulse);
  }, [atmosphere.effect, impulse]);

  const breath = useDerivedValue(() => (Math.sin(phase.value * Math.PI * 2) + 1) / 2);
  const rankRadius = useDerivedValue(() => 250 + breath.value * 18);
  const teamRadius = useDerivedValue(() => 230 + (1 - breath.value) * 16);
  const ambientOpacity = useDerivedValue(() => 0.78 + breath.value * 0.14);
  const sweepX = useDerivedValue(() => -260 + phase.value * 1_520);
  const sweepOpacity = useDerivedValue(() => (
    (0.24 + breath.value * 0.08) * (1 + impulse.value * 0.85)
  ));
  const sweepStart = useDerivedValue(() => vec(sweepX.value, 0));
  const sweepEnd = useDerivedValue(() => vec(sweepX.value + 190, 0));
  const blueWallOpacity = useDerivedValue(() => 0.12 + impulse.value * 0.72);
  const blueWallWidth = useDerivedValue(() => 320 + impulse.value * 500);
  const blueWallX = useDerivedValue(() => 500 - blueWallWidth.value / 2);

  return (
    <>
      {measurePerformance ? (
        <ShowcasePerformanceSampler onPerformanceReport={onPerformanceReport} />
      ) : null}
      <Canvas style={StyleSheet.absoluteFill}>
        <FitBox
          dst={rect(0, 0, Math.max(1, width), Math.max(1, height))}
          fit="fill"
          src={rect(0, 0, ARTBOARD_WIDTH, ARTBOARD_HEIGHT)}
        >
          <Group blendMode="screen" opacity={ambientOpacity}>
            <Circle cx={175} cy={212} r={rankRadius}>
              <RadialGradient
                c={vec(175, 212)}
                colors={[
                  showcaseAtmosphereColor(atmosphere.rankColor, atmosphere.intensity * 0.19),
                  showcaseAtmosphereColor(atmosphere.rankColor, atmosphere.intensity * 0.055),
                  'rgba(0,0,0,0)',
                ]}
                positions={[0, 0.46, 1]}
                r={268}
              />
            </Circle>
            <Circle cx={832} cy={198} r={teamRadius}>
              <RadialGradient
                c={vec(832, 198)}
                colors={[
                  showcaseAtmosphereColor(atmosphere.teamColor, atmosphere.intensity * 0.16),
                  showcaseAtmosphereColor(atmosphere.teamColor, atmosphere.intensity * 0.045),
                  'rgba(0,0,0,0)',
                ]}
                positions={[0, 0.5, 1]}
                r={248}
              />
            </Circle>
            <Circle cx={505} cy={172} r={168}>
              <RadialGradient
                c={vec(505, 172)}
                colors={[
                  showcaseAtmosphereColor(atmosphere.cosmeticColor, atmosphere.intensity * 0.1),
                  'rgba(0,0,0,0)',
                ]}
                positions={[0, 1]}
                r={168}
              />
            </Circle>
            <Rect height={620} opacity={sweepOpacity} width={190} x={sweepX} y={-100}>
              <LinearGradient
                colors={[
                  'rgba(0,0,0,0)',
                  showcaseAtmosphereColor(atmosphere.lightingColor, atmosphere.intensity * 0.14),
                  'rgba(0,0,0,0)',
                ]}
                end={sweepEnd}
                positions={[0, 0.5, 1]}
                start={sweepStart}
              />
            </Rect>
          </Group>

          {atmosphere.effect === 'blue-wall' ? (
            <Group blendMode="screen" opacity={blueWallOpacity}>
              <Rect height={5} width={blueWallWidth} x={blueWallX} y={286}>
                <LinearGradient
                  colors={['rgba(0,0,0,0)', '#168DFF', '#B9E3FF', '#168DFF', 'rgba(0,0,0,0)']}
                  end={vec(910, 286)}
                  positions={[0, 0.22, 0.5, 0.78, 1]}
                  start={vec(90, 286)}
                />
              </Rect>
              {[-196, -140, -84, -28, 28, 84, 140, 196].map((offset) => (
                <Rect
                  color={offset % 84 === 0 ? '#B9E3FF' : '#168DFF'}
                  height={190 - Math.abs(offset) * 0.3}
                  key={`blue-wall-column-${offset}`}
                  opacity={0.5}
                  width={2}
                  x={500 + offset}
                  y={96 + Math.abs(offset) * 0.14}
                />
              ))}
            </Group>
          ) : null}

          {DUST.slice(0, atmosphere.dustCount).map((particle, index) => (
            <AtmosphereDust
              atmosphere={atmosphere}
              index={index}
              key={`showcase-atmosphere-dust-${index}`}
              particle={particle}
              phase={phase}
              impulse={impulse}
            />
          ))}
        </FitBox>
      </Canvas>
    </>
  );
}

function ShowcasePerformanceSampler({
  onPerformanceReport,
}: {
  onPerformanceReport: (report: ShowcaseAtmospherePerformanceReport) => void;
}) {
  const sampledFrames = useSharedValue(0);
  const droppedFrames = useSharedValue(0);
  const reportSent = useSharedValue(false);

  useFrameCallback((frameInfo) => {
    if (reportSent.value) return;
    const elapsed = frameInfo.timeSinceFirstFrame;
    if (elapsed < SHOWCASE_ATMOSPHERE_SAMPLE_WARMUP_MS) return;

    if (frameInfo.timeSincePreviousFrame !== null) {
      sampledFrames.value += 1;
      if (frameInfo.timeSincePreviousFrame > PERFORMANCE_FRAME_LIMIT_MS) droppedFrames.value += 1;
    }

    const measuredDuration = elapsed - SHOWCASE_ATMOSPHERE_SAMPLE_WARMUP_MS;
    if (measuredDuration < SHOWCASE_ATMOSPHERE_SAMPLE_DURATION_MS) return;

    const frames = sampledFrames.value;
    const dropped = droppedFrames.value;
    const fps = frames / Math.max(0.001, measuredDuration / 1_000);
    const droppedFrameRatio = frames > 0 ? dropped / frames : 1;
    reportSent.value = true;
    runOnJS(onPerformanceReport)({
      droppedFrameRatio: Math.round(droppedFrameRatio * 1_000) / 1_000,
      fps: Math.round(fps * 10) / 10,
      passed: fps >= SHOWCASE_ATMOSPHERE_FPS_FLOOR
        && droppedFrameRatio <= SHOWCASE_ATMOSPHERE_DROPPED_FRAME_LIMIT,
      sampleDurationMs: Math.round(measuredDuration),
    });
  });

  return null;
}

function AtmosphereDust({
  atmosphere,
  index,
  particle,
  phase,
  impulse,
}: {
  atmosphere: ShowcaseAtmosphere;
  index: number;
  particle: (typeof DUST)[number];
  phase: SharedValue<number>;
  impulse: SharedValue<number>;
}) {
  const [baseX, baseY, offset, radius] = particle;
  const local = useDerivedValue(() => (phase.value + offset) % 1);
  const cx = useDerivedValue(() => baseX + Math.sin(local.value * Math.PI * 2 + index) * (7 + index % 3));
  const cy = useDerivedValue(() => baseY - local.value * (52 + index % 4 * 8));
  const opacity = useDerivedValue(() => {
    const fade = Math.sin(local.value * Math.PI);
    const emberBoost = atmosphere.effect === 'embers' ? 1 + impulse.value * 1.4 : 1;
    return Math.max(0, fade) * atmosphere.intensity * (index % 3 === 0 ? 0.7 : 0.43) * emberBoost;
  });

  return (
    <Circle
      color={index % 3 === 0 ? atmosphere.cosmeticColor : atmosphere.lightingColor}
      cx={cx}
      cy={cy}
      opacity={opacity}
      r={radius}
    />
  );
}
