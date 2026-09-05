import { ACHIEVEMENT_BADGE_CATALOG } from './catalog';
import type {
  AchievementBadgeEvaluation,
  AchievementBadgeUnlockState,
  AchievementCallEvent,
  AchievementEvaluationResult,
  AchievementStats,
  BadgeId,
  BadgeProgress,
} from './types';

type RuleResult = { dataAvailable: boolean; progress?: BadgeProgress; qualified: boolean };

export function evaluateAchievementBadges(
  stats: AchievementStats,
  previousStates: readonly AchievementBadgeUnlockState[],
  options: { now: string },
): AchievementEvaluationResult {
  const previousById = new Map(previousStates.map((state) => [state.id, state]));
  const nextStates = new Map(previousById);
  const newlyUnlocked: AchievementBadgeUnlockState[] = [];

  const badges = ACHIEVEMENT_BADGE_CATALOG.map<AchievementBadgeEvaluation>((definition) => {
    const previous = previousById.get(definition.id);
    const result = evaluateRule(definition.id, stats);
    let unlockState = previous;

    if (!previous && result.qualified) {
      unlockState = {
        id: definition.id,
        seasonId: achievementSeasonId(definition.id, stats),
        unlockedAt: options.now,
      };
      nextStates.set(definition.id, unlockState);
      newlyUnlocked.push(unlockState);
    }

    return {
      dataAvailable: result.dataAvailable || Boolean(previous),
      definition,
      obtained: Boolean(previous || result.qualified),
      progress: result.progress,
      seasonId: unlockState?.seasonId,
      unlockedAt: unlockState?.unlockedAt,
    };
  });

  return { badges, newlyUnlocked, states: Array.from(nextStates.values()) };
}

export function hasResurgenceSequence(events: readonly AchievementCallEvent[], seasonId?: string) {
  const ordered = seasonEvents(events, seasonId);
  let consecutiveLosses = 0;
  let consecutiveWinsAfterDrop = 0;

  for (const event of ordered) {
    if (!event.correct) {
      consecutiveLosses += 1;
      consecutiveWinsAfterDrop = 0;
      continue;
    }
    if (consecutiveLosses >= 3) {
      consecutiveWinsAfterDrop += 1;
      if (consecutiveWinsAfterDrop >= 5) return true;
    } else {
      consecutiveLosses = 0;
    }
  }
  return false;
}

export function longestCorrectStreak(events: readonly AchievementCallEvent[], seasonId?: string) {
  let longest = 0;
  let current = 0;
  for (const event of seasonEvents(events, seasonId)) {
    current = event.correct ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

function evaluateRule(id: BadgeId, stats: AchievementStats): RuleResult {
  const currentEvents = stats.callEvents
    ? seasonEvents(stats.callEvents, stats.currentSeasonId)
    : undefined;

  switch (id) {
    case 'first_signal': return threshold(stats.totalOfficialCalls, 1);
    case 'versatile': return threshold(stats.distinctCompetitionsWithWin, 5);
    case 'perfect_eclipse': return threshold(stats.placementCorrectCalls, stats.placementTarget);
    case 'countercurrent': {
      const eventShare = currentEvents
        ?.filter((event) => event.correct && event.participantPickShare != null)
        .reduce<number | undefined>((lowest, event) => (
          lowest == null ? event.participantPickShare : Math.min(lowest, event.participantPickShare ?? 1)
        ), undefined);
      const share = eventShare ?? stats.lowestWinningPickShare;
      if (share == null) return unavailable();
      return {
        dataAvailable: true,
        progress: progress(Math.max(0, (1 - share) * 100), 90),
        qualified: share <= 0.1,
      };
    }
    case 'resurgence': {
      if (stats.resurgenceAchieved != null) return booleanResult(stats.resurgenceAchieved);
      return currentEvents ? booleanResult(hasResurgenceSequence(currentEvents)) : unavailable();
    }
    case 'synchrony': return threshold(stats.synchronizedFriendCorrectStreak, 3);
    case 'zero_chronicle': {
      const season = stats.closedSeason;
      if (!season || season.activeWeeks == null || season.totalWeeks == null) return unavailable();
      return {
        dataAvailable: true,
        progress: progress(season.activeWeeks, Math.max(1, season.totalWeeks)),
        qualified: season.closed && season.totalWeeks > 0 && season.activeWeeks >= season.totalWeeks,
      };
    }
  }
}

function threshold(value: number | undefined, target: number): RuleResult {
  if (value == null) return unavailable();
  return { dataAvailable: true, progress: progress(value, target), qualified: value >= target };
}

function booleanResult(value: boolean): RuleResult {
  return { dataAvailable: true, progress: { current: value ? 1 : 0, target: 1 }, qualified: value };
}

function unavailable(): RuleResult {
  return { dataAvailable: false, qualified: false };
}

function progress(current: number, target: number): BadgeProgress {
  return {
    current: Math.max(0, Number.isFinite(current) ? current : 0),
    target: Math.max(0, target),
  };
}

function achievementSeasonId(id: BadgeId, stats: AchievementStats) {
  if (id === 'zero_chronicle') {
    return stats.closedSeason?.id;
  }
  return stats.currentSeasonId;
}

function seasonEvents(events: readonly AchievementCallEvent[], seasonId?: string) {
  return events
    .filter((event) => !seasonId || event.seasonId === seasonId)
    .slice()
    .sort((left, right) => left.finalizedAt.localeCompare(right.finalizedAt));
}
