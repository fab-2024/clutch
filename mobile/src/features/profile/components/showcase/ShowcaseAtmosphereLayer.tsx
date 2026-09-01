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
  M8_SPARKLE_ARRIVAL_MS,
  M8_SPARKLE_FILIGREE_MS,
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
    } else if (atmosphere.effect === 'm8-sparkle') {
      impulse.value = withSequence(
        withTiming(0.42, { duration: M8_SPARKLE_FILIGREE_MS, easing: Easing.out(Easing.quad) }),
        withTiming(1, {
          duration: M8_SPARKLE_ARRIVAL_MS - M8_SPARKLE_FILIGREE_MS,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0, { duration: 350, easing: Easing.inOut(Easing.quad) }),
      );
    } else if (atmosphere.effect === 'neon-pulse') {
      impulse.value = withSequence(
        withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
        withTiming(0.18, { duration: 760, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) }),
      );
    } else if (atmosphere.effect === 'forge-resonance') {
      impulse.value = withSequence(
        withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }),
        withTiming(0.22, { duration: 820, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 460, easing: Easing.inOut(Easing.quad) }),
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
  const m8IdleSparkle = useDerivedValue(() => (
    Math.pow(Math.max(0, Math.sin(phase.value * Math.PI * 2)), 18) * 0.34
  ));
  const m8FiligreeOpacity = useDerivedValue(() => (
    Math.min(1, impulse.value / 0.42) * 0.42 + m8IdleSparkle.value * 0.24
  ));
  const m8StarOpacity = useDerivedValue(() => (
    Math.max(0, (impulse.value - 0.3) / 0.7) * 0.92 + m8IdleSparkle.value
  ));
  const neonPulseOpacity = useDerivedValue(() => (
    0.12 + impulse.value * 0.78 + breath.value * 0.08
  ));
  const neonPulseRadius = useDerivedValue(() => 54 + impulse.value * 210 + breath.value * 12);
  const forgeResonanceOpacity = useDerivedValue(() => (
    0.14 + impulse.value * 0.72 + breath.value * 0.1
  ));
  const forgeResonanceRadius = useDerivedValue(() => (
    72 + impulse.value * 205 + breath.value * 16
  ));

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

          {atmosphere.effect === 'm8-sparkle' ? (
            <Group blendMode="screen">
              <Group opacity={m8FiligreeOpacity}>
                <Circle
                  color="#B9DCFF"
                  cx={500}
                  cy={335}
                  r={205}
                  style="stroke"
                  strokeWidth={2}
                />
                <Circle
                  color="#EAF5FF"
                  cx={500}
                  cy={335}
                  r={142}
                  style="stroke"
                  strokeWidth={1}
                />
                <Rect color="#B9DCFF" height={1} opacity={0.72} width={520} x={240} y={334} />
              </Group>
              <Group opacity={m8StarOpacity}>
                <Circle cx={500} cy={103} r={64}>
                  <RadialGradient
                    c={vec(500, 103)}
                    colors={['rgba(234,245,255,.72)', 'rgba(185,220,255,.18)', 'rgba(0,0,0,0)']}
                    positions={[0, 0.38, 1]}
                    r={64}
                  />
                </Circle>
                <Rect color="#F7FBFF" height={116} width={3} x={498.5} y={45} />
                <Rect color="#F7FBFF" height={3} width={116} x={442} y={101.5} />
                <Circle color="#FFFFFF" cx={500} cy={103} r={5} />
                <Circle color="#DDEEFF" cx={277} cy={133} r={2.2} />
                <Circle color="#DDEEFF" cx={742} cy={151} r={2.4} />
              </Group>
            </Group>
          ) : null}

          {atmosphere.effect === 'neon-pulse' ? (
            <Group blendMode="screen" opacity={neonPulseOpacity}>
              <Circle
                color="#58DFFF"
                cx={500}
                cy={245}
                r={neonPulseRadius}
                style="stroke"
                strokeWidth={3}
              />
              <Circle
                color="#E27AFF"
                cx={500}
                cy={245}
                r={118}
                style="stroke"
                strokeWidth={2}
              />
              <Rect color="#58DFFF" height={2} width={650} x={175} y={244} />
              <Rect color="#E27AFF" height={1} opacity={0.8} width={430} x={285} y={250} />
              <Circle color="#FFFFFF" cx={500} cy={245} r={5} />
            </Group>
          ) : null}

          {atmosphere.effect === 'forge-resonance' ? (
            <Group blendMode="screen" opacity={forgeResonanceOpacity}>
              <Circle
                color="#F06A3A"
                cx={500}
                cy={282}
                r={forgeResonanceRadius}
                style="stroke"
                strokeWidth={3}
              />
              <Circle
                color="#43BFC1"
                cx={500}
                cy={282}
                r={132}
                style="stroke"
                strokeWidth={1.5}
              />
              <Circle
                color="#FFB06F"
                cx={500}
                cy={282}
                r={72}
                style="stroke"
                strokeWidth={1}
              />
              <Rect color="#F06A3A" height={2} width={590} x={205} y={281} />
              <Rect color="#43BFC1" height={1} opacity={0.72} width={390} x={305} y={287} />
              {[-172, -112, -54, 54, 112, 172].map((offset, index) => (
                <Rect
                  color={index % 2 === 0 ? '#F06A3A' : '#FFB06F'}
                  height={index % 2 === 0 ? 26 : 18}
                  key={`forge-resonance-fissure-${offset}`}
                  opacity={0.72}
                  width={2}
                  x={499 + offset}
                  y={282 - (index % 2 === 0 ? 10 : 4)}
                />
              ))}
              <Circle color="#FFF3DF" cx={500} cy={282} r={5} />
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
