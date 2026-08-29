import {
  BlurMask,
  Canvas,
  Circle,
  ColorMatrix,
  DashPathEffect,
  Fill,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Oval,
  Path,
  RadialGradient,
  Rect,
  Shader,
  Skia,
  SweepGradient,
  type SkImage,
  type Transforms3d,
  useImage,
  usePathValue,
  vec,
} from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import {
  RELIC_HEART_ASSET,
  rootBranchesForContainer,
  type RootBranch,
} from '@/src/features/social/faction/relicArtwork';
import {
  SKIA_MAX_BOILING_BUBBLES,
  skiaBoilingBubbleCount,
  skiaHeartInstability,
  skiaMutationSurge,
  skiaRamificationLevel,
  skiaStageProgress,
  skiaTapHeatEnvelope,
} from '@/src/features/social/faction/relicSkiaMotion';

import type { SkiaRelicLayerProps } from './SkiaRelicLayer.types';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 270;
const TWO_PI = Math.PI * 2;
const PARTICLE_COUNT = 12;
const PARTICLE_INDICES = Array.from({ length: PARTICLE_COUNT }, (_, index) => index);
const BOILING_BUBBLE_INDICES = Array.from({ length: SKIA_MAX_BOILING_BUBBLES }, (_, index) => index);
const TAP_BUBBLE_INDICES = Array.from({ length: 12 }, (_, index) => index);
const SHOCKWAVE_INDICES = [0, 1, 2] as const;
const FILAMENT_ANGLE_OFFSETS = [
  0,
  -.22,
  .22,
  -.46,
  .46,
  -.72,
  .72,
  -.98,
  .98,
  -1.24,
  1.24,
  -1.5,
  1.5,
  -1.76,
  1.76,
  -2.04,
  2.04,
  -2.34,
  2.34,
  Math.PI,
] as const;
const FILAMENT_INDICES = FILAMENT_ANGLE_OFFSETS.map((_, index) => index);
const FILAMENT_COLORS = ['#B84B14', '#D96418', '#F07A20', '#FF9638'] as const;
const CYAN_HEART_MATRIX = [
  .05, .05, .05, 0, 0,
  .42, .42, .42, 0, .02,
  .58, .58, .58, 0, .08,
  0, 0, 0, 1, 0,
];
const MAGENTA_HEART_MATRIX = [
  .58, .58, .58, 0, .04,
  .04, .04, .04, 0, 0,
  .44, .44, .44, 0, .04,
  0, 0, 0, 1, 0,
];
const CHECKERBOARD_KEY_MATRIX = [
  1.08, 0, 0, 0, -.025,
  0, 1.08, 0, 0, -.025,
  0, 0, 1.08, 0, -.025,
  -1.45, -1.45, -1.45, 0, 4.05,
];

const FLUID_EFFECT = Skia.RuntimeEffect.Make(`
  uniform float2 resolution;
  uniform float time;
  uniform float energy;
  uniform float instability;
  uniform float heat;
  uniform float stage;
  uniform float supporter;
  uniform float mutation;
  uniform float surfaceY;
  uniform float bottomY;
  uniform float centerX;
  uniform float halfWidth;

  float circleGlow(float2 point, float2 center, float radius, float softness) {
    return 1.0 - smoothstep(radius, radius + softness, distance(point, center));
  }

  half4 main(float2 point) {
    float wave = sin((point.x - centerX) * 0.11 + time * 1.8) * (1.6 + energy * 2.2 + heat * 2.8);
    wave += sin((point.x - centerX) * 0.047 - time * 1.15) * 1.2;
    float depth = clamp((point.y - surfaceY) / max(1.0, bottomY - surfaceY), 0.0, 1.0);
    float vesselWidth = halfWidth * (0.78 + sin(depth * 3.14159265) * 0.28);
    float sideMask = 1.0 - smoothstep(vesselWidth - 3.0, vesselWidth + 1.5, abs(point.x - centerX));
    float topMask = smoothstep(surfaceY + wave - 1.5, surfaceY + wave + 2.2, point.y);
    float bottomMask = 1.0 - smoothstep(bottomY - 3.0, bottomY + 1.0, point.y);
    float liquid = sideMask * topMask * bottomMask;

    float violetBand = 0.5 + 0.5 * sin(point.y * 0.085 + point.x * 0.025 - time * 1.6);
    float caustic = pow(max(0.0, sin(point.x * 0.12 + point.y * 0.055 + time * 2.4)), 7.0);
    float boilNoise = pow(max(0.0, sin(point.x * 0.19 - time * 3.7) * sin(point.y * 0.16 + time * 2.9)), 9.0);
    half3 deep = half3(0.025, 0.006, 0.075);
    half3 violet = half3(0.24, 0.04, 0.36);
    half3 cyan = half3(0.022, 0.28, 0.32);
    half3 liquidColor = mix(deep, violet, 0.38 + violetBand * 0.25);
    liquidColor += cyan * caustic * (0.025 + instability * 0.06 + energy * 0.08);

    float2 core = float2(centerX, bottomY - 31.0);
    float coreGlow = circleGlow(point, core, 15.0 + energy * 5.0, 31.0);
    float thermalField = circleGlow(point, core, 10.0 + stage * 2.2, 48.0);
    float ringDistance = abs(distance(point, core) - (23.0 + energy * 18.0));
    float ring = 1.0 - smoothstep(0.7, 3.0, ringDistance);
    float arrival = supporter * circleGlow(point, core, 9.0, 42.0);
    float mutationWave = sin(clamp((mutation - 0.18) / 0.62, 0.0, 1.0) * 3.14159265);
    float mutationRingDistance = abs(distance(point, core) - (12.0 + mutation * 86.0));
    float mutationRing = (1.0 - smoothstep(0.8, 4.0, mutationRingDistance)) * mutationWave;
    half3 coreColor = half3(0.88, 0.28, 0.035) * coreGlow * (0.16 + energy * 0.32 + heat * 0.16);
    half3 heatColor = half3(0.72, 0.11, 0.018) * thermalField * (heat * 0.42 + (stage - 1.0) * 0.018);
    half3 boilColor = half3(0.72, 0.3, 0.055) * boilNoise * liquid * depth * (0.025 + heat * 0.18 + stage * 0.012);
    half3 ringColor = half3(0.08, 0.48, 0.54) * ring * (0.1 + energy * 0.3);
    half3 arrivalColor = half3(0.4, 0.13, 0.56) * arrival * 0.42;
    half3 mutationColor = mix(half3(0.08, 0.5, 0.56), half3(0.76, 0.24, 0.04), mutation) * mutationRing * 0.58;

    float surfaceLine = 1.0 - smoothstep(0.0, 1.6, abs(point.y - surfaceY - wave));
    half3 surfaceColor = mix(half3(0.32, 0.055, 0.48), half3(0.045, 0.39, 0.44), caustic);
    surfaceColor = mix(surfaceColor, half3(0.62, 0.18, 0.025), heat * 0.25);
    half3 color = liquidColor * liquid * 0.76;
    color += surfaceColor * surfaceLine * sideMask * 0.38;
    color += coreColor + heatColor + boilColor + ringColor + arrivalColor + mutationColor;
    color *= 1.0 - mutationWave * 0.18;
    float alpha = liquid * 0.82 + surfaceLine * sideMask * 0.32 + coreGlow * 0.2 + thermalField * heat * 0.08 + boilNoise * heat * 0.07 + ring * 0.2 + arrival * 0.16 + mutationRing * 0.44;
    return half4(color, clamp(alpha, 0.0, 0.9));
  }
`);

