import type { CommunityMutationPresentation, RelicContainer } from './types';
import { communityFormForLevel } from './utils';

export const RELIC_TAP_MAX_MS = 180;
export const RELIC_RESONANCE_MIN_MS = 600;
export const MUTATION_DURATION_MS = 2_900;
export const REDUCED_MUTATION_DURATION_MS = 800;

export const MUTATION_CAPTURE_TIMES_MS = [
  0,
  300,
  650,
  900,
  1_100,
  1_400,
  1_800,
  2_150,
  2_450,
  2_900,
] as const;

export type RelicMotionState =
  | 'idle'
  | 'pressing'
  | 'tapReaction'
  | 'charging'
  | 'resonating'
  | 'recovering'
  | 'supporterArrival'
  | 'mutationReady'
  | 'mutating';

export type RelicInstabilityTier =
  | 'calm'
  | 'awakening'
  | 'charged'
  | 'critical'
  | 'mutationReady';

export type RelicInstabilityResolution = {
  ratio: number;
  tier: RelicInstabilityTier;
  localIntensity: number;
};

export type SupporterContributionPresentation = {
  id: string;
  amount: number;
  fromCharge: number;
  toCharge: number;
};

export type SupporterContributionBatch = {
  ids: string[];
  amount: number;
  count: number;
  fromCharge: number;
  toCharge: number;
};

export type RelicContributionBaseline = {
  factionId: string | null;
  charge: number | null;
};

export type RelicContributionObservation = {
  baseline: RelicContributionBaseline;
  contribution: SupporterContributionPresentation | null;
};

export type RelicMotionDiagnostics = {
  state: RelicMotionState;
  tier: RelicInstabilityTier;
  ratio: number;
  pendingAmount: number;
  aggregatedCount: number;
  mutationFromForm: RelicContainer | null;
  mutationToForm: RelicContainer | null;
  mutationElapsedMs: number;
  mutationEventId: string | null;
  mutationEventPresented: boolean;
};

export type RelicMutationTransition = {
  eventId: string;
  fromLevel: number;
  toLevel: number;
  fromContainer: RelicContainer;
  toContainer: RelicContainer;
  fromName: string;
  toName: string;
  durationMs: number;
  reducedMotion: boolean;
};

export type RelicMutationTimers = {
  impact: ReturnType<typeof setTimeout> | null;
  finish: ReturnType<typeof setTimeout> | null;
};

export type RelicMutationTimelineStage =
  | 'dimming'
  | 'heartAcceleration'
  | 'liquidAspiration'
  | 'cracking'
  | 'implosion'
  | 'reconstruction'
  | 'liquidReturn'
  | 'rootsDeployment'
  | 'nameReveal'
  | 'restoring'
  | 'complete';

export type RelicGestureResolution = Extract<
  RelicMotionState,
  'tapReaction' | 'resonating' | 'recovering'
>;

export type RelicMotionPreview = 'tapPeak' | 'resonancePeak' | 'supporterPeak';

export type RelicMotionCommandKind =
  | 'idle'
  | 'tap'
  | 'cancelledCharge'
  | 'resonance';

export type RelicMotionCommand = {
  id: number;
  kind: RelicMotionCommandKind;
};

export function resolveRelicGesture(
  elapsedMs: number,
  alreadyResolved = false,
): RelicGestureResolution | null {
  if (alreadyResolved) return null;

  const safeElapsed = Math.max(0, elapsedMs);
  if (safeElapsed < RELIC_TAP_MAX_MS) return 'tapReaction';
  if (safeElapsed < RELIC_RESONANCE_MIN_MS) return 'recovering';
  return 'resonating';
}

export function resolveRelicInstability(
  charge: number,
  objective: number,
): RelicInstabilityResolution {
  const safeCharge = Number.isFinite(charge) ? charge : 0;
  const safeObjective = Number.isFinite(objective) ? objective : 0;
  const ratio = safeObjective > 0
    ? clamp(safeCharge / safeObjective, 0, 1)
    : 0;

  if (ratio >= 1) {
    return { ratio, tier: 'mutationReady', localIntensity: 1 };
  }
  if (ratio >= .9) {
    return {
      ratio,
      tier: 'critical',
      localIntensity: localIntensity(ratio, .9, 1),
    };
  }
  if (ratio >= .75) {
    return {
      ratio,
      tier: 'charged',
      localIntensity: localIntensity(ratio, .75, .9),
    };
  }
  if (ratio >= .5) {
    return {
      ratio,
      tier: 'awakening',
      localIntensity: localIntensity(ratio, .5, .75),
    };
  }
  return {
    ratio,
    tier: 'calm',
    localIntensity: localIntensity(ratio, 0, .5),
  };
}

export function observeSupporterCharge(
  baseline: RelicContributionBaseline,
  factionId: string | null,
  charge: number,
): RelicContributionObservation {
  const safeCharge = Math.max(0, Math.floor(Number(charge) || 0));
  const nextBaseline = { factionId, charge: safeCharge };
  if (!factionId || baseline.factionId !== factionId || baseline.charge === null) {
    return { baseline: nextBaseline, contribution: null };
  }
  if (safeCharge <= baseline.charge) {
    return { baseline: nextBaseline, contribution: null };
  }

  return {
    baseline: nextBaseline,
    contribution: {
      id: `charge:${factionId}:${baseline.charge}:${safeCharge}`,
      amount: safeCharge - baseline.charge,
      fromCharge: baseline.charge,
      toCharge: safeCharge,
    },
  };
}

