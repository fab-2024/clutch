import Svg, {
  Circle,
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
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedProps,
} from 'react-native-reanimated';

import {
  mutationElapsedMs,
  mutationSegment,
} from '@/src/features/social/faction/relicMotion';
import {
  RELIC_STAGE_ARTWORK,
  rootBranchesForContainer,
  type RootBranch,
  type RelicStageArtworkConfig,
} from '@/src/features/social/faction/relicArtwork';
import type { RelicContainer } from '@/src/features/social/faction/types';

export type RelicRootsArtworkProps = {
  container: RelicContainer;
  tone?: 'base' | 'bright' | 'cyan';
};

const ROOT_NODES = [
  { minStage: 2, x: 64, y: 75, r: 1.05 },
  { minStage: 3, x: 59, y: 67, r: .92 },
  { minStage: 3, x: 71, y: 67, r: .88 },
  { minStage: 4, x: 62, y: 40, r: .8 },
  { minStage: 4, x: 41, y: 50, r: .68 },
  { minStage: 5, x: 67, y: 24, r: .7 },
] as const;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

type RelicMutationArtworkProps = {
  config: RelicStageArtworkConfig;
  container: RelicContainer;
  phase: SharedValue<number>;
  reduceMotion: boolean;
};

type RelicMutationLayerKind = 'old' | 'new';

const CRACK_PATHS = [
  'M110 270 L107 258 L101 251 L103 241 L96 233 L98 224 L91 215 M101 251 L94 247 L90 241',
  'M111 267 L118 256 L117 247 L125 240 L123 231 L132 222 L136 211 M125 240 L134 237 L139 231',
  'M108 263 L99 257 L96 249 L87 246 L83 238 L75 233 L71 223 M87 246 L81 247 L76 243',
  'M113 261 L121 256 L127 257 L134 249 L143 247 L147 238 L154 232 M134 249 L137 241 L143 236',
  'M107 254 L109 246 L106 238 L112 229 L109 220 L113 210 L110 202 M106 238 L99 234 L96 227',
  'M103 258 L95 256 L89 259 L82 254 L74 255 L68 249 M89 259 L85 265 L78 267',
  'M117 257 L125 255 L132 259 L139 255 L147 258 L154 253 M132 259 L137 265 L145 267',
] as const;

const RECONSTRUCTION_PATHS = [
  'M83 308 C76 281 73 249 77 217 C80 195 87 178 96 166',
  'M98 312 C94 281 94 247 97 215 C99 195 102 176 105 157',
  'M110 313 C110 278 110 244 110 210 C110 188 110 169 110 151',
  'M122 312 C126 281 126 247 123 215 C121 195 118 176 115 157',
  'M137 308 C144 281 147 249 143 217 C140 195 133 178 124 166',
] as const;

const MUTATION_FRAGMENTS = [
  { angle: -2.72, distance: 32, color: '#31D7E2', radius: 1.5 },
  { angle: -2.18, distance: 39, color: '#B76D3D', radius: 1.9 },
  { angle: -1.62, distance: 43, color: '#7B3E9E', radius: 1.35 },
  { angle: -.92, distance: 36, color: '#E1A15A', radius: 1.7 },
  { angle: -.22, distance: 42, color: '#31D7E2', radius: 1.25 },
  { angle: .46, distance: 34, color: '#A85F32', radius: 1.65 },
  { angle: 2.48, distance: 37, color: '#66358F', radius: 1.4 },
  { angle: 2.92, distance: 30, color: '#65E4E9', radius: 1.2 },
] as const;

const RETURN_BUBBLES = [
  { delay: 0, x: -9, drift: -4, radius: 2.1 },
  { delay: 55, x: 8, drift: 3, radius: 1.55 },
  { delay: 110, x: 1, drift: -2, radius: 1.25 },
] as const;

