export const BADGE_IDS = [
  'first_signal', 'placement_revealed', 'rising_streak', 'clutch_moment', 'sharp_eye',
  'centurion', 'strategist', 'versatile', 'regular', 'social_bond', 'rally',
  'standard_bearer', 'faction_loyal', 'season_elite', 'griff_legend', 'perfect_eclipse',
  'countercurrent', 'resurgence', 'synchrony', 'zero_chronicle',
] as const;

export type BadgeId = (typeof BADGE_IDS)[number];
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'secret';
export type AchievementBadgeCategory = 'calls' | 'social' | 'faction' | 'season' | 'secret';

export type BadgeVisualFamily =
  | 'circular-target-cyan' | 'circular-target-silver' | 'chevron-shield-volt'
  | 'split-diamond-amber' | 'mechanism-cyan' | 'chevron-shield-silver'
  | 'compass-sapphire' | 'compass-five' | 'segmented-mechanism'
  | 'linked-nodes-amber' | 'linked-nodes-volt' | 'standard-bronze'
  | 'reinforced-bronze' | 'crystal-hourglass' | 'legend-medallion'
  | 'sealed-eclipse' | 'revealed-eclipse' | 'sealed-countercurrent'
  | 'revealed-countercurrent' | 'sealed-resurgence' | 'revealed-resurgence'
  | 'sealed-synchrony' | 'revealed-synchrony' | 'sealed-chronicle'
  | 'revealed-chronicle';

export type AchievementBadgeDefinition = {
  id: BadgeId;
  name: string;
  description: string;
  condition: string;
  category: AchievementBadgeCategory;
  rarity: BadgeRarity;
  visualFamily: BadgeVisualFamily;
  accent: string;
  isSecret: boolean;
  clue?: string;
  sealedVisualFamily?: BadgeVisualFamily;
};

export type BadgeProgress = { current: number; target: number };

export type AchievementBadgeUnlockState = {
  id: BadgeId;
  seasonId?: string;
  unlockedAt?: string;
};

export type AchievementBadge = {
  id: BadgeId;
  key: BadgeId;
  name: string;
  description: string;
  condition: string;
  category: AchievementBadgeCategory;
  family: string;
  rarity: BadgeRarity;
  visualFamily: BadgeVisualFamily;
  accent: string;
  isSecret: boolean;
  clue?: string;
  obtained: boolean;
  locked: boolean;
  dataAvailable: boolean;
  unlockedAt?: string;
  seasonId?: string;
  progress?: BadgeProgress;
};

export type LockedSecretBadgeView = {
  id: BadgeId;
  key: BadgeId;
  name: 'Badge mystère';
  category: 'secret';
  family: 'Mystère';
  rarity: 'secret';
  visualFamily: BadgeVisualFamily;
  accent: string;
  isSecret: true;
  clue: string;
  obtained: false;
  locked: true;
  dataAvailable: boolean;
  description?: never;
  condition?: never;
  progress?: never;
  unlockedAt?: never;
  seasonId?: never;
};

export type PublicAchievementBadge = AchievementBadge | LockedSecretBadgeView;

export type AchievementCallEvent = {
  id: string;
  finalizedAt: string;
  seasonId: string;
  correct: boolean;
  placement?: boolean;
  decidingSeriesTie?: boolean;
  participantPickShare?: number;
};

export type ClosedSeasonAchievementStats = {
  id: string;
  activeWeeks?: number;
  closed: boolean;
  percentile?: number;
  totalWeeks?: number;
};

export type AchievementStats = {
  callEvents?: readonly AchievementCallEvent[];
  closedSeason?: ClosedSeasonAchievementStats;
  collectiveMissionsCompleted?: number;
  correctOfficialCalls?: number;
  currentSeasonCorrectCalls?: number;
  currentSeasonId?: string;
  currentSeasonMaxCorrectStreak?: number;
  currentSeasonOfficialCalls?: number;
  distinctCompetitionsWithWin?: number;
  factionSeasonClosed?: boolean;
  factionSeasonWeekCount?: number;
  factionSupportersGained?: number;
  factionWeeklyContributionStreak?: number;
  lowestWinningPickShare?: number;
  maxConsecutiveActiveWeeks?: number;
  placementCalls?: number;
  placementCorrectCalls?: number;
  placementTarget: number;
  resurgenceAchieved?: boolean;
  synchronizedFriendCorrectStreak?: number;
  totalOfficialCalls?: number;
  victoriousCollectiveMissions?: number;
};

export type AchievementBadgeEvaluation = {
  dataAvailable: boolean;
  definition: AchievementBadgeDefinition;
  obtained: boolean;
  progress?: BadgeProgress;
  seasonId?: string;
  unlockedAt?: string;
};

export type AchievementEvaluationResult = {
  badges: AchievementBadgeEvaluation[];
  newlyUnlocked: AchievementBadgeUnlockState[];
  states: AchievementBadgeUnlockState[];
};
