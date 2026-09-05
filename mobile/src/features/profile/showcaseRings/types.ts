import type { ImageSourcePropType } from 'react-native';

export const SHOWCASE_BASE_RING_FAMILIES = [
  'rank',
  'streak',
  'faction',
  'major',
  'seniority',
] as const;

export const SHOWCASE_ACHIEVEMENT_RING_FAMILIES = [
  'ritual',
  'countercurrent',
  'clean_sweep',
  'ascension',
  'duelist',
  'pact',
  'echo',
  'metamorphosis',
] as const;

export const SHOWCASE_RING_FAMILIES = [
  ...SHOWCASE_BASE_RING_FAMILIES,
  ...SHOWCASE_ACHIEVEMENT_RING_FAMILIES,
] as const;

export type ShowcaseRingFamily = (typeof SHOWCASE_RING_FAMILIES)[number];
export type ShowcaseRingStage = 1 | 2 | 3 | 4 | 5;
export type ShowcaseRingAvailability = 'locked' | 'unlocked' | 'equipped';
export type ShowcaseRingStatSource = 'profile' | 'derived' | 'missing';

export type ShowcaseRingAssets = {
  full: ImageSourcePropType;
  thumbnail: ImageSourcePropType;
};

export type ShowcaseRingCondition = {
  label: string;
  threshold: number;
};

export type ShowcaseRingStageDefinition = {
  assets: ShowcaseRingAssets;
  condition: ShowcaseRingCondition;
  name: string;
  stage: ShowcaseRingStage;
};

export type ShowcaseRingFamilyDefinition = {
  accent: string;
  description: string;
  family: ShowcaseRingFamily;
  name: string;
  stages: readonly ShowcaseRingStageDefinition[];
};

export type ShowcaseRingMetric = {
  source: ShowcaseRingStatSource;
  value: number;
};

export type ShowcaseRingStats = Record<ShowcaseRingFamily, ShowcaseRingMetric>;

export type ShowcaseRingProgress = {
  availability: ShowcaseRingAvailability;
  current: ShowcaseRingStageDefinition | null;
  definition: ShowcaseRingFamilyDefinition;
  display: ShowcaseRingStageDefinition;
  family: ShowcaseRingFamily;
  next: ShowcaseRingStageDefinition | null;
  progress: number;
  unlockedStages: number;
  value: number;
};

export type EquippedShowcaseRing = {
  accent: string;
  asset: ImageSourcePropType;
  family: ShowcaseRingFamily;
  familyName: string;
  name: string;
  stage: ShowcaseRingStage;
};
