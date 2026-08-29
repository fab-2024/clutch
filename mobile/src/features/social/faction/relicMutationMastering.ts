import type { CommunityMutationPresentation } from './types';
import { communityFormForLevel } from './utils';

export const RELIC_MUTATION_SKIP_UNLOCK_MS = 420;
export const REDUCED_RELIC_MUTATION_SKIP_UNLOCK_MS = 180;
export const RELIC_MUTATION_CONCLUSION_START_MS = 2_180;
export const REDUCED_RELIC_MUTATION_CONCLUSION_START_MS = 500;
export const RELIC_MUTATION_SKIP_SETTLE_MS = 620;
export const REDUCED_RELIC_MUTATION_SKIP_SETTLE_MS = 280;

/** The product scene owns a single permanent driver; every visual derives from it. */
export const RELIC_CONTINUOUS_SCENES = ['idle'] as const;
export type RelicContinuousScene = (typeof RELIC_CONTINUOUS_SCENES)[number];

export type RelicMutationNarrativePhase =
  | 'tension'
  | 'rupture'
  | 'reconstruction'
  | 'conclusion';

export type RelicMutationSignature = {
  accent: string;
  eyebrow: string;
  wash: string;
};

export type RelicMutationConclusion = {
  accessibilityLabel: string;
  formCode: string;
  formName: string;
  nextObjective: string;
  rewardLabel: string;
  rewardValue: string;
  signature: RelicMutationSignature;
};

type RelicMutationMasteringTimeline = {
  conclusionStartMs: number;
  reconstruction: readonly [number, number, number, number];
  rupture: readonly [number, number, number, number];
  skipSettleMs: number;
  skipUnlockMs: number;
  tension: readonly [number, number, number, number];
};

const STANDARD_TIMELINE: RelicMutationMasteringTimeline = {
  conclusionStartMs: RELIC_MUTATION_CONCLUSION_START_MS,
  reconstruction: [1_210, 1_400, 2_020, 2_180],
  rupture: [820, 940, 1_150, 1_320],
  skipSettleMs: RELIC_MUTATION_SKIP_SETTLE_MS,
  skipUnlockMs: RELIC_MUTATION_SKIP_UNLOCK_MS,
  tension: [120, 260, 760, 940],
};

const REDUCED_TIMELINE: RelicMutationMasteringTimeline = {
  conclusionStartMs: REDUCED_RELIC_MUTATION_CONCLUSION_START_MS,
  reconstruction: [170, 250, 430, 520],
  rupture: [0, 1, 0, 1],
  skipSettleMs: REDUCED_RELIC_MUTATION_SKIP_SETTLE_MS,
  skipUnlockMs: REDUCED_RELIC_MUTATION_SKIP_UNLOCK_MS,
  tension: [0, 70, 110, 180],
};

const SIGNATURES: Record<number, RelicMutationSignature> = {
  2: { accent: '#62E6EF', eyebrow: 'PREMIER SIGNAL', wash: 'rgba(98,230,239,.11)' },
  3: { accent: '#A6D6D0', eyebrow: 'RÉSEAU VIVANT', wash: 'rgba(166,214,208,.1)' },
  4: { accent: '#F0A34A', eyebrow: 'PRESSION COLLECTIVE', wash: 'rgba(240,163,74,.11)' },
  5: { accent: '#D99152', eyebrow: 'ARMATURE SCELLÉE', wash: 'rgba(217,145,82,.12)' },
  6: { accent: '#E8FF3D', eyebrow: 'ÉVEIL COLLECTIF', wash: 'rgba(232,255,61,.1)' },
};

const DEFAULT_SIGNATURE = SIGNATURES[2];

export function relicMutationMasteringTimeline(reduceMotion: boolean) {
  return reduceMotion ? REDUCED_TIMELINE : STANDARD_TIMELINE;
}

export function relicMutationNarrativePhase(
  elapsedMs: number,
  reduceMotion = false,
): RelicMutationNarrativePhase {
  const elapsed = Math.max(0, elapsedMs);
  if (reduceMotion) {
    if (elapsed < 180) return 'tension';
    if (elapsed < REDUCED_RELIC_MUTATION_CONCLUSION_START_MS) return 'reconstruction';
    return 'conclusion';
  }
  if (elapsed < 850) return 'tension';
  if (elapsed < 1_300) return 'rupture';
  if (elapsed < RELIC_MUTATION_CONCLUSION_START_MS) return 'reconstruction';
  return 'conclusion';
}

export function resolveRelicMutationConclusion(
  mutation: CommunityMutationPresentation,
): RelicMutationConclusion {
  const target = communityFormForLevel(mutation.to_level);
  const next = target.level < 6 ? communityFormForLevel(target.level + 1) : null;
  const reward = Math.max(0, Math.floor(Number(mutation.reward) || 0));
  const rewardValue = reward > 0 ? `+${formatNumber(reward)} VOLTS` : 'PALIER VALIDÉ';
  const rewardLabel = reward > 0 ? 'RÉCOMPENSE COLLECTIVE' : 'PROGRESSION COLLECTIVE';
  const nextObjective = next
    ? `${next.name.toUpperCase()} · ${formatNumber(next.threshold)} SUPPORTERS`
    : 'FORME TERMINALE ATTEINTE';
  const rewardAnnouncement = reward > 0
    ? `Récompense collective : plus ${formatNumber(reward)} Volts.`
    : 'Palier collectif validé.';
  const nextAnnouncement = next
    ? `Prochain objectif : ${next.name}, à ${formatNumber(next.threshold)} supporters.`
    : 'La forme terminale est atteinte.';

  return {
    accessibilityLabel: `Mutation accomplie. Palier ${target.code}, ${target.name}. ${rewardAnnouncement} ${nextAnnouncement}`,
    formCode: target.code,
    formName: target.name.toUpperCase(),
    nextObjective,
    rewardLabel,
    rewardValue,
    signature: SIGNATURES[target.level] ?? DEFAULT_SIGNATURE,
  };
}

export function shouldRunRelicScene(
  routeFocused: boolean,
  appActive: boolean,
  sceneVisible: boolean,
) {
  return routeFocused && appActive && sceneVisible;
}

export function resolveRelicContinuousScene(
  routeActive: boolean,
  mutationActive: boolean,
  reduceMotion: boolean,
): RelicContinuousScene | null {
  if (!routeActive || mutationActive || reduceMotion) return null;
  return 'idle';
}

export function relicSceneVisibleAtOffset(scrollOffset: number, heroHeight: number) {
  const safeOffset = Math.max(0, Number(scrollOffset) || 0);
  const safeHeight = Math.max(0, Number(heroHeight) || 0);
  return safeOffset <= safeHeight + 24;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}