export function RelicLiquidArtwork({ levelLift = 0 }: { levelLift?: number }) {
  const surfaceY = 20 - Math.max(0, Math.min(18, levelLift));
  return (
    <Svg height="100%" viewBox="0 0 132 120" width="100%">
      <Defs>
        <ClipPath id="liquidInterior">
          <Path d={`M13 ${surfaceY} C7 ${surfaceY + 14} 1 54 4 73 C8 98 29 118 66 120 C103 118 124 98 128 73 C131 54 125 ${surfaceY + 14} 119 ${surfaceY} Z`} />
        </ClipPath>
        <SvgLinearGradient id="liquidDepth" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#251044" stopOpacity=".98" />
          <Stop offset=".38" stopColor="#1B0B3D" stopOpacity=".99" />
          <Stop offset="1" stopColor="#0D0824" stopOpacity="1" />
        </SvgLinearGradient>
        <SvgLinearGradient id="liquidSheen" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#6C2B91" stopOpacity=".02" />
          <Stop offset=".48" stopColor="#6C2B91" stopOpacity=".22" />
          <Stop offset="1" stopColor="#31D7E2" stopOpacity=".06" />
        </SvgLinearGradient>
        <SvgLinearGradient id="surfaceDepth" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#6C2B91" stopOpacity=".62" />
          <Stop offset=".5" stopColor="#271047" stopOpacity=".98" />
          <Stop offset="1" stopColor="#0D0824" stopOpacity=".98" />
        </SvgLinearGradient>
        <RadialGradient cx="50%" cy="58%" id="liquidVolume" r="58%">
          <Stop offset="0" stopColor="#5A247B" stopOpacity=".34" />
          <Stop offset=".5" stopColor="#35105A" stopOpacity=".16" />
          <Stop offset="1" stopColor="#0D0824" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <G clipPath="url(#liquidInterior)">
        <Rect fill="url(#liquidDepth)" height="120" width="132" />
        <Rect fill="url(#liquidVolume)" height="120" width="132" />
        <Path d="M20 43 C38 29 57 35 69 46 C83 59 98 50 113 38 L116 91 C96 103 78 96 66 88 C50 78 36 92 21 102 Z" fill="url(#liquidSheen)" />
        <Path d="M29 62 C41 50 48 51 56 58 C63 64 68 65 76 59" fill="none" opacity=".34" stroke="#6C2B91" strokeLinecap="round" strokeWidth="1.3" />
        <Path d="M78 79 C87 66 96 65 105 70" fill="none" opacity=".26" stroke="#8B43A7" strokeLinecap="round" strokeWidth="1" />
        <Path d="M33 94 C49 84 58 86 67 94 C76 102 87 100 99 91" fill="none" opacity=".2" stroke="#31D7E2" strokeLinecap="round" strokeWidth=".8" />
      </G>

      <Ellipse cx="66" cy={surfaceY} fill="url(#surfaceDepth)" rx="53" ry="10" />
      <Ellipse cx="66" cy={surfaceY} fill="none" opacity=".58" rx="53" ry="10" stroke="#6C2B91" strokeWidth="1.2" />
      <Path d={`M15 ${surfaceY} C34 ${surfaceY + 8} 97 ${surfaceY + 8} 117 ${surfaceY}`} fill="none" opacity=".64" stroke="#31D7E2" strokeLinecap="round" strokeWidth=".72" />
      <Path d={`M28 ${surfaceY - 4} C46 ${surfaceY - 10} 84 ${surfaceY - 10} 104 ${surfaceY - 4}`} fill="none" opacity=".32" stroke="#B66AD0" strokeLinecap="round" strokeWidth="1" />
    </Svg>
  );
}

