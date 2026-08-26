export const SKIA_MAX_BOILING_BUBBLES = 15;

export function skiaStageProgress(stage: number) {
  'worklet';
  return Math.min(1, Math.max(0, (stage - 1) / 4));
}

export function skiaHeartInstability(
  stage: number,
  instability: number,
  interaction: number,
  mutationSurge: number,
) {
  'worklet';
  const stageProgress = Math.min(1, Math.max(0, (stage - 1) / 4));
  const stageBaseline = .06 + Math.pow(stageProgress, 1.08) * .82;
  return Math.min(1, Math.max(0,
    stageBaseline
      + Math.min(1, Math.max(0, instability)) * (.16 + stageProgress * .12)
      + Math.min(1, Math.max(0, interaction)) * .14
      + Math.min(1, Math.max(0, mutationSurge)) * .18,
  ));
}

export function skiaBoilingBubbleCount(stage: number) {
  'worklet';
  const stageProgress = Math.min(1, Math.max(0, (stage - 1) / 4));
  return 3 + Math.round(stageProgress * 12);
}

export function skiaRamificationLevel(stage: number) {
  'worklet';
  return Math.max(0, Math.min(4, Math.floor(stage - .5)));
}

export function skiaTapHeatEnvelope(phase: number) {
  'worklet';
  const value = Math.min(1, Math.max(0, phase));
  const ignitionValue = Math.min(1, Math.max(0, (value - .035) / .19));
  const coolingValue = Math.min(1, Math.max(0, (value - .38) / .62));
  const ignition = ignitionValue * ignitionValue * (3 - 2 * ignitionValue);
  const cooling = 1 - coolingValue * coolingValue * (3 - 2 * coolingValue);
  return Math.min(1, Math.max(0, ignition * cooling + Math.sin(value * Math.PI) * .16));
}

export function skiaMutationSurge(phase: number) {
  'worklet';
  const value = Math.min(1, Math.max(0, phase));
  const coreProgress = Math.min(1, Math.max(0, (value - .06) / .86));
  const core = Math.sin(coreProgress * Math.PI) * .72;
  const impact = Math.exp(-Math.pow((value - .47) / .105, 2)) * .58;
  return Math.min(1, Math.max(0, core + impact));
}
