import {
  BlurMask,
  Canvas,
  Circle,
  FitBox,
  Group,
  Image as SkiaImage,
  LinearGradient,
  Path,
  RadialGradient,
  rect,
  useImage,
  vec,
} from '@shopify/react-native-skia';
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, {
  Circle as SvgCircle,
  ClipPath as SvgClipPath,
  Defs as SvgDefs,
  G as SvgGroup,
  Image as SvgImage,
  LinearGradient as SvgLinearGradient,
  Path as SvgPath,
  RadialGradient as SvgRadialGradient,
  Stop as SvgStop,
} from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import {
  RELIC_STAGE_ARTWORK,
  relicLiquidDynamicSurfacePathForLevel,
  relicLiquidDynamicVolumePathForLevel,
  relicLiquidLevelForRatio,
  relicLiquidSurfaceForLevel,
  relicLiquidVolumePathForLevel,
} from '@/src/features/social/faction/relicArtwork';
import type { RelicContainer } from '@/src/features/social/faction/types';

import StaticRelicVial from './StaticRelicVial';
import { RelicVesselForegroundArtwork } from './RelicEnergyArtwork';

const ARTBOARD_SIZE = 1_000;
const IDLE_LIQUID_CYCLE_MS = 6_200;
const REACTION_DURATION_MS = 1_650;
const MUTATION_CHARGE_MS = 760;
const MUTATION_RELEASE_MS = 1_840;

// Generated deterministically from the scene's warm pixels. It contains the
// exact antialiased heart and roots on transparency, with no invented drawing.
const AMPOULE_ANATOMY_ASSET = require('../../../../../assets/social/relic-evolution/relic-scene-ampoule-anatomy.png') as number;
const AMPOULE_DORMANT_ANATOMY_ASSET = require('../../../../../assets/social/relic-evolution/relic-scene-ampoule-anatomy-dormant.png') as number;
const AMPOULE_ROOT_REGION = 'M445 430 H555 V625 H445 Z';
const AMPOULE_HEART_REGION = 'M465 585 H535 V705 H465 Z';
const AMPOULE_ROOT_BANDS = {
  lower: 'M445 555 H555 V625 H445 Z',
  middle: 'M445 495 H555 V565 H445 Z',
  upper: 'M445 430 H555 V505 H445 Z',
} as const;

const BUBBLES = [
  { duration: .4, horizontalPosition: -.72, radius: 5, sourceLift: 12, start: .08, sway: -10 },
  { duration: .48, horizontalPosition: -.35, radius: 7, sourceLift: 34, start: .13, sway: 13 },
  { duration: .36, horizontalPosition: .18, radius: 4, sourceLift: 18, start: .2, sway: -8 },
  { duration: .45, horizontalPosition: .64, radius: 6, sourceLift: 48, start: .24, sway: 11 },
  { duration: .34, horizontalPosition: -.58, radius: 3.5, sourceLift: 54, start: .34, sway: 7 },
  { duration: .4, horizontalPosition: .48, radius: 4.5, sourceLift: 26, start: .38, sway: -12 },
  { duration: .3, horizontalPosition: -.04, radius: 3, sourceLift: 8, start: .48, sway: 6 },
] as const;

const BURST_PARTICLES = [
  [-2.8, 210, 10], [-2.48, 250, 7], [-2.12, 218, 9], [-1.78, 280, 6],
  [-1.46, 245, 11], [-1.12, 220, 7], [-.74, 265, 9], [-.32, 205, 6],
  [.14, 240, 8], [.56, 275, 5], [.92, 225, 10], [1.26, 255, 7],
  [1.72, 210, 8], [2.1, 250, 6], [2.48, 225, 9], [2.84, 265, 5],
] as const;

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);
const AnimatedSvgPath = Animated.createAnimatedComponent(SvgPath);