export function RelicRootsArtwork({ container, tone = 'base' }: RelicRootsArtworkProps) {
  const stage = RELIC_STAGE_ARTWORK[container].stage;
  const branches = rootBranchesForContainer(container);
  const color = tone === 'cyan' ? '#31D7E2' : tone === 'bright' ? '#F0AF57' : '#A85F32';
  const widthScale = tone === 'base' ? 1.35 : tone === 'bright' ? .75 : .36;
  const opacity = tone === 'base' ? .74 : tone === 'bright' ? .72 : stage >= 4 ? .32 : .22;

  return (
    <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 132 120" width="100%">
      <Defs>
        <ClipPath id={`roots-safe-${container}-${tone}`}>
          <Path d="M8 8 H124 V112 H8 Z" />
        </ClipPath>
      </Defs>
      <G
        clipPath={`url(#roots-safe-${container}-${tone})`}
        fill="none"
        opacity={opacity}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {branches.map((branch) => (
          <Path d={branch.path} key={branch.id} strokeWidth={branch.width * widthScale} />
        ))}
      </G>
      {tone === 'bright' ? (
        <G fill="#FFE2A6" opacity=".62">
          {ROOT_NODES.filter((node) => node.minStage <= stage).map((node) => (
            <Circle cx={node.x} cy={node.y} key={`${node.x}-${node.y}`} r={node.r} />
          ))}
        </G>
      ) : null}
    </Svg>
  );
}

export function RelicInstabilityArcsArtwork({ container }: { container: RelicContainer }) {
  const stage = RELIC_STAGE_ARTWORK[container].stage;
  return (
    <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 132 120" width="100%">
      <G fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M45 66 C49 61 53 61 57 64" opacity=".76" stroke="#E6A650" strokeWidth=".72" />
        <Path d="M75 61 C80 56 84 57 88 61" opacity=".58" stroke="#31D7E2" strokeWidth=".58" />
        {stage >= 3 ? <Path d="M34 45 C39 41 43 42 47 46" opacity=".62" stroke="#C47A43" strokeWidth=".54" /> : null}
        {stage >= 4 ? <Path d="M91 42 C97 38 101 39 105 43" opacity=".56" stroke="#58DCE4" strokeWidth=".48" /> : null}
      </G>
    </Svg>
  );
}

export function RelicStageLiquidArtwork({ config, container, levelLift = 0 }: {
  config: RelicStageArtworkConfig;
  container: RelicContainer;
  levelLift?: number;
}) {
  const level = config.liquidLevel - Math.max(0, Math.min(18, levelLift));
  const clipId = `stage-liquid-${container}`;
  const depthId = `stage-depth-${container}`;
  const volumeId = `stage-volume-${container}`;

  return (
    <Svg height="100%" viewBox="0 0 220 330" width="100%">
      <Defs>
        <ClipPath id={clipId}>
          <Path d={config.interiorPath} />
          <Rect
            height={config.liquidLevel - level + 8}
            width={config.liquidSurfaceWidth - 6}
            x={110 - (config.liquidSurfaceWidth - 6) / 2}
            y={level}
          />
        </ClipPath>
        <SvgLinearGradient id={depthId} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#35105A" stopOpacity=".22" />
          <Stop offset=".42" stopColor="#1B0B3D" stopOpacity=".3" />
          <Stop offset="1" stopColor="#0D0824" stopOpacity=".42" />
        </SvgLinearGradient>
        <RadialGradient cx="49%" cy="56%" id={volumeId} r="58%">
          <Stop offset="0" stopColor="#6C2B91" stopOpacity=".13" />
          <Stop offset=".58" stopColor="#35105A" stopOpacity=".08" />
          <Stop offset="1" stopColor="#0D0824" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Rect fill={`url(#${depthId})`} height={330 - level} width="220" y={level} />
        <Rect fill={`url(#${volumeId})`} height={330 - level} width="220" y={level} />
        <Path
          d={`M38 ${level + 44} C75 ${level + 20} 104 ${level + 58} 142 ${level + 34} C166 ${level + 19} 184 ${level + 42} 194 ${level + 54}`}
          fill="none"
          opacity=".18"
          stroke="#6C2B91"
          strokeLinecap="round"
          strokeWidth="1.1"
        />
      </G>
      <G clipPath={`url(#${clipId})`}>
        <Ellipse cx="110" cy={level} fill="#1E0D3A" opacity=".78" rx="47" ry="7" />
        <Ellipse cx="110" cy={level} fill="none" opacity=".46" rx="47" ry="7" stroke="#6C2B91" strokeWidth="1" />
        <Path d={`M64 ${level} C82 ${level + 5} 138 ${level + 5} 156 ${level}`} fill="none" opacity=".42" stroke="#31D7E2" strokeLinecap="round" strokeWidth=".65" />
      </G>
    </Svg>
  );
}