export default function SkiaRelicCanvas({
  config,
  container,
  energy,
  instabilityEnergy,
  levelLift,
  mutation,
  phase,
  reduceMotion,
  supporterPhase,
  tapPhase,
}: SkiaRelicLayerProps) {
  const baseConfig = mutation?.fromConfig ?? config;
  const baseContainer = mutation?.fromContainer ?? container;
  const targetConfig = mutation?.toConfig ?? baseConfig;
  const targetContainer = mutation?.toContainer ?? baseContainer;
  const mutationPhase = mutation?.phase;
  const mutationEnabled = mutation ? 1 : 0;
  const vesselImage = useImage(baseConfig.asset as number);
  const targetVesselImage = useImage(targetConfig.asset as number);
  const heartImage = useImage(RELIC_HEART_ASSET);
  const branches = rootBranchesForContainer(baseContainer);
  const targetBranches = rootBranchesForContainer(targetContainer);
  const metrics = relicCanvasMetrics(baseConfig, levelLift);
  const targetMetrics = relicCanvasMetrics(targetConfig, levelLift);
  const {
    assetX,
    bottomY,
    centerX,
    halfWidth,
    heartSize,
    heartY,
    rootsScaleX,
    rootsScaleY,
    rootsX,
    rootsY,
    surfaceY,
  } = metrics;

  const mutationProgress = useDerivedValue(() => mutationPhase ? clamp01(mutationPhase.value) : 0, [mutationPhase]);
  const morphProgress = useDerivedValue(() => smoothSegment(mutationProgress.value, .38, .72));
  const evolvedStage = useDerivedValue(() => lerp(baseConfig.stage, targetConfig.stage, morphProgress.value), [baseConfig.stage, targetConfig.stage]);
  const tapHeat = useDerivedValue(() => skiaTapHeatEnvelope(tapPhase.value));
  const mutationEnergy = useDerivedValue(() => mutationEnabled ? skiaMutationSurge(mutationProgress.value) : 0, [mutationEnabled]);
  const visualEnergy = useDerivedValue(() => Math.min(1.35,
    Math.max(0, energy.value) + tapHeat.value * .32 + mutationEnergy.value * .72));
  const thermalEnergy = useDerivedValue(() => clamp01(
    skiaStageProgress(evolvedStage.value) * .2 + tapHeat.value * .86 + mutationEnergy.value * .28,
  ));
  const oldVesselOpacity = useDerivedValue(() => mutationEnabled
    ? 1 - smoothSegment(mutationProgress.value, .24, .5)
    : 1, [mutationEnabled]);
  const newVesselOpacity = useDerivedValue(() => mutationEnabled
    ? smoothSegment(mutationProgress.value, .38, .66)
    : 0, [mutationEnabled]);
  const oldVesselBackOpacity = useDerivedValue(() => oldVesselOpacity.value * (baseConfig.neutralMatte ? .74 : .96), [baseConfig.neutralMatte]);
  const newVesselBackOpacity = useDerivedValue(() => newVesselOpacity.value * (targetConfig.neutralMatte ? .74 : .96), [targetConfig.neutralMatte]);
  const oldVesselFrontOpacity = useDerivedValue(() => oldVesselOpacity.value * .96);
  const newVesselFrontOpacity = useDerivedValue(() => newVesselOpacity.value * .96);
  const oldRootOpacity = useDerivedValue(() => rootEnergy(instabilityEnergy, visualEnergy.value, supporterPhase.value)
    * (mutationEnabled ? 1 - smoothSegment(mutationProgress.value, .16, .4) : 1), [instabilityEnergy, mutationEnabled]);
  const newRootOpacity = useDerivedValue(() => rootEnergy(instabilityEnergy, visualEnergy.value, supporterPhase.value)
    * (mutationEnabled ? smoothSegment(mutationProgress.value, .52, .84) : 0), [instabilityEnergy, mutationEnabled]);
  const targetVesselTransform = useDerivedValue(() => {
    if (reduceMotion) return [{ translateY: 0 }, { rotate: 0 }, { scaleX: 1 }, { scaleY: 1 }];
    const reveal = smoothSegment(mutationProgress.value, .38, .72);
    const settle = smoothSegment(mutationProgress.value, .72, 1);
    const overshoot = Math.sin(reveal * Math.PI);
    return [
      { translateY: (1 - reveal) * 20 - overshoot * 12 },
      { rotate: (1 - reveal) * -.18 + overshoot * .11 - settle * .015 },
      { scaleX: .54 + reveal * .58 - settle * .12 },
      { scaleY: .38 + reveal * .75 - settle * .13 },
    ];
  }, [reduceMotion]);
  const oldVesselTransform = useDerivedValue(() => {
    if (reduceMotion) return [{ translateY: 0 }, { rotate: 0 }, { scaleX: 1 }, { scaleY: 1 }];
    const collapse = smoothSegment(mutationProgress.value, .15, .48);
    const torsion = Math.sin(collapse * Math.PI);
    return [
      { translateY: collapse * 12 },
      { rotate: torsion * .12 + collapse * .035 },
      { scaleX: 1 + torsion * .14 - collapse * .1 },
      { scaleY: 1 - collapse * .58 },
    ];
  }, [reduceMotion]);

  const shaderUniforms = useDerivedValue(() => ({
    resolution: [CANVAS_WIDTH, CANVAS_HEIGHT],
    time: reduceMotion ? 1.35 : phase.value * TWO_PI,
    energy: visualEnergy.value,
    instability: Math.min(1, Math.max(0, instabilityEnergy)),
    heat: thermalEnergy.value,
    stage: evolvedStage.value,
    supporter: supporterEnvelope(supporterPhase.value),
    mutation: mutationProgress.value,
    surfaceY: lerp(surfaceY, targetMetrics.surfaceY, morphProgress.value),
    bottomY: lerp(bottomY, targetMetrics.bottomY, morphProgress.value),
    centerX: lerp(centerX, targetMetrics.centerX, morphProgress.value),
    halfWidth: lerp(halfWidth, targetMetrics.halfWidth, morphProgress.value),
  }), [bottomY, centerX, halfWidth, instabilityEnergy, reduceMotion, surfaceY, targetMetrics.bottomY, targetMetrics.centerX, targetMetrics.halfWidth, targetMetrics.surfaceY]);

  const animatedHeartX = useDerivedValue(() => lerp(centerX, targetMetrics.centerX, morphProgress.value), [centerX, targetMetrics.centerX]);
  const animatedHeartY = useDerivedValue(() => lerp(heartY, targetMetrics.heartY, morphProgress.value), [heartY, targetMetrics.heartY]);
  const animatedHeartSize = useDerivedValue(() => lerp(heartSize, targetMetrics.heartSize, morphProgress.value), [heartSize, targetMetrics.heartSize]);
  const heartCenter = useDerivedValue(() => ({ x: animatedHeartX.value, y: animatedHeartY.value }));
  const heartImageX = useDerivedValue(() => animatedHeartX.value - animatedHeartSize.value / 2);
  const heartImageY = useDerivedValue(() => animatedHeartY.value - animatedHeartSize.value / 2);
  const heartInstability = useDerivedValue(() => skiaHeartInstability(
    evolvedStage.value,
    instabilityEnergy,
    visualEnergy.value,
    mutationEnergy.value,
  ), [instabilityEnergy]);
  const heartTransform = useDerivedValue(() => {
    const heartTimeline = phase.value
      + tapPhase.value * .62
      + mutationProgress.value * 1.35;
    const beat = reduceMotion ? 0 : doubleBeat(heartTimeline);
    const interaction = Math.min(1.2, Math.max(0, visualEnergy.value));
    const instability = heartInstability.value;
    const secondary = reduceMotion ? 0 : Math.cos(heartTimeline * TWO_PI * (4.1 + instability * 1.1) + .8);
    const arrhythmia = reduceMotion ? 0 : Math.max(0, Math.sin(heartTimeline * TWO_PI * 7.7 - .4)) * instability;
    const baseScale = 1 + beat * (.075 + instability * .035) + arrhythmia * .025 + interaction * .1;
    return [
      { scaleX: baseScale + secondary * instability * .065 },
      { scaleY: baseScale - secondary * instability * .048 },
    ];
  }, [reduceMotion]);
  const cyanGhostTransform = useDerivedValue(() => {
    const intensity = heartInstability.value;
    const timeline = phase.value + tapPhase.value * .7 + mutationProgress.value;
    const jitter = reduceMotion ? .45 : Math.sin(timeline * TWO_PI * 5.3) * .85 + .7;
    return [{ translateX: -intensity * jitter * 4.3 }, { translateY: intensity * jitter * 1.1 }];
  }, [reduceMotion]);
  const magentaGhostTransform = useDerivedValue(() => {
    const intensity = heartInstability.value;
    const timeline = phase.value + tapPhase.value * .7 + mutationProgress.value;
    const jitter = reduceMotion ? .45 : Math.cos(timeline * TWO_PI * 4.7 + .6) * .85 + .7;
    return [{ translateX: intensity * jitter * 4.6 }, { translateY: -intensity * jitter * 1.2 }];
  }, [reduceMotion]);
  const chromaticGhostOpacity = useDerivedValue(() => {
    const timeline = phase.value + tapPhase.value * .7 + mutationProgress.value;
    const flicker = reduceMotion ? .72 : .52 + Math.abs(Math.sin(timeline * TWO_PI * 3.7)) * .48;
    return heartInstability.value * .44 * flicker;
  }, [reduceMotion]);
  const heartMainOpacity = useDerivedValue(() => {
    const timeline = phase.value + tapPhase.value * .7 + mutationProgress.value;
    const flicker = reduceMotion ? 0 : Math.max(0, Math.sin(timeline * TWO_PI * 7.1));
    return 1 - heartInstability.value * flicker * .17;
  }, [reduceMotion]);
  const auraRadius = useDerivedValue(() => animatedHeartSize.value * .52 + doubleBeat(reduceMotion ? .13 : phase.value + tapPhase.value * .62) * 6 + visualEnergy.value * 11 + thermalEnergy.value * 7, [reduceMotion]);
  const auraOpacity = useDerivedValue(() => .2 + doubleBeat(reduceMotion ? .13 : phase.value + tapPhase.value * .62) * .26 + visualEnergy.value * .3 + thermalEnergy.value * .12, [reduceMotion]);
  const pulseRadius = useDerivedValue(() => animatedHeartSize.value * .46 + doubleBeat(reduceMotion ? .13 : phase.value + tapPhase.value * .62) * 28 + visualEnergy.value * 22, [reduceMotion]);
  const pulseOpacity = useDerivedValue(() => Math.min(.9, doubleBeat(reduceMotion ? .13 : phase.value + tapPhase.value * .62) * .56 + visualEnergy.value * .42), [reduceMotion]);
  const thermalHaloRadius = useDerivedValue(() => animatedHeartSize.value * .55 + thermalEnergy.value * 31 + skiaStageProgress(evolvedStage.value) * 10);
  const thermalHaloOpacity = useDerivedValue(() => .05 + thermalEnergy.value * .42 + mutationEnergy.value * .18);
  const rootDashPhase = useDerivedValue(() => reduceMotion ? 0 : -(phase.value * 86 + supporterPhase.value * 38), [reduceMotion]);
  const orbitDashPhase = useDerivedValue(() => reduceMotion ? 0 : phase.value * 96 + energy.value * 22, [reduceMotion]);
  const orbitOpacity = useDerivedValue(() => .14 + instabilityEnergy * .22 + visualEnergy.value * .34 + mutationEnergy.value * .18, [instabilityEnergy]);
  const surfaceRect = useDerivedValue(() => {
    const timeline = phase.value * TWO_PI * 2 + tapPhase.value * Math.PI * 2.6 + mutationProgress.value * Math.PI * 4;
    const wave = reduceMotion ? 0 : Math.sin(timeline) * (1.2 + visualEnergy.value * 1.8 + thermalEnergy.value * 2.4);
    const x = lerp(centerX, targetMetrics.centerX, morphProgress.value);
    const y = lerp(surfaceY, targetMetrics.surfaceY, morphProgress.value);
    const radius = lerp(halfWidth, targetMetrics.halfWidth, morphProgress.value);
    return {
      x: x - radius,
      y: y - 4 + wave,
      width: radius * 2,
      height: 8,
    };
  }, [centerX, halfWidth, reduceMotion, surfaceY, targetMetrics.centerX, targetMetrics.halfWidth, targetMetrics.surfaceY]);
  const surfaceGradientStart = useDerivedValue(() => ({
    x: lerp(centerX - halfWidth, targetMetrics.centerX - targetMetrics.halfWidth, morphProgress.value),
    y: lerp(surfaceY, targetMetrics.surfaceY, morphProgress.value),
  }), [centerX, halfWidth, surfaceY, targetMetrics.centerX, targetMetrics.halfWidth, targetMetrics.surfaceY]);
  const surfaceGradientEnd = useDerivedValue(() => ({
    x: lerp(centerX + halfWidth, targetMetrics.centerX + targetMetrics.halfWidth, morphProgress.value),
    y: lerp(surfaceY, targetMetrics.surfaceY, morphProgress.value),
  }), [centerX, halfWidth, surfaceY, targetMetrics.centerX, targetMetrics.halfWidth, targetMetrics.surfaceY]);
  const mutationFlashRadius = useDerivedValue(() => 14 + smoothSegment(mutationProgress.value, .12, .86) * 132);
  const mutationFlashOpacity = useDerivedValue(() => {
    if (!mutationEnabled) return 0;
    const envelope = Math.sin(smoothSegment(mutationProgress.value, .12, .86) * Math.PI);
    return envelope * (reduceMotion ? .28 : .92);
  }, [mutationEnabled, reduceMotion]);
  const glintOpacity = useDerivedValue(() => .055 + visualEnergy.value * .025);
  const oldGlintOpacity = useDerivedValue(() => glintOpacity.value
    * (mutationEnabled ? 1 - smoothSegment(mutationProgress.value, .34, .58) : 1), [mutationEnabled]);
  const newGlintOpacity = useDerivedValue(() => glintOpacity.value
    * (mutationEnabled ? smoothSegment(mutationProgress.value, .5, .76) : 0), [mutationEnabled]);

  return (
    <Canvas accessibilityLabel="Animation GPU Skia de la relique" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
      <Rect height={CANVAS_HEIGHT} width={CANVAS_WIDTH} x={0} y={0}>
        <RadialGradient
          c={vec(CANVAS_WIDTH / 2, 138)}
          colors={['rgba(11,25,32,.6)', 'rgba(4,10,15,.38)', 'rgba(0,1,3,0)']}
          positions={[0, .56, 1]}
          r={228}
        />
      </Rect>
      <Circle color="rgba(67,44,88,.16)" cx={CANVAS_WIDTH / 2} cy={140} r={120}>
        <RadialGradient
          c={vec(CANVAS_WIDTH / 2, 140)}
          colors={['rgba(80,48,105,.2)', 'rgba(29,72,80,.11)', 'rgba(0,0,0,0)']}
          positions={[0, .46, 1]}
          r={120}
        />
        <BlurMask blur={18} style="normal" />
      </Circle>
      <Oval color="rgba(0,0,0,.78)" rect={{ x: 34, y: 218, width: 292, height: 48 }}>
        <BlurMask blur={18} style="normal" />
      </Oval>
      <Group>
        <Circle cx={animatedHeartX} cy={animatedHeartY} r={104} color="rgba(35,20,48,.1)">
          <BlurMask blur={32} style="normal" />
        </Circle>

        {vesselImage && baseConfig.neutralMatte ? (
          <NeutralMatteVessel
            image={vesselImage}
            layout={baseConfig.layout}
            opacity={oldVesselBackOpacity}
            transform={oldVesselTransform}
            x={assetX}
          />
        ) : vesselImage ? (
          <Group
            origin={vec(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)}
            transform={oldVesselTransform}
          >
            <SkiaImage
              fit="contain"
              height={baseConfig.layout.height}
              image={vesselImage}
              opacity={oldVesselBackOpacity}
              width={baseConfig.layout.width}
              x={assetX}
              y={baseConfig.layout.top}
            />
          </Group>
        ) : null}

        {mutation && targetVesselImage && targetConfig.neutralMatte ? (
          <NeutralMatteVessel
            image={targetVesselImage}
            layout={targetConfig.layout}
            opacity={newVesselBackOpacity}
            transform={targetVesselTransform}
            x={targetMetrics.assetX}
          />
        ) : mutation && targetVesselImage ? (
          <Group
            origin={vec(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)}
            transform={targetVesselTransform}
          >
            <SkiaImage
              fit="contain"
              height={targetConfig.layout.height}
              image={targetVesselImage}
              opacity={newVesselBackOpacity}
              width={targetConfig.layout.width}
              x={targetMetrics.assetX}
              y={targetConfig.layout.top}
            />
          </Group>
        ) : null}

        {FLUID_EFFECT ? (
          <Group>
            <Fill>
              <Shader source={FLUID_EFFECT} uniforms={shaderUniforms} />
            </Fill>
          </Group>
        ) : null}

        {baseConfig.neutralMatte && vesselImage ? (
          <NeutralMatteVessel
            image={vesselImage}
            layout={baseConfig.layout}
            opacity={oldVesselFrontOpacity}
            transform={oldVesselTransform}
            x={assetX}
          />
        ) : null}

        {mutation && targetConfig.neutralMatte && targetVesselImage ? (
          <NeutralMatteVessel
            image={targetVesselImage}
            layout={targetConfig.layout}
            opacity={newVesselFrontOpacity}
            transform={targetVesselTransform}
            x={targetMetrics.assetX}
          />
        ) : null}

        <RelicRootNetwork
          accent="#E86D1B"
          branches={branches}
          dashPhase={rootDashPhase}
          opacity={oldRootOpacity}
          scaleX={rootsScaleX}
          scaleY={rootsScaleY}
          x={rootsX}
          y={rootsY}
        />

        {mutation ? (
          <RelicRootNetwork
            accent="#F07A20"
            branches={targetBranches}
            dashPhase={rootDashPhase}
            opacity={newRootOpacity}
            scaleX={targetMetrics.rootsScaleX}
            scaleY={targetMetrics.rootsScaleY}
            x={targetMetrics.rootsX}
            y={targetMetrics.rootsY}
          />
        ) : null}

        <Oval color="rgba(21,5,37,.72)" opacity={.58} rect={surfaceRect}>
          <LinearGradient
            colors={['#10051E', '#33104B', '#14515A', '#10051E']}
            end={surfaceGradientEnd}
            start={surfaceGradientStart}
          />
        </Oval>

        <Group blendMode="screen">
          <Circle
            cx={animatedHeartX}
            cy={animatedHeartY}
            opacity={thermalHaloOpacity}
            r={thermalHaloRadius}
          >
            <RadialGradient
              c={heartCenter}
              colors={['rgba(255,232,151,.94)', 'rgba(255,85,18,.52)', 'rgba(123,18,81,.1)', 'rgba(49,215,226,0)']}
              positions={[0, .26, .64, 1]}
              r={64}
            />
            <BlurMask blur={17} style="normal" />
          </Circle>
        </Group>

        {BOILING_BUBBLE_INDICES.map((index) => (
          <BoilingBubble
            bottomY={bottomY}
            centerX={centerX}
            halfWidth={halfWidth}
            index={index}
            key={`boiling-bubble-${index}`}
            mutationPhase={mutationPhase}
            phase={phase}
            reduceMotion={reduceMotion}
            stage={evolvedStage}
            surfaceY={surfaceY}
            tapHeat={tapHeat}
            targetBottomY={targetMetrics.bottomY}
            targetCenterX={targetMetrics.centerX}
            targetHalfWidth={targetMetrics.halfWidth}
            targetSurfaceY={targetMetrics.surfaceY}
          />
        ))}

        {TAP_BUBBLE_INDICES.map((index) => (
          <TapBubble
            heartX={animatedHeartX}
            heartY={animatedHeartY}
            index={index}
            key={`tap-bubble-${index}`}
            reduceMotion={reduceMotion}
            stage={evolvedStage}
            tapPhase={tapPhase}
          />
        ))}

        {FILAMENT_INDICES.map((index) => (
          <HeartFilament
            energy={visualEnergy}
            heartX={animatedHeartX}
            heartY={animatedHeartY}
            index={index}
            instability={heartInstability}
            key={`filament-${index}`}
            phase={phase}
            reduceMotion={reduceMotion}
            stage={evolvedStage}
          />
        ))}

        <Circle cx={animatedHeartX} cy={animatedHeartY} color="rgba(245,142,47,.72)" opacity={auraOpacity} r={auraRadius}>
          <RadialGradient
            c={heartCenter}
            colors={['rgba(255,225,142,.92)', 'rgba(244,131,38,.5)', 'rgba(49,215,226,0)']}
            r={48}
          />
          <BlurMask blur={14} style="normal" />
        </Circle>

        <Circle
          cx={animatedHeartX}
          cy={animatedHeartY}
          opacity={pulseOpacity}
          r={pulseRadius}
          strokeWidth={1.2}
          style="stroke"
        >
          <SweepGradient
            c={heartCenter}
            colors={['rgba(49,215,226,0)', '#31D7E2', '#D078FF', '#F2A34B', 'rgba(49,215,226,0)']}
          />
        </Circle>

        {SHOCKWAVE_INDICES.map((index) => (
          <TapShockwave
            heartX={animatedHeartX}
            heartY={animatedHeartY}
            index={index}
            key={`tap-shockwave-${index}`}
            phase={tapPhase}
            reduceMotion={reduceMotion}
            stage={evolvedStage}
          />
        ))}

        {mutation ? SHOCKWAVE_INDICES.map((index) => (
          <MutationShockwave
            heartX={animatedHeartX}
            heartY={animatedHeartY}
            index={index}
            key={`mutation-shockwave-${index}`}
            phase={mutationProgress}
            reduceMotion={reduceMotion}
          />
        )) : null}

        <Circle
          cx={animatedHeartX}
          cy={animatedHeartY}
          color="rgba(93,230,239,.52)"
          opacity={orbitOpacity}
          r={70}
          strokeWidth={.8}
          style="stroke"
        >
          <DashPathEffect intervals={[2, 11]} phase={orbitDashPhase} />
        </Circle>

        <Circle
          cx={animatedHeartX}
          cy={animatedHeartY}
          opacity={mutationFlashOpacity}
          r={mutationFlashRadius}
          strokeWidth={2.2}
          style="stroke"
        >
          <SweepGradient
            c={heartCenter}
            colors={['rgba(49,215,226,0)', '#59E5ED', '#FFFFFF', '#F4A248', 'rgba(49,215,226,0)']}
          />
          <BlurMask blur={3.4} style="solid" />
        </Circle>

        {heartImage ? (
          <Group origin={heartCenter} transform={heartTransform}>
            <Group blendMode="screen" opacity={chromaticGhostOpacity} transform={cyanGhostTransform}>
              <SkiaImage
                fit="contain"
                height={animatedHeartSize}
                image={heartImage}
                width={animatedHeartSize}
                x={heartImageX}
                y={heartImageY}
              >
                <ColorMatrix matrix={CYAN_HEART_MATRIX} />
              </SkiaImage>
            </Group>
            <Group blendMode="screen" opacity={chromaticGhostOpacity} transform={magentaGhostTransform}>
              <SkiaImage
                fit="contain"
                height={animatedHeartSize}
                image={heartImage}
                width={animatedHeartSize}
                x={heartImageX}
                y={heartImageY}
              >
                <ColorMatrix matrix={MAGENTA_HEART_MATRIX} />
              </SkiaImage>
            </Group>
            <SkiaImage
              fit="contain"
              height={animatedHeartSize}
              image={heartImage}
              opacity={heartMainOpacity}
              width={animatedHeartSize}
              x={heartImageX}
              y={heartImageY}
            />
          </Group>
        ) : null}

        {PARTICLE_INDICES.map((index) => (
          <RelicParticle
            bottomY={bottomY}
            centerX={centerX}
            energy={visualEnergy}
            index={index}
            key={index}
            mutationPhase={mutationPhase}
            phase={phase}
            reduceMotion={reduceMotion}
            supporterPhase={supporterPhase}
            surfaceY={surfaceY}
            targetBottomY={targetMetrics.bottomY}
            targetCenterX={targetMetrics.centerX}
            targetSurfaceY={targetMetrics.surfaceY}
          />
        ))}

        <Path
          color="rgba(214,251,255,.9)"
          opacity={oldGlintOpacity}
          path={glintPathForMetrics(metrics)}
          strokeCap="round"
          strokeWidth={1.15}
          style="stroke"
        >
          <BlurMask blur={1.2} style="solid" />
        </Path>

        {mutation ? (
          <Path
            color="rgba(214,251,255,.9)"
            opacity={newGlintOpacity}
            path={glintPathForMetrics(targetMetrics)}
            strokeCap="round"
            strokeWidth={1.15}
            style="stroke"
          >
            <BlurMask blur={1.2} style="solid" />
          </Path>
        ) : null}
      </Group>
    </Canvas>
  );
}