function clamp01(value: number) {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

function stagedEnvelope(
  progress: number,
  attackStart: number,
  attackEnd: number,
  releaseStart: number,
) {
  'worklet';
  if (progress <= attackStart) return 0;
  if (progress <= attackEnd) {
    return clamp01((progress - attackStart) / Math.max(.000_1, attackEnd - attackStart));
  }
  if (progress <= releaseStart) return 1;
  return 1 - clamp01((progress - releaseStart) / Math.max(.000_1, 1 - releaseStart));
}

function rootBandEnergy(
  reactionProgress: number,
  mutationProgress: number,
  reactionStart: number,
  reactionEnd: number,
  mutationStart: number,
  mutationEnd: number,
) {
  'worklet';
  const activation = Math.max(
    stagedEnvelope(reactionProgress, reactionStart, reactionEnd, .76),
    stagedEnvelope(mutationProgress, mutationStart, mutationEnd, .54),
  );
  const pulse = .78 + Math.pow(Math.sin(
    (reactionProgress * 2.2 + mutationProgress * 3.8) * Math.PI,
  ), 2) * .22;
  return activation * pulse;
}

function liquidActivationEnergy(reactionProgress: number, mutationProgress: number) {
  'worklet';
  return Math.max(
    stagedEnvelope(reactionProgress, .045, .14, .82),
    stagedEnvelope(mutationProgress, .1, .23, .58),
  );
}

function heartActivationEnergy(reactionProgress: number, mutationProgress: number) {
  'worklet';
  const reactionActivation = stagedEnvelope(reactionProgress, .036, .11, .76);
  const mutationActivation = stagedEnvelope(mutationProgress, 0, .12, .56);
  const reactionPulse = .68 + Math.pow(Math.sin(reactionProgress * 3 * Math.PI), 2) * .32;
  const mutationPulse = .9 + Math.pow(Math.sin(mutationProgress * 5 * Math.PI), 2) * .1;

  return Math.max(
    reactionActivation * reactionPulse,
    mutationActivation * mutationPulse,
  );
}

function mutationFlashPhase(progress: number) {
  'worklet';
  return clamp01((progress - .3) / .22);
}

function mutationFlashOpacity(progress: number) {
  'worklet';
  if (progress < .3 || progress > .64) return 0;
  if (progress < .36) return clamp01((progress - .3) / .06) * .9;
  if (progress <= .43) return .9;
  return (1 - clamp01((progress - .43) / .21)) * .9;
}

function positiveModulo(value: number, modulus: number) {
  'worklet';
  return ((value % modulus) + modulus) % modulus;
}

function relicBubblePhase(
  reactionProgress: number,
  mutationProgress: number,
  start: number,
  duration: number,
) {
  'worklet';
  if (reactionProgress < 1) {
    return clamp01((reactionProgress - start) / Math.max(.01, duration));
  }
  return positiveModulo(mutationProgress * 1.62 + start * .83, 1);
}

function relicBubbleBodyOpacity(phase: number, energy: number, rise: number) {
  'worklet';
  const appear = clamp01(phase / .1);
  const collapse = 1 - clamp01((phase - .9) / .08);
  return energy * appear * collapse * .68 * clamp01(rise / 12);
}

function relicBubbleBurstPhase(phase: number) {
  'worklet';
  return clamp01((phase - .88) / .12);
}

function relicBubbleBurstOpacity(phase: number, energy: number, rise: number) {
  'worklet';
  const burst = relicBubbleBurstPhase(phase);
  return energy * Math.sin(burst * Math.PI) * .58 * clamp01(rise / 12);
}

function relicBubbleHorizontalOffset(phase: number, start: number, sway: number) {
  'worklet';
  return Math.sin((phase * 1.7 + start) * Math.PI) * sway * (.25 + phase * .75);
}

function relicBubbleBodyPath(
  cx: number,
  cy: number,
  radius: number,
  phase: number,
  start: number,
) {
  'worklet';
  const rx = radius * (.72 + phase * .44);
  const ry = radius * (.92 + phase * .7);
  const asymmetry = Math.sin((phase * 2.7 + start) * Math.PI) * .14;
  return [
    `M${cx} ${cy - ry}`,
    `C${cx + rx * (.62 + asymmetry)} ${cy - ry * .88} ${cx + rx} ${cy - ry * .28} ${cx + rx * (.92 - asymmetry * .18)} ${cy}`,
    `C${cx + rx * .78} ${cy + ry * .68} ${cx + rx * .26} ${cy + ry} ${cx} ${cy + ry * .92}`,
    `C${cx - rx * (.34 - asymmetry)} ${cy + ry} ${cx - rx * .9} ${cy + ry * .56} ${cx - rx * (.88 + asymmetry * .16)} ${cy}`,
    `C${cx - rx} ${cy - ry * .38} ${cx - rx * (.54 - asymmetry)} ${cy - ry * .9} ${cx} ${cy - ry}`,
    'Z',
  ].join(' ');
}

function relicBubbleBurstRingPath(
  cx: number,
  cy: number,
  radius: number,
  burst: number,
) {
  'worklet';
  const rx = radius * (.9 + burst * 2.55);
  const ry = Math.max(.8, radius * (.24 - burst * .08));
  const control = .552_3;
  return [
    `M${cx - rx} ${cy}`,
    `C${cx - rx} ${cy - ry * control} ${cx - rx * control} ${cy - ry} ${cx} ${cy - ry}`,
    `C${cx + rx * control} ${cy - ry} ${cx + rx} ${cy - ry * control} ${cx + rx} ${cy}`,
    `C${cx + rx} ${cy + ry * control} ${cx + rx * control} ${cy + ry} ${cx} ${cy + ry}`,
    `C${cx - rx * control} ${cy + ry} ${cx - rx} ${cy + ry * control} ${cx - rx} ${cy}`,
  ].join(' ');
}

function relicLiquidCurrentPath(
  config: (typeof RELIC_STAGE_ARTWORK)[RelicContainer],
  level: number,
) {
  const depth = Math.max(0, config.liquidFloor - level);
  if (depth < 12) return '';

  const upper = relicLiquidSurfaceForLevel(config, level + depth * .22);
  const lower = relicLiquidSurfaceForLevel(config, level + depth * .82);
  return `M${upper.x - upper.width * .22} ${upper.y} C${upper.x + upper.width * .18} ${level + depth * .34} ${lower.x - lower.width * .24} ${level + depth * .62} ${lower.x + lower.width * .16} ${lower.y}`;
}

function relicLiquidSurfaceOffsets(
  idleProgress: number,
  reactionProgress: number,
  mutationProgress: number,
) {
  'worklet';
  const idlePhase = idleProgress * Math.PI * 2;
  const tilt = Math.sin(idlePhase) * 1.65;
  const breathing = Math.sin(idlePhase * 2 + .58) * .58;
  let left = tilt + breathing * .2;
  let center = -breathing;
  let right = -tilt + breathing * .2;

  const reactionActive = reactionProgress < 1;
  const driver = reactionActive ? reactionProgress : mutationProgress;
  const energy = liquidActivationEnergy(reactionProgress, mutationProgress);
  if (energy > 0) {
    const strength = reactionActive ? 1 : 1.7;
    const damping = 1 - clamp01(driver) * .58;
    const sidePhase = clamp01((driver - .065) / .78);
    center += Math.sin(driver * Math.PI * 5) * 8.2 * damping * energy * strength;
    left += Math.sin(sidePhase * Math.PI * 4 + .48) * 4.4 * damping * energy * strength;
    right += Math.sin(sidePhase * Math.PI * 4 - .48) * 4.4 * damping * energy * strength;
  }

  // Simpson weighting keeps the represented surface height—and therefore the
  // fill amount—constant while the three control anchors deform.
  const weightedMean = (left + center * 4 + right) / 6;
  return {
    center: center - weightedMean,
    left: left - weightedMean,
    right: right - weightedMean,
  };
}

export type InteractiveRelicVialHandle = {
  playMutation: () => void;
  playReaction: () => void;
};

type Props = {
  fillRatio?: number;
  fromContainer: RelicContainer;
  height: number;
  onMutationBurst?: () => void;
  onMutationComplete?: () => void;
  testID?: string;
  toContainer?: RelicContainer | null;
  width: number;
};

const InteractiveRelicVial = forwardRef<InteractiveRelicVialHandle, Props>(function InteractiveRelicVial({
  fillRatio = 1,
  fromContainer,
  height,
  onMutationBurst,
  onMutationComplete,
  testID,
  toContainer = null,
  width,
}, ref) {
  const reduceMotion = useReducedMotion();
  const idleProgress = useSharedValue(0);
  const reactionProgress = useSharedValue(1);
  const mutationProgress = useSharedValue(toContainer ? 0 : 1);
  const hasMutationTransition = Boolean(toContainer);

  const finishMutationBurst = useCallback(() => {
    onMutationBurst?.();
  }, [onMutationBurst]);
  const finishMutation = useCallback(() => {
    onMutationComplete?.();
  }, [onMutationComplete]);

  useImperativeHandle(ref, () => ({
    playReaction() {
      cancelAnimation(reactionProgress);
      reactionProgress.value = 0;
      if (reduceMotion) {
        reactionProgress.value = 1;
        return;
      }
      reactionProgress.value = withTiming(1, {
        duration: REACTION_DURATION_MS,
        easing: Easing.linear,
      });
    },
    playMutation() {
      cancelAnimation(mutationProgress);
      mutationProgress.value = 0;
      if (reduceMotion) {
        mutationProgress.value = 1;
        finishMutationBurst();
        finishMutation();
        return;
      }
      mutationProgress.value = withSequence(
        withTiming(.36, {
          duration: MUTATION_CHARGE_MS,
          easing: Easing.in(Easing.quad),
        }, (finished) => {
          if (finished) runOnJS(finishMutationBurst)();
        }),
        withTiming(1, {
          duration: MUTATION_RELEASE_MS,
          easing: Easing.out(Easing.cubic),
        }, (finished) => {
          if (finished) runOnJS(finishMutation)();
        }),
      );
    },
  }), [finishMutation, finishMutationBurst, mutationProgress, reactionProgress, reduceMotion]);

  useEffect(() => {
    cancelAnimation(mutationProgress);
    mutationProgress.value = toContainer ? 0 : 1;
  }, [fromContainer, mutationProgress, toContainer]);

  useEffect(() => {
    cancelAnimation(idleProgress);
    idleProgress.value = 0;
    if (reduceMotion) return;
    idleProgress.value = withRepeat(
      withTiming(1, {
        duration: IDLE_LIQUID_CYCLE_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [idleProgress, reduceMotion]);

  useEffect(() => () => {
    cancelAnimation(idleProgress);
    cancelAnimation(reactionProgress);
    cancelAnimation(mutationProgress);
  }, [idleProgress, mutationProgress, reactionProgress]);

  const oldVesselMotion = useAnimatedStyle(() => {
    if (!hasMutationTransition) return { opacity: 1, transform: [{ scale: 1 }] };
    return {
      opacity: interpolate(
        mutationProgress.value,
        [0, .4, .55, .66],
        [1, 1, .92, 0],
        Extrapolation.CLAMP,
      ),
      transform: [{
        scale: interpolate(
          mutationProgress.value,
          [0, .36, .52, .66],
          [1, 1.018, 1.08, .94],
          Extrapolation.CLAMP,
        ),
      }],
    };
  }, [hasMutationTransition]);
  const newVesselMotion = useAnimatedStyle(() => ({
    opacity: interpolate(
      mutationProgress.value,
      [.57, .66, .82, 1],
      [0, .08, 1, 1],
      Extrapolation.CLAMP,
    ),
    transform: [{
      scale: interpolate(
        mutationProgress.value,
        [.57, .68, .84, 1],
        [.84, .94, 1.02, 1],
        Extrapolation.CLAMP,
      ),
    }],
  }));

  return (
    <View pointerEvents="none" style={[styles.viewport, { height, width }]} testID={testID}>
      <Animated.View style={[StyleSheet.absoluteFill, oldVesselMotion]}>
        <StaticRelicVial
          container={fromContainer}
          fillRatio={fillRatio}
          height={height}
          renderLiquid={false}
          testID={testID ? `${testID}-from` : undefined}
          width={width}
        />
      </Animated.View>

      {toContainer ? (
        <Animated.View style={[StyleSheet.absoluteFill, newVesselMotion]}>
          <StaticRelicVial
            container={toContainer}
            fillRatio={0}
            height={height}
            renderLiquid={false}
            testID={testID ? `${testID}-to` : undefined}
            width={width}
          />
        </Animated.View>
      ) : null}

      <RelicInteractionArtwork
        container={fromContainer}
        fillRatio={fillRatio}
        height={height}
        idleProgress={idleProgress}
        mutationProgress={mutationProgress}
        reactionProgress={reactionProgress}
        width={width}
      />

      {RELIC_STAGE_ARTWORK[fromContainer].foregroundPaths?.length ? (
        <View style={StyleSheet.absoluteFill}>
          <RelicVesselForegroundArtwork
            config={RELIC_STAGE_ARTWORK[fromContainer]}
            container={fromContainer}
          />
        </View>
      ) : null}
    </View>
  );
});

export default InteractiveRelicVial;

type RelicInteractionArtworkProps = {
  container: RelicContainer;
  fillRatio: number;
  height: number;
  idleProgress: SharedValue<number>;
  mutationProgress: SharedValue<number>;
  reactionProgress: SharedValue<number>;
  width: number;
};

function RelicInteractionArtwork(props: RelicInteractionArtworkProps) {
  if (Platform.OS === 'web') return <RelicInteractionSvgArtwork {...props} />;
  return <RelicInteractionSkiaArtwork {...props} />;
}

function RelicInteractionSkiaArtwork({
  container,
  fillRatio,
  height,
  idleProgress,
  mutationProgress,
  reactionProgress,
  width,
}: RelicInteractionArtworkProps) {
  const config = RELIC_STAGE_ARTWORK[container];
  const prototypeEnabled = container === 'ampoule';
  const level = relicLiquidLevelForRatio(config, fillRatio);
  const liquidVolumePath = relicLiquidVolumePathForLevel(config, level, 10);
  const liquidPresent = Boolean(liquidVolumePath);
  const idleCurrentPath = relicLiquidCurrentPath(config, level);
  const bubbleSource = relicLiquidSurfaceForLevel(config, config.liquidFloor);
  const ampouleAnatomy = useImage(AMPOULE_ANATOMY_ASSET);
  const dormantAmpouleAnatomy = useImage(AMPOULE_DORMANT_ANATOMY_ASSET);
  const animatedLiquidPath = useDerivedValue(() => {
    const offsets = relicLiquidSurfaceOffsets(
      idleProgress.value,
      reactionProgress.value,
      mutationProgress.value,
    );
    return relicLiquidDynamicVolumePathForLevel(config, level, 10, offsets);
  });
  const animatedSurfacePath = useDerivedValue(() => {
    const offsets = relicLiquidSurfaceOffsets(
      idleProgress.value,
      reactionProgress.value,
      mutationProgress.value,
    );
    return relicLiquidDynamicSurfacePathForLevel(config, level, 10, offsets);
  });
  const heartEnergy = useDerivedValue(() => prototypeEnabled
    ? heartActivationEnergy(reactionProgress.value, mutationProgress.value)
    : 0);
  const lowerRootEnergy = useDerivedValue(() => prototypeEnabled
    ? rootBandEnergy(reactionProgress.value, mutationProgress.value, .11, .2, .06, .17)
    : 0);
  const middleRootEnergy = useDerivedValue(() => prototypeEnabled
    ? rootBandEnergy(reactionProgress.value, mutationProgress.value, .17, .27, .11, .22)
    : 0);
  const upperRootEnergy = useDerivedValue(() => prototypeEnabled
    ? rootBandEnergy(reactionProgress.value, mutationProgress.value, .24, .34, .17, .3)
    : 0);
  const liquidEnergy = useDerivedValue(() => liquidPresent
    ? liquidActivationEnergy(reactionProgress.value, mutationProgress.value)
    : 0, [liquidPresent]);
  const idleCurrentTransform = useDerivedValue(() => {
    const phase = idleProgress.value * Math.PI * 2;
    return [
      { translateX: Math.sin(phase + 1.35) * 3.1 },
      { translateY: Math.cos(phase * .72) * 1.45 },
    ];
  });
  const flashProgress = useDerivedValue(() => mutationFlashPhase(mutationProgress.value));
  const flashRadius = useDerivedValue(() => 18 + flashProgress.value * 165);
  const flashOpacity = useDerivedValue(() => mutationFlashOpacity(mutationProgress.value));

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <FitBox
        dst={rect(0, 0, Math.max(1, width), Math.max(1, height))}
        fit="cover"
        src={rect(0, 0, ARTBOARD_SIZE, ARTBOARD_SIZE)}
      >
        <Group clip={config.interiorPath}>
          <Group clip={AMPOULE_ROOT_REGION} opacity={prototypeEnabled ? 1 : 0}>
            <SkiaImage
              fit="fill"
              height={ARTBOARD_SIZE}
              image={dormantAmpouleAnatomy}
              width={ARTBOARD_SIZE}
              x={0}
              y={0}
            />
          </Group>

          {liquidPresent ? (
            <Path path={animatedLiquidPath}>
              <LinearGradient
                colors={['#431052', '#27042F', '#120018', '#050008']}
                end={vec(500, config.liquidFloor)}
                positions={[0, .34, .72, 1]}
                start={vec(500, level)}
              />
            </Path>
          ) : null}

          {idleCurrentPath && liquidVolumePath ? (
            <Group clip={liquidVolumePath}>
              <Group opacity={.06} transform={idleCurrentTransform}>
                <Path
                  color="#B77AC2"
                  path={idleCurrentPath}
                  strokeCap="round"
                  strokeWidth={8}
                  style="stroke"
                >
                  <BlurMask blur={6} style="normal" />
                </Path>
              </Group>
            </Group>
          ) : null}

          <Group blendMode="screen" clip={AMPOULE_ROOT_BANDS.lower} opacity={lowerRootEnergy}>
            <SkiaImage
              fit="fill"
              height={ARTBOARD_SIZE}
              image={ampouleAnatomy}
              width={ARTBOARD_SIZE}
              x={0}
              y={0}
            />
          </Group>
          <Group blendMode="screen" clip={AMPOULE_ROOT_BANDS.middle} opacity={middleRootEnergy}>
            <SkiaImage
              fit="fill"
              height={ARTBOARD_SIZE}
              image={ampouleAnatomy}
              width={ARTBOARD_SIZE}
              x={0}
              y={0}
            />
          </Group>
          <Group blendMode="screen" clip={AMPOULE_ROOT_BANDS.upper} opacity={upperRootEnergy}>
            <SkiaImage
              fit="fill"
              height={ARTBOARD_SIZE}
              image={ampouleAnatomy}
              width={ARTBOARD_SIZE}
              x={0}
              y={0}
            />
          </Group>

          <Group clip={AMPOULE_HEART_REGION} opacity={prototypeEnabled ? .92 : 0}>
            <SkiaImage
              fit="fill"
              height={ARTBOARD_SIZE}
              image={ampouleAnatomy}
              width={ARTBOARD_SIZE}
              x={0}
              y={0}
            />
          </Group>
          <Group blendMode="screen" clip={AMPOULE_HEART_REGION} opacity={heartEnergy}>
            <SkiaImage
              fit="fill"
              height={ARTBOARD_SIZE}
              image={ampouleAnatomy}
              width={ARTBOARD_SIZE}
              x={0}
              y={0}
            />
          </Group>

          {liquidPresent ? (
            <Path
              color="#8D4D9C"
              opacity={.68}
              path={animatedSurfacePath}
              strokeCap="round"
              strokeWidth={2}
              style="stroke"
            />
          ) : null}
          {BUBBLES.map((bubble, index) => (
            <RelicBubble
              cx={bubbleSource.x + bubbleSource.width * .42 * bubble.horizontalPosition}
              duration={bubble.duration}
              energy={liquidEnergy}
              floor={config.liquidFloor}
              key={`relic-bubble-${index}`}
              mutationProgress={mutationProgress}
              radius={bubble.radius}
              reactionProgress={reactionProgress}
              sourceLift={bubble.sourceLift}
              start={bubble.start}
              surfaceLevel={level}
              sway={bubble.sway}
            />
          ))}
        </Group>

        <Group blendMode="screen">
          {BURST_PARTICLES.map(([angle, distance, radius], index) => (
            <RelicBurstParticle
              angle={angle}
              color={index % 3 === 1 ? '#FFD36B' : index % 3 === 2 ? '#A56BFF' : '#FF9B25'}
              distance={distance}
              key={`relic-burst-particle-${index}`}
              progress={mutationProgress}
              radius={radius}
            />
          ))}

          <Circle cx={500} cy={630} opacity={flashOpacity} r={flashRadius}>
            <RadialGradient
              c={vec(500, 630)}
              colors={['#FFFFFF', '#FFD36B', 'rgba(255,104,0,.45)', 'rgba(255,80,0,0)']}
              positions={[0, .18, .52, 1]}
              r={183}
            />
          </Circle>
        </Group>
      </FitBox>
    </Canvas>
  );
}

function RelicInteractionSvgArtwork({
  container,
  fillRatio,
  idleProgress,
  mutationProgress,
  reactionProgress,
}: RelicInteractionArtworkProps) {
  const config = RELIC_STAGE_ARTWORK[container];
  const uniqueId = useId().replace(/:/g, '');
  const clipId = `interactive-relic-clip-${uniqueId}`;
  const dormantClipId = `interactive-relic-dormant-clip-${uniqueId}`;
  const dormantRootRegionId = `interactive-relic-dormant-roots-${uniqueId}`;
  const heartRegionId = `interactive-relic-heart-${uniqueId}`;
  const flashId = `interactive-relic-flash-${uniqueId}`;
  const liquidGradientId = `interactive-relic-liquid-depth-${uniqueId}`;
  const prototypeEnabled = container === 'ampoule';
  const level = relicLiquidLevelForRatio(config, fillRatio);
  const liquidVolumePath = relicLiquidVolumePathForLevel(config, level, 10);
  const liquidPresent = Boolean(liquidVolumePath);
  const idleCurrentPath = relicLiquidCurrentPath(config, level);
  const bubbleSource = relicLiquidSurfaceForLevel(config, config.liquidFloor);
  const liquidVolumeProps = useAnimatedProps(() => {
    const offsets = relicLiquidSurfaceOffsets(
      idleProgress.value,
      reactionProgress.value,
      mutationProgress.value,
    );
    return {
      d: relicLiquidDynamicVolumePathForLevel(config, level, 10, offsets),
    };
  }, [config, level]);
  const liquidSurfaceProps = useAnimatedProps(() => {
    const offsets = relicLiquidSurfaceOffsets(
      idleProgress.value,
      reactionProgress.value,
      mutationProgress.value,
    );
    return {
      d: relicLiquidDynamicSurfacePathForLevel(config, level, 10, offsets),
    };
  }, [config, level]);
  const heartEnergyStyle = useAnimatedStyle(() => {
    return {
      opacity: prototypeEnabled
        ? heartActivationEnergy(reactionProgress.value, mutationProgress.value)
        : 0,
    };
  }, [prototypeEnabled]);
  const idleCurrentStyle = useAnimatedStyle(() => {
    const phase = idleProgress.value * Math.PI * 2;
    return {
      transform: [
        { translateX: Math.sin(phase + 1.35) * 3.1 },
        { translateY: Math.cos(phase * .72) * 1.45 },
      ],
    };
  });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {prototypeEnabled ? (
        <View style={StyleSheet.absoluteFill}>
          <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
            <SvgDefs>
              <SvgClipPath id={dormantClipId}><SvgPath d={config.interiorPath} /></SvgClipPath>
              <SvgClipPath id={dormantRootRegionId}><SvgPath d={AMPOULE_ROOT_REGION} /></SvgClipPath>
            </SvgDefs>
            <SvgGroup clipPath={`url(#${dormantClipId})`}>
              <SvgGroup clipPath={`url(#${dormantRootRegionId})`}>
                <SvgImage
                  height={ARTBOARD_SIZE}
                  href={AMPOULE_DORMANT_ANATOMY_ASSET}
                  opacity={1}
                  preserveAspectRatio="xMidYMid slice"
                  width={ARTBOARD_SIZE}
                  x={0}
                  y={0}
                />
              </SvgGroup>
            </SvgGroup>
          </Svg>
        </View>
      ) : null}

      {liquidPresent ? (
        <View style={StyleSheet.absoluteFill}>
          <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
            <SvgDefs>
              <SvgClipPath id={`${clipId}-liquid-body`}><SvgPath d={config.interiorPath} /></SvgClipPath>
              <SvgLinearGradient id={liquidGradientId} x1="0" x2="0" y1="0" y2="1">
                <SvgStop offset="0" stopColor="#431052" stopOpacity=".94" />
                <SvgStop offset=".34" stopColor="#27042F" stopOpacity=".96" />
                <SvgStop offset=".72" stopColor="#120018" stopOpacity=".98" />
                <SvgStop offset="1" stopColor="#050008" stopOpacity=".99" />
              </SvgLinearGradient>
            </SvgDefs>
            <SvgGroup clipPath={`url(#${clipId}-liquid-body)`}>
              <AnimatedSvgPath
                animatedProps={liquidVolumeProps}
                fill={`url(#${liquidGradientId})`}
              />
            </SvgGroup>
          </Svg>
        </View>
      ) : null}

      {idleCurrentPath && liquidVolumePath ? (
        <Animated.View style={[StyleSheet.absoluteFill, idleCurrentStyle]}>
          <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
            <SvgDefs>
              <SvgClipPath id={`${clipId}-idle-current`}><SvgPath d={liquidVolumePath} /></SvgClipPath>
            </SvgDefs>
            <SvgGroup clipPath={`url(#${clipId}-idle-current)`}>
              <SvgPath
                d={idleCurrentPath}
                fill="none"
                stroke="#B77AC2"
                strokeLinecap="round"
                strokeOpacity=".06"
                strokeWidth="8"
              />
            </SvgGroup>
          </Svg>
        </Animated.View>
      ) : null}

      <RelicSvgRootBand
        enabled={prototypeEnabled}
        interiorPath={config.interiorPath}
        mutationEnd={.17}
        mutationProgress={mutationProgress}
        mutationStart={.06}
        reactionEnd={.2}
        reactionProgress={reactionProgress}
        reactionStart={.11}
        regionPath={AMPOULE_ROOT_BANDS.lower}
        uniqueId={`${uniqueId}-lower`}
      />
      <RelicSvgRootBand
        enabled={prototypeEnabled}
        interiorPath={config.interiorPath}
        mutationEnd={.22}
        mutationProgress={mutationProgress}
        mutationStart={.11}
        reactionEnd={.27}
        reactionProgress={reactionProgress}
        reactionStart={.17}
        regionPath={AMPOULE_ROOT_BANDS.middle}
        uniqueId={`${uniqueId}-middle`}
      />
      <RelicSvgRootBand
        enabled={prototypeEnabled}
        interiorPath={config.interiorPath}
        mutationEnd={.3}
        mutationProgress={mutationProgress}
        mutationStart={.17}
        reactionEnd={.34}
        reactionProgress={reactionProgress}
        reactionStart={.24}
        regionPath={AMPOULE_ROOT_BANDS.upper}
        uniqueId={`${uniqueId}-upper`}
      />

      {prototypeEnabled ? (
        <View style={StyleSheet.absoluteFill}>
          <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
            <SvgDefs>
              <SvgClipPath id={`${clipId}-heart-base`}><SvgPath d={config.interiorPath} /></SvgClipPath>
              <SvgClipPath id={`${heartRegionId}-base`}><SvgPath d={AMPOULE_HEART_REGION} /></SvgClipPath>
            </SvgDefs>
            <SvgGroup clipPath={`url(#${clipId}-heart-base)`}>
              <SvgGroup clipPath={`url(#${heartRegionId}-base)`}>
                <SvgImage
                  height={ARTBOARD_SIZE}
                  href={AMPOULE_ANATOMY_ASSET}
                  opacity=".92"
                  preserveAspectRatio="xMidYMid slice"
                  width={ARTBOARD_SIZE}
                  x={0}
                  y={0}
                />
              </SvgGroup>
            </SvgGroup>
          </Svg>
        </View>
      ) : null}

      <Animated.View style={[StyleSheet.absoluteFill, heartEnergyStyle]}>
        <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
          <SvgDefs>
            <SvgClipPath id={`${clipId}-heart`}><SvgPath d={config.interiorPath} /></SvgClipPath>
            <SvgClipPath id={heartRegionId}><SvgPath d={AMPOULE_HEART_REGION} /></SvgClipPath>
          </SvgDefs>
          <SvgGroup clipPath={`url(#${clipId}-heart)`}>
            <SvgGroup clipPath={`url(#${heartRegionId})`}>
              <SvgImage
                height={ARTBOARD_SIZE}
                href={AMPOULE_ANATOMY_ASSET}
                preserveAspectRatio="xMidYMid slice"
                width={ARTBOARD_SIZE}
                x={0}
                y={0}
              />
            </SvgGroup>
          </SvgGroup>
        </Svg>
      </Animated.View>

      {liquidPresent ? (
        <View style={StyleSheet.absoluteFill}>
          <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
            <SvgDefs>
              <SvgClipPath id={`${clipId}-liquid-surface`}><SvgPath d={config.interiorPath} /></SvgClipPath>
            </SvgDefs>
            <SvgGroup clipPath={`url(#${clipId}-liquid-surface)`}>
              <AnimatedSvgPath
                animatedProps={liquidSurfaceProps}
                fill="none"
                stroke="#8D4D9C"
                strokeLinecap="round"
                strokeOpacity=".68"
                strokeWidth="2"
              />
            </SvgGroup>
          </Svg>
        </View>
      ) : null}

      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
          <SvgDefs>
            <SvgClipPath id={`${clipId}-bubbles`}><SvgPath d={config.interiorPath} /></SvgClipPath>
          </SvgDefs>
          <SvgGroup clipPath={`url(#${clipId}-bubbles)`}>
            {BUBBLES.map((bubble, index) => (
              <RelicSvgBubble
                cx={bubbleSource.x + bubbleSource.width * .42 * bubble.horizontalPosition}
                duration={bubble.duration}
                enabled={liquidPresent}
                floor={config.liquidFloor}
                key={`svg-relic-bubble-${index}`}
                mutationProgress={mutationProgress}
                radius={bubble.radius}
                reactionProgress={reactionProgress}
                sourceLift={bubble.sourceLift}
                start={bubble.start}
                surfaceLevel={level}
                sway={bubble.sway}
              />
            ))}
          </SvgGroup>
        </Svg>
      </View>

      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
          <SvgDefs>
            <SvgRadialGradient cx="50%" cy="50%" id={flashId} r="50%">
              <SvgStop offset="0" stopColor="#FFFFFF" />
              <SvgStop offset=".22" stopColor="#FFD36B" />
              <SvgStop offset=".58" stopColor="#FF6800" stopOpacity=".48" />
              <SvgStop offset="1" stopColor="#FF5000" stopOpacity="0" />
            </SvgRadialGradient>
          </SvgDefs>
          <RelicSvgMutationFlash
            fill={`url(#${flashId})`}
            progress={mutationProgress}
          />
          {BURST_PARTICLES.map(([angle, distance, radius], index) => (
            <RelicSvgBurstParticle
              angle={angle}
              distance={distance}
              fill={index % 3 === 1 ? '#FFD36B' : index % 3 === 2 ? '#A56BFF' : '#FF9B25'}
              key={`svg-relic-burst-particle-${index}`}
              progress={mutationProgress}
              radius={radius}
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}

function RelicSvgRootBand({
  enabled,
  interiorPath,
  mutationEnd,
  mutationProgress,
  mutationStart,
  reactionEnd,
  reactionProgress,
  reactionStart,
  regionPath,
  uniqueId,
}: {
  enabled: boolean;
  interiorPath: string;
  mutationEnd: number;
  mutationProgress: SharedValue<number>;
  mutationStart: number;
  reactionEnd: number;
  reactionProgress: SharedValue<number>;
  reactionStart: number;
  regionPath: string;
  uniqueId: string;
}) {
  const clipId = `interactive-relic-root-clip-${uniqueId}`;
  const regionId = `interactive-relic-root-region-${uniqueId}`;
  const energyStyle = useAnimatedStyle(() => ({
    opacity: enabled
      ? rootBandEnergy(
          reactionProgress.value,
          mutationProgress.value,
          reactionStart,
          reactionEnd,
          mutationStart,
          mutationEnd,
        )
      : 0,
  }), [enabled, mutationEnd, mutationStart, reactionEnd, reactionStart]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, energyStyle]}>
      <Svg height="100%" preserveAspectRatio="xMidYMid slice" viewBox="0 0 1000 1000" width="100%">
        <SvgDefs>
          <SvgClipPath id={clipId}><SvgPath d={interiorPath} /></SvgClipPath>
          <SvgClipPath id={regionId}><SvgPath d={regionPath} /></SvgClipPath>
        </SvgDefs>
        <SvgGroup clipPath={`url(#${clipId})`}>
          <SvgGroup clipPath={`url(#${regionId})`}>
            <SvgImage
              height={ARTBOARD_SIZE}
              href={AMPOULE_ANATOMY_ASSET}
              preserveAspectRatio="xMidYMid slice"
              width={ARTBOARD_SIZE}
              x={0}
              y={0}
            />
          </SvgGroup>
        </SvgGroup>
      </Svg>
    </Animated.View>
  );
}

function RelicSvgBubble({
  cx,
  duration,
  enabled,
  floor,
  mutationProgress,
  radius,
  reactionProgress,
  sourceLift,
  start,
  surfaceLevel,
  sway,
}: {
  cx: number;
  duration: number;
  enabled: boolean;
  floor: number;
  mutationProgress: SharedValue<number>;
  radius: number;
  reactionProgress: SharedValue<number>;
  sourceLift: number;
  start: number;
  surfaceLevel: number;
  sway: number;
}) {
  const sourceY = floor - sourceLift;
  const rise = Math.max(0, sourceY - (surfaceLevel + 2));
  const bodyProps = useAnimatedProps(() => {
    const energy = enabled
      ? liquidActivationEnergy(reactionProgress.value, mutationProgress.value)
      : 0;
    const phase = relicBubblePhase(
      reactionProgress.value,
      mutationProgress.value,
      start,
      duration,
    );
    const bubbleCx = cx + relicBubbleHorizontalOffset(phase, start, sway);
    const bubbleCy = sourceY - phase * rise;
    return {
      d: relicBubbleBodyPath(bubbleCx, bubbleCy, radius, phase, start),
      opacity: relicBubbleBodyOpacity(phase, energy, rise),
    };
  }, [cx, duration, enabled, radius, rise, sourceY, start, sway]);

  const ringProps = useAnimatedProps(() => {
    const energy = enabled
      ? liquidActivationEnergy(reactionProgress.value, mutationProgress.value)
      : 0;
    const phase = relicBubblePhase(
      reactionProgress.value,
      mutationProgress.value,
      start,
      duration,
    );
    const burst = relicBubbleBurstPhase(phase);
    const surfaceCx = cx + relicBubbleHorizontalOffset(.96, start, sway);
    return {
      d: relicBubbleBurstRingPath(surfaceCx, surfaceLevel + 2, radius, burst),
      opacity: relicBubbleBurstOpacity(phase, energy, rise),
    };
  }, [cx, duration, enabled, radius, rise, start, surfaceLevel, sway]);

  const leftDropletProps = useAnimatedProps(() => {
    const energy = enabled
      ? liquidActivationEnergy(reactionProgress.value, mutationProgress.value)
      : 0;
    const phase = relicBubblePhase(
      reactionProgress.value,
      mutationProgress.value,
      start,
      duration,
    );
    const burst = relicBubbleBurstPhase(phase);
    return {
      cx: cx + relicBubbleHorizontalOffset(.96, start, sway) - (radius + 5) * burst,
      cy: surfaceLevel + 1 - Math.sin(burst * Math.PI) * (5 + radius * .5),
      opacity: relicBubbleBurstOpacity(phase, energy, rise) * .76,
      r: Math.max(1, radius * .22) * (1 - burst * .35),
    };
  }, [cx, duration, enabled, radius, rise, start, surfaceLevel, sway]);

  const rightDropletProps = useAnimatedProps(() => {
    const energy = enabled
      ? liquidActivationEnergy(reactionProgress.value, mutationProgress.value)
      : 0;
    const phase = relicBubblePhase(
      reactionProgress.value,
      mutationProgress.value,
      start,
      duration,
    );
    const burst = relicBubbleBurstPhase(phase);
    return {
      cx: cx + relicBubbleHorizontalOffset(.96, start, sway) + (radius + 5) * burst,
      cy: surfaceLevel + 1 - Math.sin(burst * Math.PI) * (7 + radius * .62),
      opacity: relicBubbleBurstOpacity(phase, energy, rise) * .68,
      r: Math.max(.9, radius * .18) * (1 - burst * .3),
    };
  }, [cx, duration, enabled, radius, rise, start, surfaceLevel, sway]);

  return (
    <>
      <AnimatedSvgPath
        animatedProps={bodyProps}
        fill="rgba(35,2,45,.72)"
        stroke="#8D4D9C"
        strokeWidth={1.15}
      />
      <AnimatedSvgPath
        animatedProps={ringProps}
        fill="none"
        stroke="#A965B7"
        strokeWidth={1.2}
      />
      <AnimatedSvgCircle animatedProps={leftDropletProps} fill="#864194" />
      <AnimatedSvgCircle animatedProps={rightDropletProps} fill="#A965B7" />
    </>
  );
}

function RelicSvgMutationFlash({
  fill,
  progress,
}: {
  fill: string;
  progress: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => ({
    opacity: mutationFlashOpacity(progress.value),
    r: 18 + mutationFlashPhase(progress.value) * 165,
  }));

  return (
    <AnimatedSvgCircle
      animatedProps={animatedProps}
      cx={500}
      cy={630}
      fill={fill}
    />
  );
}

function RelicSvgBurstParticle({
  angle,
  distance,
  fill,
  progress,
  radius,
}: {
  angle: number;
  distance: number;
  fill: string;
  progress: SharedValue<number>;
  radius: number;
}) {
  const animatedProps = useAnimatedProps(() => {
    const phase = clamp01((progress.value - .34) / .43);
    const eased = 1 - Math.pow(1 - phase, 3);
    const opacity = progress.value < .34 || progress.value > .92
      ? 0
      : 1 - clamp01((progress.value - .68) / .24);
    return {
      cx: 500 + Math.cos(angle) * distance * eased,
      cy: 630 + Math.sin(angle) * distance * eased + 120 * phase * phase,
      opacity,
      r: radius * (1 - phase * .54),
    };
  }, [angle, distance, radius]);

  return <AnimatedSvgCircle animatedProps={animatedProps} fill={fill} />;
}

function RelicBubble({
  cx,
  duration,
  energy,
  floor,
  mutationProgress,
  radius,
  reactionProgress,
  sourceLift,
  start,
  surfaceLevel,
  sway,
}: {
  cx: number;
  duration: number;
  energy: SharedValue<number>;
  floor: number;
  mutationProgress: SharedValue<number>;
  radius: number;
  reactionProgress: SharedValue<number>;
  sourceLift: number;
  start: number;
  surfaceLevel: number;
  sway: number;
}) {
  const sourceY = floor - sourceLift;
  const rise = Math.max(0, sourceY - (surfaceLevel + 2));
  const phase = useDerivedValue(() => relicBubblePhase(
    reactionProgress.value,
    mutationProgress.value,
    start,
    duration,
  ));
  const surfaceCx = cx + relicBubbleHorizontalOffset(.96, start, sway);
  const bubblePath = useDerivedValue(() => relicBubbleBodyPath(
    cx + relicBubbleHorizontalOffset(phase.value, start, sway),
    sourceY - phase.value * rise,
    radius,
    phase.value,
    start,
  ));
  const opacity = useDerivedValue(() => (
    relicBubbleBodyOpacity(phase.value, energy.value, rise)
  ));
  const fillOpacity = useDerivedValue(() => opacity.value * .72);
  const burstPhase = useDerivedValue(() => relicBubbleBurstPhase(phase.value));
  const burstOpacity = useDerivedValue(() => (
    relicBubbleBurstOpacity(phase.value, energy.value, rise)
  ));
  const ringPath = useDerivedValue(() => relicBubbleBurstRingPath(
    surfaceCx,
    surfaceLevel + 2,
    radius,
    burstPhase.value,
  ));
  const leftDropletX = useDerivedValue(() => surfaceCx - (radius + 5) * burstPhase.value);
  const rightDropletX = useDerivedValue(() => surfaceCx + (radius + 5) * burstPhase.value);
  const leftDropletY = useDerivedValue(() => (
    surfaceLevel + 1 - Math.sin(burstPhase.value * Math.PI) * (5 + radius * .5)
  ));
  const rightDropletY = useDerivedValue(() => (
    surfaceLevel + 1 - Math.sin(burstPhase.value * Math.PI) * (7 + radius * .62)
  ));
  const leftDropletOpacity = useDerivedValue(() => burstOpacity.value * .76);
  const rightDropletOpacity = useDerivedValue(() => burstOpacity.value * .68);
  const leftDropletRadius = useDerivedValue(() => (
    Math.max(1, radius * .22) * (1 - burstPhase.value * .35)
  ));
  const rightDropletRadius = useDerivedValue(() => (
    Math.max(.9, radius * .18) * (1 - burstPhase.value * .3)
  ));

  return (
    <Group>
      <Path color="#23022D" opacity={fillOpacity} path={bubblePath} />
      <Path color="#8D4D9C" opacity={opacity} path={bubblePath} style="stroke" strokeWidth={1.15} />
      <Path
        color="#A965B7"
        opacity={burstOpacity}
        path={ringPath}
        style="stroke"
        strokeWidth={1.2}
      />
      <Circle
        color="#864194"
        cx={leftDropletX}
        cy={leftDropletY}
        opacity={leftDropletOpacity}
        r={leftDropletRadius}
      />
      <Circle
        color="#A965B7"
        cx={rightDropletX}
        cy={rightDropletY}
        opacity={rightDropletOpacity}
        r={rightDropletRadius}
      />
    </Group>
  );
}

function RelicBurstParticle({
  angle,
  color,
  distance,
  progress,
  radius,
}: {
  angle: number;
  color: string;
  distance: number;
  progress: SharedValue<number>;
  radius: number;
}) {
  const phase = useDerivedValue(() => clamp01((progress.value - .34) / .43));
  const eased = useDerivedValue(() => 1 - Math.pow(1 - phase.value, 3));
  const cx = useDerivedValue(() => 500 + Math.cos(angle) * distance * eased.value);
  const cy = useDerivedValue(() => (
    630 + Math.sin(angle) * distance * eased.value + 120 * phase.value * phase.value
  ));
  const opacity = useDerivedValue(() => {
    if (progress.value < .34 || progress.value > .92) return 0;
    return 1 - clamp01((progress.value - .68) / .24);
  });
  const animatedRadius = useDerivedValue(() => radius * (1 - phase.value * .54));

  return (
    <Circle color={color} cx={cx} cy={cy} opacity={opacity} r={animatedRadius}>
      <BlurMask blur={3} style="solid" />
    </Circle>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'relative',
    flexShrink: 0,
    overflow: 'hidden',
    backgroundColor: '#010308',
  },
});