export function aggregateSupporterContributions(
  current: SupporterContributionBatch | null,
  contribution: SupporterContributionPresentation,
): SupporterContributionBatch {
  const normalizedAmount = Math.max(
    1,
    Math.floor(Number(contribution.amount) || 0),
    Math.floor(Number(contribution.toCharge) || 0) - Math.floor(Number(contribution.fromCharge) || 0),
  );
  if (!current) {
    return {
      ids: [contribution.id],
      amount: normalizedAmount,
      count: 1,
      fromCharge: contribution.fromCharge,
      toCharge: contribution.toCharge,
    };
  }
  if (current.ids.includes(contribution.id)) return current;
  return {
    ids: [...current.ids, contribution.id],
    amount: current.amount + normalizedAmount,
    count: current.count + 1,
    fromCharge: Math.min(current.fromCharge, contribution.fromCharge),
    toCharge: Math.max(current.toCharge, contribution.toCharge),
  };
}

export function shouldQueueSupporterContribution(
  state: RelicMotionState,
  mutationActive = false,
) {
  return mutationActive
    || state === 'mutating'
    || state === 'pressing'
    || state === 'tapReaction'
    || state === 'charging'
    || state === 'resonating'
    || state === 'recovering'
    || state === 'supporterArrival'
    || state === 'mutationReady';
}

export function mutationSegment(
  elapsedMs: number,
  startMs: number,
  endMs: number,
): number {
  'worklet';

  return Math.min(
    1,
    Math.max(0, (elapsedMs - startMs) / Math.max(.000_001, endMs - startMs)),
  );
}

export function resolveRelicMutationTransition(
  mutation: CommunityMutationPresentation,
  reducedMotion = false,
): RelicMutationTransition | null {
  const fromLevel = clamp(Math.floor(Number(mutation.from_level) || 0), 1, 5);
  const toLevel = clamp(Math.floor(Number(mutation.to_level) || 0), 2, 6);
  if (!mutation.id || toLevel <= fromLevel) return null;

  const fromForm = communityFormForLevel(fromLevel);
  const toForm = communityFormForLevel(toLevel);
  return {
    eventId: mutation.id,
    fromLevel,
    toLevel,
    fromContainer: fromForm.container,
    toContainer: toForm.container,
    fromName: fromForm.name,
    toName: toForm.name,
    durationMs: reducedMotion ? REDUCED_MUTATION_DURATION_MS : MUTATION_DURATION_MS,
    reducedMotion,
  };
}

export function shouldStartRelicMutation(
  mutation: CommunityMutationPresentation | null | undefined,
  activeEventId: string | null,
  presentedEventIds: ReadonlySet<string>,
) {
  if (!mutation || !mutation.id || activeEventId) return false;
  if (presentedEventIds.has(mutation.id)) return false;
  return resolveRelicMutationTransition(mutation) !== null;
}

export function relicMutationTimelineStage(
  elapsedMs: number,
  reducedMotion = false,
): RelicMutationTimelineStage {
  const duration = reducedMotion ? REDUCED_MUTATION_DURATION_MS : MUTATION_DURATION_MS;
  const elapsed = clamp(elapsedMs, 0, duration);
  if (elapsed >= duration) return 'complete';
  if (reducedMotion) {
    if (elapsed < 180) return 'dimming';
    if (elapsed < 520) return 'reconstruction';
    if (elapsed < 680) return 'nameReveal';
    return 'restoring';
  }
  if (elapsed < 300) return 'dimming';
  if (elapsed < 550) return 'heartAcceleration';
  if (elapsed < 850) return 'liquidAspiration';
  if (elapsed < 1_050) return 'cracking';
  if (elapsed < 1_150) return 'implosion';
  if (elapsed < 1_550) return 'reconstruction';
  if (elapsed < 1_900) return 'liquidReturn';
  if (elapsed < 2_200) return 'rootsDeployment';
  if (elapsed < 2_600) return 'nameReveal';
  return 'restoring';
}

export function mutationElapsedMs(phase: number, reducedMotion = false) {
  const duration = reducedMotion ? REDUCED_MUTATION_DURATION_MS : MUTATION_DURATION_MS;
  return clamp(phase, 0, 1) * duration;
}

export function clearRelicMutationTimerHandles(timers: RelicMutationTimers) {
  if (timers.impact) clearTimeout(timers.impact);
  if (timers.finish) clearTimeout(timers.finish);
  timers.impact = null;
  timers.finish = null;
}

export function shouldEnterMutationReady(
  tier: RelicInstabilityTier,
  presentationKey: string,
  lastPresentedKey: string | null,
) {
  return tier === 'mutationReady' && presentationKey !== lastPresentedKey;
}

function localIntensity(value: number, start: number, end: number) {
  return clamp((value - start) / Math.max(.000_001, end - start), 0, 1);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