function NeutralMatteVessel({
  image,
  layout,
  opacity,
  transform,
  x,
}: {
  image: SkImage;
  layout: SkiaRelicLayerProps['config']['layout'];
  opacity: { value: number };
  transform: { value: Transforms3d };
  x: number;
}) {
  return (
    <Group origin={vec(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)} transform={transform}>
      <SkiaImage
        fit="fill"
        height={layout.height}
        image={image}
        opacity={opacity}
        width={layout.width}
        x={x}
        y={layout.top}
      >
        <ColorMatrix matrix={CHECKERBOARD_KEY_MATRIX} />
      </SkiaImage>
    </Group>
  );
}

function BoilingBubble({
  bottomY,
  centerX,
  halfWidth,
  index,
  mutationPhase,
  phase,
  reduceMotion,
  stage,
  surfaceY,
  tapHeat,
  targetBottomY,
  targetCenterX,
  targetHalfWidth,
  targetSurfaceY,
}: {
  bottomY: number;
  centerX: number;
  halfWidth: number;
  index: number;
  mutationPhase?: SharedValue<number>;
  phase: SharedValue<number>;
  reduceMotion: boolean;
  stage: SharedValue<number>;
  surfaceY: number;
  tapHeat: SharedValue<number>;
  targetBottomY: number;
  targetCenterX: number;
  targetHalfWidth: number;
  targetSurfaceY: number;
}) {
  const local = useDerivedValue(() => {
    const stageValue = Math.max(1, Math.min(5, stage.value));
    if (reduceMotion) return (index + .5) / SKIA_MAX_BOILING_BUBBLES;
    const mutation = mutationPhase ? clamp01(mutationPhase.value) : 0;
    const speed = .5 + stageValue * .085 + tapHeat.value * .94;
    return (phase.value * speed + tapHeat.value * .42 + mutation * .36 + index / SKIA_MAX_BOILING_BUBBLES) % 1;
  }, [index, mutationPhase, reduceMotion]);
  const cx = useDerivedValue(() => {
    const mutation = mutationPhase ? clamp01(mutationPhase.value) : 0;
    const morph = smoothSegment(mutation, .38, .72);
    const x = lerp(centerX, targetCenterX, morph);
    const width = lerp(halfWidth, targetHalfWidth, morph);
    const spread = Math.min(width * .72, 11 + (index % 5) * 6.4);
    const thermalWobble = Math.sin(local.value * TWO_PI * 1.4 + index * 2.17) * (2.2 + tapHeat.value * 4.8);
    return x + Math.sin(index * 2.43) * spread + thermalWobble;
  }, [centerX, halfWidth, index, mutationPhase, targetCenterX, targetHalfWidth]);
  const cy = useDerivedValue(() => {
    const mutation = mutationPhase ? clamp01(mutationPhase.value) : 0;
    const morph = smoothSegment(mutation, .38, .72);
    const bottom = lerp(bottomY, targetBottomY, morph) - 7;
    const surface = lerp(surfaceY, targetSurfaceY, morph) + 2;
    return bottom - local.value * Math.max(20, bottom - surface);
  }, [bottomY, mutationPhase, surfaceY, targetBottomY, targetSurfaceY]);
  const radius = useDerivedValue(() => 2.45 + (index % 4) * .78 + skiaStageProgress(stage.value) * 1.2 + tapHeat.value * 1.05, [index]);
  const highlightX = useDerivedValue(() => cx.value - radius.value * .32);
  const highlightY = useDerivedValue(() => cy.value - radius.value * .34);
  const highlightRadius = useDerivedValue(() => Math.max(.35, radius.value * .24));
  const opacity = useDerivedValue(() => {
    const activeCount = skiaBoilingBubbleCount(stage.value);
    const visibility = smoothSegment(activeCount - index, .08, .92);
    const life = Math.sin(local.value * Math.PI);
    const stageEnergy = skiaStageProgress(stage.value);
    const mutation = mutationPhase ? skiaMutationSurge(mutationPhase.value) : 0;
    const base = reduceMotion ? .16 : .18 + stageEnergy * .35 + tapHeat.value * .7 + mutation * .32;
    return Math.min(.98, visibility * life * base);
  }, [index, mutationPhase, reduceMotion]);
  const color = index % 4 === 0 ? '#FFA14A' : index % 3 === 0 ? '#C777FF' : '#6DEAF1';

  return (
    <Group blendMode="screen" opacity={opacity}>
      <Circle color={color} cx={cx} cy={cy} r={radius} strokeWidth={1.05} style="stroke" />
      <Circle color={color} cx={cx} cy={cy} opacity={.24} r={radius} />
      <Circle color="#F4FFFF" cx={highlightX} cy={highlightY} r={highlightRadius} />
    </Group>
  );
}