export function RelicMutationLiquidArtwork({
  config,
  container,
  kind,
  levelLift = 0,
  phase,
  reduceMotion,
}: RelicMutationArtworkProps & {
  kind: RelicMutationLayerKind;
  levelLift?: number;
}) {
  const targetLevel = config.liquidLevel - Math.max(0, Math.min(18, levelLift));
  const clipId = `mutation-liquid-${container}-${kind}`;
  const depthId = `mutation-depth-${container}-${kind}`;
  const fluidProps = useAnimatedProps(() => {
    const elapsed = mutationElapsedMs(phase.value, reduceMotion);
    if (reduceMotion) {
      const crossfade = mutationSegment(elapsed, 180, 520);
      return {
        height: 330 - targetLevel,
        opacity: kind === 'old' ? 1 - crossfade : crossfade,
        width: 220,
        x: 0,
        y: targetLevel,
      };
    }
    if (kind === 'old') {
      const aspiration = mutationSegment(elapsed, 550, 900);
      const y = targetLevel + (config.heartY - 10 - targetLevel) * aspiration;
      const width = 220 - 188 * aspiration;
      return {
        height: Math.max(12, 330 - y),
        opacity: 1 - aspiration * .34,
        width,
        x: 110 - width / 2,
        y,
      };
    }
    const fill = mutationSegment(elapsed, 1_550, 2_000);
    const restore = mutationSegment(elapsed, 2_300, 2_900);
    const overshoot = Math.sin(mutationSegment(elapsed, 1_550, 1_940) * Math.PI) * 2.5;
    const y = config.contactY - 4 + (targetLevel - config.contactY + 4) * fill - overshoot;
    return {
      height: Math.max(8, 330 - y),
      opacity: mutationSegment(elapsed, 1_480, 1_650) * (1 - restore * .62),
      width: 220,
      x: 0,
      y,
    };
  }, [config.contactY, config.heartY, kind, reduceMotion, targetLevel]);
  const veilProps = useAnimatedProps(() => {
    const elapsed = mutationElapsedMs(phase.value, reduceMotion);
    if (reduceMotion) {
      const crossfade = mutationSegment(elapsed, 180, 520);
      return { opacity: kind === 'old' ? crossfade * .28 : (1 - crossfade) * .52 };
    }
    if (kind === 'old') {
      return { opacity: mutationSegment(elapsed, 550, 900) * .86 };
    }
    return { opacity: .9 * (1 - mutationSegment(elapsed, 1_950, 2_300)) };
  }, [kind, reduceMotion]);
  const surfaceProps = useAnimatedProps(() => {
    const elapsed = mutationElapsedMs(phase.value, reduceMotion);
    if (reduceMotion) {
      const crossfade = mutationSegment(elapsed, 180, 520);
      return {
        cy: targetLevel,
        opacity: kind === 'old' ? 1 - crossfade : crossfade,
        rx: config.liquidSurfaceWidth / 2,
        ry: 7,
      };
    }
    if (kind === 'old') {
      const aspiration = mutationSegment(elapsed, 550, 900);
      return {
        cy: targetLevel + (config.heartY - 10 - targetLevel) * aspiration,
        opacity: 1 - aspiration * .62,
        rx: Math.max(9, config.liquidSurfaceWidth / 2 * (1 - aspiration * .72)),
        ry: Math.max(2.2, 7 - aspiration * 4.2),
      };
    }
    const fill = mutationSegment(elapsed, 1_550, 2_000);
    const restore = mutationSegment(elapsed, 2_300, 2_900);
    const overshoot = Math.sin(mutationSegment(elapsed, 1_550, 1_940) * Math.PI) * 2.5;
    return {
      cy: config.contactY - 4 + (targetLevel - config.contactY + 4) * fill - overshoot,
      opacity: mutationSegment(elapsed, 1_540, 1_760) * (1 - restore * .5),
      rx: config.liquidSurfaceWidth / 2,
      ry: 7,
    };
  }, [config.contactY, config.heartY, config.liquidSurfaceWidth, kind, reduceMotion, targetLevel]);

  return (
    <Svg height="100%" viewBox="0 0 220 330" width="100%">
      <Defs>
        <ClipPath id={clipId}><Path d={config.interiorPath} /></ClipPath>
        <SvgLinearGradient id={depthId} x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor="#35105A" stopOpacity=".92" />
          <Stop offset=".52" stopColor="#1B0B3D" stopOpacity=".96" />
          <Stop offset="1" stopColor="#0D0824" stopOpacity=".98" />
        </SvgLinearGradient>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <AnimatedRect animatedProps={fluidProps} fill={`url(#${depthId})`} />
        <AnimatedRect animatedProps={veilProps} fill="#061018" height="330" width="220" />
        <AnimatedEllipse animatedProps={surfaceProps} fill="#1B0B3D" stroke="#6C2B91" strokeWidth="1.1" />
        <AnimatedEllipse animatedProps={surfaceProps} fill="none" stroke="#31D7E2" strokeDasharray="44 90" strokeWidth=".72" />
      </G>
    </Svg>
  );
}

