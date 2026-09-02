export const RELIC_MUTATION_DURATION_MS = 4_000;
export const RELIC_MUTATION_RUPTURE_MS = 2_200;
export const RELIC_MUTATION_RELEASE_MS = RELIC_MUTATION_DURATION_MS - RELIC_MUTATION_RUPTURE_MS;

export const RELIC_MUTATION_PHASES = {
  overheatEnd: .2,
  boilEnd: .425,
  cracksStart: .425,
  rupture: .55,
  projectionEnd: .8,
  materializationStart: .8,
} as const;

export const RELIC_MUTATION_RUPTURE_PROGRESS = RELIC_MUTATION_PHASES.rupture;

function clamp01(value: number) {
  'worklet';
  return Math.min(1, Math.max(0, value));
}

function smoothstep(edge0: number, edge1: number, value: number) {
  'worklet';
  const normalized = clamp01((value - edge0) / Math.max(.000_1, edge1 - edge0));
  return normalized * normalized * (3 - 2 * normalized);
}

export function relicMutationCharge(progress: number) {
  'worklet';
  return clamp01(progress / RELIC_MUTATION_RUPTURE_PROGRESS);
}

export function relicMutationOverheatEnergy(progress: number) {
  'worklet';
  const ignition = smoothstep(.015, .19, progress);
  const pressure = .58 + smoothstep(.16, .535, progress) * .42;
  const acceleratingPulse = Math.pow(
    Math.sin((progress * 5.2 + progress * progress * 7.8) * Math.PI),
    2,
  );
  const pulse = .76 + acceleratingPulse * .24;
  const release = 1 - smoothstep(RELIC_MUTATION_RUPTURE_PROGRESS, .625, progress);
  return clamp01(ignition * pressure * pulse * release);
}

export function relicMutationHeartScale(progress: number) {
  'worklet';
  const energy = relicMutationOverheatEnergy(progress);
  const pulse = Math.pow(
    Math.sin((progress * 4.8 + progress * progress * 8.5) * Math.PI),
    2,
  );
  return 1 + energy * (.014 + pulse * .038);
}

export function relicMutationBoilEnergy(progress: number) {
  'worklet';
  const attack = smoothstep(.18, .255, progress);
  const pressure = .82 + smoothstep(.255, .525, progress) * .18;
  const irregularity = .94
    + Math.pow(Math.sin((progress * 8.1 + .17) * Math.PI), 2) * .06;
  const release = 1 - smoothstep(RELIC_MUTATION_RUPTURE_PROGRESS, .64, progress);
  return clamp01(attack * pressure * irregularity * release);
}

export function relicMutationCrackProgress(progress: number, index: number) {
  'worklet';
  const start = RELIC_MUTATION_PHASES.cracksStart + index * .0065;
  return smoothstep(start, RELIC_MUTATION_RUPTURE_PROGRESS, progress);
}

export function relicMutationCrackOpacity(progress: number, index: number) {
  'worklet';
  const drawn = relicMutationCrackProgress(progress, index);
  const release = 1 - smoothstep(RELIC_MUTATION_RUPTURE_PROGRESS, .625, progress);
  return drawn * release;
}

export function relicMutationOldVesselOpacity(progress: number) {
  'worklet';
  if (progress <= RELIC_MUTATION_RUPTURE_PROGRESS) return 1;
  const opacity = 1 - smoothstep(RELIC_MUTATION_RUPTURE_PROGRESS, .655, progress);
  return opacity < .000_1 ? 0 : opacity;
}

export function relicMutationFlashOpacity(progress: number) {
  'worklet';
  const attack = smoothstep(.538, .555, progress);
  const release = 1 - smoothstep(.568, .625, progress);
  return attack * release * .94;
}

export function relicMutationShockwavePhase(progress: number) {
  'worklet';
  return smoothstep(RELIC_MUTATION_RUPTURE_PROGRESS, .72, progress);
}

export function relicMutationShockwaveOpacity(progress: number) {
  'worklet';
  const phase = relicMutationShockwavePhase(progress);
  return Math.sin(phase * Math.PI) * .66;
}

export function relicMutationBurstPhase(progress: number, delay = 0) {
  'worklet';
  const start = RELIC_MUTATION_RUPTURE_PROGRESS + delay;
  return smoothstep(start, RELIC_MUTATION_PHASES.projectionEnd, progress);
}

export function relicMutationShardOpacity(progress: number, delay = 0) {
  'worklet';
  const start = RELIC_MUTATION_RUPTURE_PROGRESS + delay;
  const appear = smoothstep(start, start + .022, progress);
  const release = 1 - smoothstep(.69 + delay * .3, .81, progress);
  return appear * release;
}

export function relicMutationShardGlintOpacity(progress: number, delay = 0) {
  'worklet';
  const phase = relicMutationBurstPhase(progress, delay);
  return relicMutationShardOpacity(progress, delay)
    * Math.sin(clamp01(phase * 1.65) * Math.PI)
    * .78;
}

export function relicMutationSplashDryProgress(progress: number, delay = 0) {
  'worklet';
  return smoothstep(.7 + delay * .45, .875 + delay * .18, progress);
}

export function relicMutationSplashFillOpacity(progress: number, delay = 0) {
  'worklet';
  const start = .56 + delay;
  const appear = smoothstep(start, start + .052, progress);
  const dry = 1 - smoothstep(.69 + delay * .4, .805 + delay * .2, progress);
  return appear * dry * .68;
}

export function relicMutationSplashEdgeOpacity(progress: number, delay = 0) {
  'worklet';
  const start = .56 + delay;
  const appear = smoothstep(start, start + .045, progress);
  const dry = 1 - relicMutationSplashDryProgress(progress, delay);
  return appear * dry * .58;
}

export function relicMutationSplashSheenOpacity(progress: number, delay = 0) {
  'worklet';
  const start = .575 + delay;
  const appear = smoothstep(start, start + .035, progress);
  const fade = 1 - smoothstep(.66 + delay * .35, .755 + delay * .2, progress);
  return appear * fade * .46;
}

export function relicMutationMaterialization(progress: number) {
  'worklet';
  return smoothstep(RELIC_MUTATION_PHASES.materializationStart, 1, progress);
}