function TapBubble({
  heartX,
  heartY,
  index,
  reduceMotion,
  stage,
  tapPhase,
}: {
  heartX: SharedValue<number>;
  heartY: SharedValue<number>;
  index: number;
  reduceMotion: boolean;
  stage: SharedValue<number>;
  tapPhase: SharedValue<number>;
}) {
  const local = useDerivedValue(() => {
    const delay = (index % 6) * .022 + Math.floor(index / 6) * .055;
    return smoothSegment(tapPhase.value, .1 + delay, .78 + delay);
  }, [index]);
  const cx = useDerivedValue(() => {
    const stageProgress = skiaStageProgress(stage.value);
    const angle = -Math.PI / 2 + (index - 5.5) * (.15 + stageProgress * .022);
    const travel = local.value * (20 + stage.value * 5.2 + (index % 4) * 4.2) * (reduceMotion ? .14 : 1);
    const wobble = reduceMotion ? 0 : Math.sin(local.value * TWO_PI + index * 1.9) * (2 + stageProgress * 3.6);
    return heartX.value + Math.cos(angle) * travel + wobble;
  }, [index, reduceMotion]);
  const cy = useDerivedValue(() => {
    const stageProgress = skiaStageProgress(stage.value);
    const angle = -Math.PI / 2 + (index - 5.5) * (.15 + stageProgress * .022);
    const travel = local.value * (20 + stage.value * 5.2 + (index % 4) * 4.2) * (reduceMotion ? .14 : 1);
    return heartY.value + Math.sin(angle) * travel;
  }, [index, reduceMotion]);
  const radius = useDerivedValue(() => 3.8 + (index % 3) * 1.1 + skiaStageProgress(stage.value) * 1.4, [index]);
  const haloRadius = useDerivedValue(() => radius.value * 1.22);
  const highlightX = useDerivedValue(() => cx.value - radius.value * .3);
  const highlightY = useDerivedValue(() => cy.value - radius.value * .34);
  const highlightRadius = useDerivedValue(() => Math.max(.55, radius.value * .22));
  const opacity = useDerivedValue(() => {
    const activeCount = Math.min(TAP_BUBBLE_INDICES.length, 2 + Math.round(stage.value * 2));
    const visibility = smoothSegment(activeCount - index, .08, .92);
    return visibility * Math.sin(local.value * Math.PI) * (reduceMotion ? .28 : .84 + skiaStageProgress(stage.value) * .15);
  }, [index, reduceMotion]);
  const color = index % 3 === 0 ? '#FFB35D' : index % 2 === 0 ? '#D18AFF' : '#83F5F8';

  return (
    <Group blendMode="screen" opacity={opacity}>
      <Circle color={color} cx={cx} cy={cy} opacity={.44} r={haloRadius}>
        <BlurMask blur={2.1} style="normal" />
      </Circle>
      <Circle color="#F3FFFF" cx={cx} cy={cy} r={radius} strokeWidth={1.25} style="stroke" />
      <Circle color={color} cx={cx} cy={cy} opacity={.82} r={radius} strokeWidth={.72} style="stroke" />
      <Circle color={color} cx={cx} cy={cy} opacity={.16} r={radius} />
      <Circle color="#FFFFFF" cx={highlightX} cy={highlightY} r={highlightRadius} />
    </Group>
  );
}

