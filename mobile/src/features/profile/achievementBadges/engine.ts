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
    case 'placement_revealed': return threshold(stats.placementCalls, stats.placementTarget);
    case 'rising_streak': {
      const streak = stats.currentSeasonMaxCorrectStreak
        ?? (currentEvents ? longestCorrectStreak(currentEvents) : undefined);
      return threshold(streak, 5);
    }
    case 'clutch_moment':
      return currentEvents
        ? booleanResult(currentEvents.some((event) => event.correct && event.decidingSeriesTie))
        : unavailable();
    case 'sharp_eye': return threshold(stats.correctOfficialCalls, 25);
    case 'centurion': return threshold(stats.totalOfficialCalls, 100);
    case 'strategist': {
      const total = stats.currentSeasonOfficialCalls;
      const correct = stats.currentSeasonCorrectCalls;
      if (total == null || correct == null) return unavailable();
      if (total < 50) return { dataAvailable: true, progress: progress(total, 50), qualified: false };
      const accuracy = total > 0 ? (correct / total) * 100 : 0;
      return { dataAvailable: true, progress: progress(accuracy, 70), qualified: accuracy >= 70 };
    }
    case 'versatile': return threshold(stats.distinctCompetitionsWithWin, 5);
    case 'regular': return threshold(stats.maxConsecutiveActiveWeeks, 4);
    case 'social_bond': return threshold(stats.collectiveMissionsCompleted, 1);
    case 'rally': return threshold(stats.factionSupportersGained, 10);
    case 'standard_bearer': return threshold(stats.victoriousCollectiveMissions, 10);
    case 'faction_loyal': {
      const active = stats.factionWeeklyContributionStreak;
      const total = stats.factionSeasonWeekCount;
      if (active == null || total == null || stats.factionSeasonClosed == null) return unavailable();
      return {
        dataAvailable: true,
        progress: progress(active, Math.max(1, total)),
        qualified: stats.factionSeasonClosed && total > 0 && active >= total,
      };
    }
    case 'season_elite': return closedSeasonPercentile(stats, 10);
    case 'griff_legend': return closedSeasonPercentile(stats, 1);
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

function closedSeasonPercentile(stats: AchievementStats, target: number): RuleResult {
  const season = stats.closedSeason;
  if (!season || season.percentile == null) return unavailable();
  return {
    dataAvailable: true,
    progress: progress(Math.max(0, 100 - season.percentile), 100 - target),
    qualified: season.closed && season.percentile <= target,
  };
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
  if (id === 'season_elite' || id === 'griff_legend' || id === 'zero_chronicle') {
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
