import type { RelicContainer } from './types';

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

export type RelicDiagnostics = {
  tier: RelicInstabilityTier;
  ratio: number;
  mutationFromForm: RelicContainer | null;
  mutationToForm: RelicContainer | null;
  mutationEventId: string | null;
  mutationEventPresented: boolean;
};

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

function localIntensity(value: number, start: number, end: number) {
  return clamp((value - start) / Math.max(.000_001, end - start), 0, 1);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
