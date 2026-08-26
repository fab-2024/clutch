import { adaptAchievementStats, extractAchievementUnlockStates } from './achievementBadges/adapter';
import { evaluateAchievementBadges } from './achievementBadges/engine';
import { projectPublicBadgeCollection } from './achievementBadges/publicView';
import type { AchievementBadgeUnlockState, BadgeRarity } from './achievementBadges/types';
import type { ProfileBadge, ProfileRanking } from './types';

const RARITY_ORDER: Record<BadgeRarity, number> = {
  legendary: 0,
  secret: 1,
  epic: 2,
  rare: 3,
  common: 4,
};

type EvaluateProfileBadgesInput = {
  now: string;
  previousStates?: readonly AchievementBadgeUnlockState[];
  ranking: ProfileRanking;
  recap: Record<string, unknown>;
};

export function evaluateBadges({
  now,
  previousStates,
  ranking,
  recap,
}: EvaluateProfileBadgesInput): ProfileBadge[] {
  const evaluation = evaluateAchievementBadges(
    adaptAchievementStats(recap, ranking),
    previousStates ?? extractAchievementUnlockStates(recap),
    { now },
  );
  return projectPublicBadgeCollection(evaluation.badges);
}

export function resolveBadgeSelection(
  keys: readonly string[],
  badges: readonly ProfileBadge[],
  limit: number,
  fill = false,
) {
  const obtained = badges
    .filter((badge) => badge.obtained)
    .sort((left, right) => (
      RARITY_ORDER[left.rarity] - RARITY_ORDER[right.rarity]
      || left.name.localeCompare(right.name, 'fr')
    ));
  const byKey = new Map<string, ProfileBadge>(obtained.map((badge) => [badge.key, badge]));
  const selected: ProfileBadge[] = [];

  for (const key of keys.filter(Boolean)) {
    const badge = byKey.get(key);
    if (badge && !selected.some((item) => item.key === badge.key)) selected.push(badge);
    if (selected.length >= limit) break;
  }

  if (fill) {
    for (const badge of obtained) {
      if (selected.length >= limit) break;
      if (!selected.some((item) => item.key === badge.key)) selected.push(badge);
    }
  }
  return selected;
}