function TapShockwave({
  heartX,
  heartY,
  index,
  phase,
  reduceMotion,
  stage,
}: {
  heartX: SharedValue<number>;
  heartY: SharedValue<number>;
  index: number;
  phase: SharedValue<number>;
  reduceMotion: boolean;
  stage: SharedValue<number>;
}) {
  const local = useDerivedValue(() => smoothSegment(phase.value, .08 + index * .07, .64 + index * .1), [index]);
  const radius = useDerivedValue(() => 18 + local.value * (42 + stage.value * 5.6 + index * 11), [index]);
  const opacity = useDerivedValue(() => Math.sin(local.value * Math.PI)
    * (.58 - index * .1)
    * (reduceMotion ? .3 : 1), [index, reduceMotion]);
  const dashPhase = useDerivedValue(() => -(phase.value * 84 + index * 6), [index]);
  const color = index === 0 ? '#FFF2CE' : index === 1 ? '#F49B47' : '#62E6EF';

  return (
    <Circle
      color={color}
      cx={heartX}
      cy={heartY}
      opacity={opacity}
      r={radius}
      strokeWidth={1.15 + index * .22}
      style="stroke"
    >
      <DashPathEffect intervals={[3 + index * 2, 7 + index * 3]} phase={dashPhase} />
      <BlurMask blur={1.2 + index * .4} style="solid" />
    </Circle>
  );
}