export function RelicMutationRootsArtwork({
  container,
  kind,
  phase,
  reduceMotion,
}: Omit<RelicMutationArtworkProps, 'config'> & { kind: RelicMutationLayerKind }) {
  const branches = rootBranchesForContainer(container);
  return (
    <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 132 120" width="100%">
      <G fill="none" strokeLinecap="round" strokeLinejoin="round">
        {branches.map((branch, index) => (
          <MutationRootBranch
            branch={branch}
            index={index}
            key={`${kind}-${branch.id}`}
            kind={kind}
            phase={phase}
            reduceMotion={reduceMotion}
          />
        ))}
      </G>
    </Svg>
  );
}

export function RelicCracksArtwork({
  config,
  container,
  phase,
  reduceMotion,
}: RelicMutationArtworkProps) {
  const clipId = `mutation-cracks-${container}`;
  return (
    <Svg height="100%" viewBox="0 0 220 330" width="100%">
      <Defs><ClipPath id={clipId}><Path d={config.interiorPath} /></ClipPath></Defs>
      <G clipPath={`url(#${clipId})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {CRACK_PATHS.map((path, index) => (
          <MutationCrackPath
            index={index}
            key={path}
            path={path}
            phase={phase}
            reduceMotion={reduceMotion}
          />
        ))}
      </G>
    </Svg>
  );
}

export function RelicReconstructionTraceArtwork({
  config,
  container,
  phase,
  reduceMotion,
}: RelicMutationArtworkProps) {
  const clipId = `reconstruction-traces-${container}`;
  return (
    <Svg height="100%" viewBox="0 0 220 330" width="100%">
      <Defs><ClipPath id={clipId}><Path d={config.interiorPath} /></ClipPath></Defs>
      <G clipPath={`url(#${clipId})`} fill="none" strokeLinecap="round">
        {RECONSTRUCTION_PATHS.map((path, index) => (
          <ReconstructionTrace
            index={index}
            key={path}
            path={path}
            phase={phase}
            reduceMotion={reduceMotion}
          />
        ))}
      </G>
    </Svg>
  );
}

export function RelicMutationFragmentsArtwork({
  config,
  phase,
  reduceMotion,
}: Omit<RelicMutationArtworkProps, 'container'>) {
  return (
    <Svg height="100%" viewBox="0 0 220 330" width="100%">
      {MUTATION_FRAGMENTS.map((fragment, index) => (
        <MutationFragment
          config={config}
          fragment={fragment}
          index={index}
          key={`${fragment.angle}-${fragment.distance}`}
          phase={phase}
          reduceMotion={reduceMotion}
        />
      ))}
    </Svg>
  );
}

export function RelicMutationReturnBubblesArtwork({
  config,
  container,
  phase,
  reduceMotion,
}: RelicMutationArtworkProps) {
  const clipId = `mutation-return-bubbles-${container}`;
  return (
    <Svg height="100%" viewBox="0 0 220 330" width="100%">
      <Defs><ClipPath id={clipId}><Path d={config.interiorPath} /></ClipPath></Defs>
      <G clipPath={`url(#${clipId})`}>
        {RETURN_BUBBLES.map((bubble, index) => (
          <MutationReturnBubble
            bubble={bubble}
            config={config}
            index={index}
            key={`${bubble.delay}-${bubble.x}`}
            phase={phase}
            reduceMotion={reduceMotion}
          />
        ))}
      </G>
    </Svg>
  );
}

function MutationRootBranch({
  branch,
  index,
  kind,
  phase,
  reduceMotion,
}: {
  branch: RootBranch;
  index: number;
  kind: RelicMutationLayerKind;
  phase: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const animatedProps = useAnimatedProps(() => {
    const elapsed = mutationElapsedMs(phase.value, reduceMotion);
    if (reduceMotion) {
      const crossfade = mutationSegment(elapsed, 180, 520);
      return {
        opacity: kind === 'old' ? 1 - crossfade : crossfade,
        strokeDashoffset: 0,
      };
    }
    if (kind === 'old') {
      const retreat = mutationSegment(elapsed, 550 + index * 7, 900);
      return { opacity: 1 - retreat * .78, strokeDashoffset: -28 * retreat };
    }
    const grow = mutationSegment(elapsed, 1_900 + index * 10, 2_300);
    const restore = mutationSegment(elapsed, 2_300, 2_900);
    return { opacity: grow * (.88 - restore * .43), strokeDashoffset: 28 * (1 - grow) };
  }, [index, kind, reduceMotion]);
  return (
    <>
      <AnimatedPath
        animatedProps={animatedProps}
        d={branch.path}
        stroke="#8B4F31"
        strokeDasharray="28 28"
        strokeWidth={branch.width * 1.8}
      />
      <AnimatedPath
        animatedProps={animatedProps}
        d={branch.path}
        stroke="#F0AF57"
        strokeDasharray="28 28"
        strokeWidth={branch.width * .8}
      />
    </>
  );
}

function MutationCrackPath({
  index,
  path,
  phase,
  reduceMotion,
}: {
  index: number;
  path: string;
  phase: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const animatedProps = useAnimatedProps(() => {
    if (reduceMotion) return { opacity: 0, strokeDashoffset: 90 };
    const elapsed = mutationElapsedMs(phase.value, false);
    const draw = mutationSegment(elapsed, 850 + index * 17, 1_040);
    const fade = mutationSegment(elapsed, 1_050, 1_145);
    return {
      opacity: draw * (1 - fade),
      strokeDashoffset: 90 * (1 - draw),
    };
  }, [index, reduceMotion]);
  return (
    <>
      <AnimatedPath animatedProps={animatedProps} d={path} stroke="#704083" strokeDasharray="90 90" strokeWidth="2.4" />
      <AnimatedPath animatedProps={animatedProps} d={path} stroke="#D9FDFF" strokeDasharray="90 90" strokeWidth=".82" />
    </>
  );
}

function ReconstructionTrace({
  index,
  path,
  phase,
  reduceMotion,
}: {
  index: number;
  path: string;
  phase: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const animatedProps = useAnimatedProps(() => {
    if (reduceMotion) return { opacity: 0, strokeDashoffset: 120 };
    const elapsed = mutationElapsedMs(phase.value, false);
    const reveal = mutationSegment(elapsed, 1_150 + index * 30, 1_620);
    const fade = mutationSegment(elapsed, 1_560, 1_760);
    return {
      opacity: reveal * (1 - fade) * .72,
      strokeDashoffset: 120 * (1 - reveal),
    };
  }, [index, reduceMotion]);
  return (
    <AnimatedPath
      animatedProps={animatedProps}
      d={path}
      stroke={index % 2 === 0 ? '#31D7E2' : '#C47A43'}
      strokeDasharray="120 120"
      strokeWidth={index === 2 ? 1.2 : .82}
    />
  );
}

function MutationFragment({
  config,
  fragment,
  index,
  phase,
  reduceMotion,
}: {
  config: RelicStageArtworkConfig;
  fragment: (typeof MUTATION_FRAGMENTS)[number];
  index: number;
  phase: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const animatedProps = useAnimatedProps(() => {
    if (reduceMotion) {
      return {
        cx: config.heartX,
        cy: config.heartY,
        opacity: 0,
        r: fragment.radius,
      };
    }
    const elapsed = mutationElapsedMs(phase.value, false);
    const local = mutationSegment(elapsed, 1_055 + index * 8, 1_365);
    const visible = Math.sin(local * Math.PI);
    return {
      cx: config.heartX + Math.cos(fragment.angle) * fragment.distance * local,
      cy: config.heartY + Math.sin(fragment.angle) * fragment.distance * local,
      opacity: visible * .88,
      r: fragment.radius * (1 - local * .34),
    };
  }, [config.heartX, config.heartY, fragment.angle, fragment.distance, fragment.radius, index, reduceMotion]);
  return <AnimatedCircle animatedProps={animatedProps} fill={fragment.color} />;
}

function MutationReturnBubble({
  bubble,
  config,
  index,
  phase,
  reduceMotion,
}: {
  bubble: (typeof RETURN_BUBBLES)[number];
  config: RelicStageArtworkConfig;
  index: number;
  phase: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const animatedProps = useAnimatedProps(() => {
    const start = 1_630 + bubble.delay;
    const elapsed = mutationElapsedMs(phase.value, reduceMotion);
    if (reduceMotion) {
      return { cx: config.heartX + bubble.x, cy: config.heartY - 14, opacity: 0, r: bubble.radius };
    }
    const local = mutationSegment(elapsed, start, 2_080 + index * 35);
    return {
      cx: config.heartX + bubble.x + Math.sin(local * Math.PI) * bubble.drift,
      cy: config.heartY - 10 + (config.liquidLevel - config.heartY + 18) * local,
      opacity: Math.sin(local * Math.PI) * .72,
      r: bubble.radius * (.84 + local * .16),
    };
  }, [bubble.delay, bubble.drift, bubble.radius, bubble.x, config.heartX, config.heartY, config.liquidLevel, index, reduceMotion]);
  return <AnimatedCircle animatedProps={animatedProps} fill="rgba(49,215,226,.12)" stroke="#B9F7FA" strokeWidth=".72" />;
}

export function RelicSupporterArrivalArtwork({
  amount,
  config,
  levelLift,
  phase,
  reduceMotion,
}: {
  amount: number;
  config: RelicStageArtworkConfig;
  levelLift: number;
  phase: SharedValue<number>;
  reduceMotion: boolean;
}) {
  const clipId = `supporter-arrival-${config.stage}`;
  const surfaceY = config.liquidLevel - levelLift;
  const maxRadius = amount >= 6 ? 5.4 : amount >= 2 ? 4.4 : 3.5;
  const dropProps = useAnimatedProps(() => {
    const local = interpolate(phase.value, [.455, .72], [0, 1], Extrapolation.CLAMP);
    const visible = interpolate(phase.value, [.43, .475, .68, .76], [0, 1, .92, 0], Extrapolation.CLAMP);
    const travel = reduceMotion ? 1 : local;
    return {
      cx: config.heartX + Math.sin(travel * Math.PI) * 3,
      cy: reduceMotion
        ? config.heartY - 9
        : surfaceY + 3 + (config.heartY - surfaceY - 12) * travel,
      opacity: visible,
      r: maxRadius * interpolate(local, [0, .42, 1], [.72, 1, .62], Extrapolation.CLAMP),
    };
  }, [config.heartX, config.heartY, maxRadius, reduceMotion, surfaceY]);
  const glowProps = useAnimatedProps(() => {
    const local = interpolate(phase.value, [.455, .72], [0, 1], Extrapolation.CLAMP);
    return {
      cx: config.heartX + Math.sin(local * Math.PI) * 3,
      cy: reduceMotion
        ? config.heartY - 9
        : surfaceY + 3 + (config.heartY - surfaceY - 12) * local,
      opacity: interpolate(phase.value, [.43, .49, .68, .77], [0, .3, .22, 0], Extrapolation.CLAMP),
      r: maxRadius * 2.1,
    };
  }, [config.heartX, config.heartY, maxRadius, reduceMotion, surfaceY]);
  const rippleProps = useAnimatedProps(() => {
    const local = interpolate(phase.value, [.62, .86], [0, 1], Extrapolation.CLAMP);
    return {
      opacity: reduceMotion ? 0 : Math.sin(local * Math.PI) * .78,
      rx: 8 + local * 38,
      ry: 1.5 + local * 4,
    };
  }, [reduceMotion]);

  return (
    <Svg height="100%" viewBox="0 0 220 330" width="100%">
      <Defs>
        <ClipPath id={clipId}>
          <Path d={config.interiorPath} />
          <Rect
            height={config.liquidLevel - surfaceY + 8}
            width={config.liquidSurfaceWidth - 6}
            x={110 - (config.liquidSurfaceWidth - 6) / 2}
            y={surfaceY}
          />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <AnimatedEllipse
          animatedProps={rippleProps}
          cx={110}
          cy={surfaceY + 2}
          fill="none"
          stroke="#63E6EC"
          strokeWidth="1.1"
        />
        <AnimatedCircle animatedProps={glowProps} fill="#31D7E2" />
        <AnimatedCircle animatedProps={dropProps} fill="#FFD36A" stroke="#EAFDFF" strokeWidth=".8" />
      </G>
    </Svg>
  );
}

export function RelicGlassHighlightsArtwork() {
  return (
    <Svg height="100%" viewBox="0 0 132 120" width="100%">
      <Path d="M22 19 C13 40 13 75 25 96 C30 105 36 111 43 116" fill="none" opacity=".38" stroke="#D8FCFF" strokeLinecap="round" strokeWidth="1.2" />
      <Path d="M110 21 C119 45 116 82 105 99 C101 106 96 112 90 116" fill="none" opacity=".28" stroke="#31D7E2" strokeLinecap="round" strokeWidth="1" />
      <Path d="M31 34 C25 54 27 69 33 79" fill="none" opacity=".2" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="2.2" />
      <Path d="M100 42 C105 58 104 70 101 81" fill="none" opacity=".18" stroke="#BDFBFF" strokeLinecap="round" strokeWidth="1.5" />
    </Svg>
  );
}

export function RelicResonanceRingArtwork() {
  return (
    <Svg height="100%" viewBox="0 0 180 180" width="100%">
      <Circle cx="90" cy="90" fill="none" opacity=".74" r="77" stroke="#9B633B" strokeDasharray="2 7" strokeWidth="1" />
      <Circle cx="90" cy="90" fill="none" opacity=".38" r="68" stroke="#D69A61" strokeDasharray="18 8" strokeWidth=".75" />
      <Path d="M90 5 L94 14 L90 18 L86 14 Z M175 90 L166 94 L162 90 L166 86 Z M90 175 L86 166 L90 162 L94 166 Z M5 90 L14 86 L18 90 L14 94 Z" fill="#B97848" opacity=".72" />
    </Svg>
  );
}