function MutationShockwave({
  heartX,
  heartY,
  index,
  phase,
  reduceMotion,
}: {
  heartX: SharedValue<number>;
  heartY: SharedValue<number>;
  index: number;
  phase: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const local = useDerivedValue(() => smoothSegment(phase.value, .12 + index * .09, .61 + index * .12), [index]);
  const radius = useDerivedValue(() => 14 + local.value * (92 + index * 26), [index]);
  const opacity = useDerivedValue(() => Math.sin(local.value * Math.PI)
    * (.86 - index * .14)
    * (reduceMotion ? .3 : 1), [index, reduceMotion]);
  const center = useDerivedValue(() => ({ x: heartX.value, y: heartY.value }));

  return (
    <Circle
      cx={heartX}
      cy={heartY}
      opacity={opacity}
      r={radius}
      strokeWidth={2.2 - index * .35}
      style="stroke"
    >
      <SweepGradient
        c={center}
        colors={['rgba(89,229,237,0)', '#59E5ED', '#FFFFFF', '#F4A248', '#D078FF', 'rgba(89,229,237,0)']}
      />
      <BlurMask blur={2.2 + index * .65} style="solid" />
    </Circle>
  );
}

function HeartFilament({
  energy,
  heartX,
  heartY,
  index,
  instability,
  phase,
  reduceMotion,
  stage,
}: {
  energy: SharedValue<number>;
  heartX: SharedValue<number>;
  heartY: SharedValue<number>;
  index: number;
  instability: SharedValue<number>;
  phase: SharedValue<number>;
  reduceMotion: boolean;
  stage: SharedValue<number>;
}) {
  const angleOffset = FILAMENT_ANGLE_OFFSETS[index] ?? 0;
  const color = FILAMENT_COLORS[index % FILAMENT_COLORS.length];
  const filamentPath = usePathValue((builder) => {
    'worklet';
    const stageValue = Math.max(1, Math.min(5, stage.value));
    const intensity = clamp01(instability.value);
    const interaction = clamp01(energy.value);
    const time = reduceMotion ? index * .41 : phase.value * TWO_PI + interaction * 1.8;
    const angle = -Math.PI / 2
      + angleOffset
      + Math.sin(time * (1.45 + index % 4 * .17) + index * .73) * (.025 + intensity * .105);
    const length = 22 + stageValue * 7.4 + intensity * 21 + interaction * 10 + (index % 3) * 3.4;
    const startRadius = 8.5 + stageValue * .72;
    const tangentX = Math.cos(angle);
    const tangentY = Math.sin(angle);
    const normalX = -tangentY;
    const normalY = tangentX;
    const primaryBend = Math.sin(time * (1.8 + index % 3 * .2) + index * 1.17)
      * length * (.07 + intensity * .105);
    const secondaryBend = Math.cos(time * 2.3 + index * .67)
      * length * (.045 + intensity * .08);
    const originX = heartX.value + tangentX * startRadius;
    const originY = heartY.value + tangentY * startRadius;
    const endJitter = reduceMotion ? 0 : Math.sin(time * 3.2 + index) * intensity * 4.2;
    const endX = heartX.value + tangentX * (length + endJitter) + normalX * secondaryBend;
    const endY = heartY.value + tangentY * (length + endJitter) + normalY * secondaryBend;

    builder.moveTo(originX, originY);
    builder.cubicTo(
      heartX.value + tangentX * length * .34 + normalX * primaryBend,
      heartY.value + tangentY * length * .34 + normalY * primaryBend,
      heartX.value + tangentX * length * .68 - normalX * secondaryBend,
      heartY.value + tangentY * length * .68 - normalY * secondaryBend,
      endX,
      endY,
    );
  });
  const ramificationPath = usePathValue((builder) => {
    'worklet';
    const stageValue = Math.max(1, Math.min(5, stage.value));
    const level = skiaRamificationLevel(stageValue);
    if (level === 0 || index % 4 >= level) return;

    const intensity = clamp01(instability.value);
    const interaction = clamp01(energy.value);
    const time = reduceMotion ? index * .41 : phase.value * TWO_PI + interaction * 1.8;
    const angle = -Math.PI / 2
      + angleOffset
      + Math.sin(time * (1.45 + index % 4 * .17) + index * .73) * (.025 + intensity * .105);
    const length = 22 + stageValue * 7.4 + intensity * 21 + interaction * 10 + (index % 3) * 3.4;
    const tangentX = Math.cos(angle);
    const tangentY = Math.sin(angle);
    const normalX = -tangentY;
    const normalY = tangentX;
    const forkSign = index % 2 === 0 ? -1 : 1;
    const branchDistance = length * (.55 + (index % 3) * .055);
    const bend = Math.sin(time * 1.9 + index * .83) * length * (.035 + intensity * .055);
    const branchX = heartX.value + tangentX * branchDistance + normalX * bend;
    const branchY = heartY.value + tangentY * branchDistance + normalY * bend;
    const branchAngle = angle + forkSign * (.34 + intensity * .15);
    const branchLength = 7 + stageValue * 2.25 + intensity * 6.4 + interaction * 3.2;
    const branchEndX = branchX + Math.cos(branchAngle) * branchLength;
    const branchEndY = branchY + Math.sin(branchAngle) * branchLength;

    builder.moveTo(branchX, branchY);
    builder.cubicTo(
      branchX + Math.cos(angle) * branchLength * .28,
      branchY + Math.sin(angle) * branchLength * .28,
      branchX + Math.cos(branchAngle) * branchLength * .66 + normalX * forkSign * 1.8,
      branchY + Math.sin(branchAngle) * branchLength * .66 + normalY * forkSign * 1.8,
      branchEndX,
      branchEndY,
    );

    if (level >= 3 && index % 2 === 0) {
      const oppositeAngle = angle - forkSign * (.28 + intensity * .12);
      const oppositeLength = branchLength * .78;
      builder.moveTo(branchX, branchY);
      builder.cubicTo(
        branchX + Math.cos(angle) * oppositeLength * .28,
        branchY + Math.sin(angle) * oppositeLength * .28,
        branchX + Math.cos(oppositeAngle) * oppositeLength * .68 - normalX * forkSign * 1.5,
        branchY + Math.sin(oppositeAngle) * oppositeLength * .68 - normalY * forkSign * 1.5,
        branchX + Math.cos(oppositeAngle) * oppositeLength,
        branchY + Math.sin(oppositeAngle) * oppositeLength,
      );
    }

    if (level >= 4 && index % 3 === 0) {
      const crownX = heartX.value + tangentX * length * .76 - normalX * bend * .28;
      const crownY = heartY.value + tangentY * length * .76 - normalY * bend * .28;
      const crownAngle = angle + forkSign * .52;
      const crownLength = branchLength * .58;
      builder.moveTo(crownX, crownY);
      builder.cubicTo(
        crownX + tangentX * crownLength * .2,
        crownY + tangentY * crownLength * .2,
        crownX + Math.cos(crownAngle) * crownLength * .72,
        crownY + Math.sin(crownAngle) * crownLength * .72,
        crownX + Math.cos(crownAngle) * crownLength,
        crownY + Math.sin(crownAngle) * crownLength,
      );
    }
  });
  const opacity = useDerivedValue(() => {
    const activeCount = Math.min(FILAMENT_INDICES.length, 2 + stage.value * 3.6);
    const visibility = smoothSegment(activeCount - index, .08, .92);
    const flicker = reduceMotion
      ? .72
      : .58 + Math.abs(Math.sin(phase.value * TWO_PI * (2.1 + index % 5 * .19) + index)) * .42;
    return visibility
      * (.11 + instability.value * .43 + clamp01(energy.value) * .18)
      * flicker;
  }, [index, reduceMotion]);
  const glowOpacity = useDerivedValue(() => opacity.value * (.24 + instability.value * .18));
  const coreOpacity = useDerivedValue(() => Math.min(.82, opacity.value * 1.08));
  const ramificationOpacity = useDerivedValue(() => {
    const level = skiaRamificationLevel(stage.value);
    if (level === 0 || index % 4 >= level) return 0;
    const flicker = reduceMotion ? .72 : .56 + Math.abs(Math.cos(phase.value * TWO_PI * (2.8 + index * .03))) * .44;
    return Math.min(.88, opacity.value * (.48 + level * .11) * flicker);
  }, [index, reduceMotion]);
  const ramificationGlowOpacity = useDerivedValue(() => ramificationOpacity.value * (.24 + instability.value * .18));
  const filamentWidth = useDerivedValue(() => .48 + stage.value * .045 + instability.value * .32);
  const glowWidth = useDerivedValue(() => 1.5 + stage.value * .1 + instability.value * .9);
  const ramificationWidth = useDerivedValue(() => .36 + stage.value * .03 + instability.value * .2);
  const dashPhase = useDerivedValue(() => reduceMotion ? -index * 2 : -(phase.value * 64 + index * 3.4), [index, reduceMotion]);

  return (
    <Group blendMode="screen">
      <Path
        color={color}
        opacity={glowOpacity}
        path={filamentPath}
        strokeCap="round"
        strokeWidth={glowWidth}
        style="stroke"
      >
        <BlurMask blur={2.8} style="solid" />
      </Path>
      <Path
        color={color}
        opacity={ramificationGlowOpacity}
        path={ramificationPath}
        strokeCap="round"
        strokeWidth={2.1}
        style="stroke"
      >
        <BlurMask blur={2.5} style="solid" />
      </Path>
      <Path
        color={color}
        opacity={ramificationOpacity}
        path={ramificationPath}
        strokeCap="round"
        strokeWidth={ramificationWidth}
        style="stroke"
      />
      <Path
        color={color}
        opacity={opacity}
        path={filamentPath}
        strokeCap="round"
        strokeWidth={filamentWidth}
        style="stroke"
      />
      <Path
        color="#FF8A2A"
        opacity={coreOpacity}
        path={filamentPath}
        strokeCap="round"
        strokeWidth={.42}
        style="stroke"
      >
        <DashPathEffect intervals={[2, 5]} phase={dashPhase} />
      </Path>
    </Group>
  );
}

function RelicRootNetwork({
  accent,
  branches,
  dashPhase,
  opacity,
  scaleX,
  scaleY,
  x,
  y,
}: {
  accent: string;
  branches: readonly RootBranch[];
  dashPhase: SharedValue<number>;
  opacity: SharedValue<number>;
  scaleX: number;
  scaleY: number;
  x: number;
  y: number;
}) {
  return (
    <Group
      opacity={opacity}
      transform={[
        { translateX: x },
        { translateY: y },
        { scaleX },
        { scaleY },
      ]}
    >
      {branches.map((branch) => (
        <Path
          color="rgba(122,43,12,.72)"
          key={`base-${branch.id}`}
          path={branch.path}
          strokeCap="round"
          strokeJoin="round"
          strokeWidth={branch.width * 1.22}
          style="stroke"
        />
      ))}
      {branches.map((branch) => (
        <Path
          color={accent}
          key={`energy-${branch.id}`}
          path={branch.path}
          strokeCap="round"
          strokeWidth={Math.max(.42, branch.width * .54)}
          style="stroke"
        >
          <DashPathEffect intervals={[3, 10]} phase={dashPhase} />
        </Path>
      ))}
    </Group>
  );
}

function RelicParticle({
  bottomY,
  centerX,
  energy,
  index,
  mutationPhase,
  phase,
  reduceMotion,
  supporterPhase,
  surfaceY,
  targetBottomY,
  targetCenterX,
  targetSurfaceY,
}: {
  bottomY: number;
  centerX: number;
  energy: SharedValue<number>;
  index: number;
  mutationPhase?: SharedValue<number>;
  phase: SharedValue<number>;
  reduceMotion: boolean;
  supporterPhase: SharedValue<number>;
  surfaceY: number;
  targetBottomY: number;
  targetCenterX: number;
  targetSurfaceY: number;
}) {
  const local = useDerivedValue(() => reduceMotion ? index / PARTICLE_COUNT : (phase.value * (1.3 + index % 3 * .16) + index / PARTICLE_COUNT) % 1, [index, reduceMotion]);
  const cx = useDerivedValue(() => {
    const mutation = mutationPhase ? clamp01(mutationPhase.value) : 0;
    const morph = smoothSegment(mutation, .38, .72);
    const burst = reduceMotion ? 0 : Math.sin(smoothSegment(mutation, .18, .72) * Math.PI);
    const origin = lerp(centerX, targetCenterX, morph);
    return origin
      + Math.sin(index * 2.17 + local.value * TWO_PI) * (13 + (index % 4) * 4)
      + supporterDrift(supporterPhase.value, index)
      + Math.cos(index * 2.43) * burst * (24 + (index % 4) * 8);
  }, [centerX, index, mutationPhase, reduceMotion, targetCenterX]);
  const cy = useDerivedValue(() => {
    const mutation = mutationPhase ? clamp01(mutationPhase.value) : 0;
    const morph = smoothSegment(mutation, .38, .72);
    const burst = reduceMotion ? 0 : Math.sin(smoothSegment(mutation, .18, .72) * Math.PI);
    const baseBottom = lerp(bottomY, targetBottomY, morph);
    const baseSurface = lerp(surfaceY, targetSurfaceY, morph);
    return baseBottom - 8
      - local.value * Math.max(24, baseBottom - baseSurface - 4)
      + Math.sin(index * 2.43) * burst * (18 + (index % 3) * 8);
  }, [bottomY, index, mutationPhase, reduceMotion, surfaceY, targetBottomY, targetSurfaceY]);
  const radius = useDerivedValue(() => 1 + (index % 3) * .45 + energy.value * .45, [index]);
  const opacity = useDerivedValue(() => {
    if (reduceMotion) return .12;
    const life = Math.sin(local.value * Math.PI);
    const mutation = mutationPhase ? clamp01(mutationPhase.value) : 0;
    const burst = Math.sin(smoothSegment(mutation, .18, .72) * Math.PI);
    return Math.min(.94, life * (.18 + energy.value * .3 + supporterEnvelope(supporterPhase.value) * .42) + burst * .46);
  }, [mutationPhase, reduceMotion]);
  const color = index % 3 === 0 ? '#F4A248' : index % 2 === 0 ? '#B96CFF' : '#59E5ED';

  return (
    <Circle color={color} cx={cx} cy={cy} opacity={opacity} r={radius}>
      <BlurMask blur={index % 3 === 0 ? 1.6 : .8} style="solid" />
    </Circle>
  );
}

function doubleBeat(phase: number) {
  'worklet';
  const local = (phase * 2) % 1;
  const first = Math.exp(-Math.pow((local - .2) / .06, 2));
  const second = Math.exp(-Math.pow((local - .36) / .075, 2)) * .68;
  return Math.max(first, second);
}

function supporterEnvelope(phase: number) {
  'worklet';
  if (phase <= .4 || phase >= 1) return 0;
  const local = Math.min(1, Math.max(0, (phase - .4) / .6));
  return Math.sin(local * Math.PI);
}

function supporterDrift(phase: number, index: number) {
  'worklet';
  const envelope = supporterEnvelope(phase);
  return Math.sin(index * 1.73 + phase * TWO_PI) * envelope * 6;
}

function relicCanvasMetrics(config: SkiaRelicLayerProps['config'], levelLift: number) {
  const layoutScale = config.layout.height / 330;
  const assetX = (CANVAS_WIDTH - config.layout.width) / 2;
  const artworkOffsetX = (config.layout.width - 220 * layoutScale) / 2;
  const centerX = assetX + artworkOffsetX + config.heartX * layoutScale;
  const surfaceY = config.layout.top + (config.liquidLevel - Math.max(0, levelLift)) * layoutScale;
  const bottomY = Math.min(CANVAS_HEIGHT - 6, config.layout.top + config.contactY * layoutScale);
  return {
    assetX,
    bottomY,
    centerX,
    halfWidth: Math.max(32, config.liquidSurfaceWidth * layoutScale * .62),
    heartSize: 56 * config.heartScale * layoutScale,
    heartY: config.layout.top + config.heartY * layoutScale,
    rootsScaleX: config.rootsFrame.width * layoutScale / 132,
    rootsScaleY: config.rootsFrame.height * layoutScale / 120,
    rootsX: assetX + artworkOffsetX + config.rootsFrame.x * layoutScale,
    rootsY: config.rootsFrame.y * layoutScale,
    surfaceY,
  };
}

function glintPathForMetrics(metrics: ReturnType<typeof relicCanvasMetrics>) {
  const { bottomY, centerX, halfWidth, surfaceY } = metrics;
  return `M ${centerX - halfWidth * .72} ${surfaceY + 8} C ${centerX - halfWidth * .92} ${surfaceY + 43}, ${centerX - halfWidth * .72} ${bottomY - 28}, ${centerX - halfWidth * .42} ${bottomY - 16}`;
}

function clamp01(value: number) {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

function smoothSegment(value: number, start: number, end: number) {
  'worklet';
  const local = clamp01((value - start) / Math.max(.0001, end - start));
  return local * local * (3 - 2 * local);
}

function lerp(from: number, to: number, progress: number) {
  'worklet';
  return from + (to - from) * progress;
}

function rootEnergy(instability: number, interaction: number, supporter: number) {
  'worklet';
  return Math.min(1, .26 + instability * .24 + interaction * .38 + supporterEnvelope(supporter) * .28);
}
