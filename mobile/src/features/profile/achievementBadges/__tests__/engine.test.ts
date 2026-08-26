import { describe, expect, it } from '@jest/globals';

import { evaluateAchievementBadges, hasResurgenceSequence } from '../engine';
import type {
  AchievementBadgeUnlockState,
  AchievementCallEvent,
  AchievementStats,
  BadgeId,
} from '../types';

const NOW = '2026-08-26T15:00:00.000Z';

describe('achievement badge engine', () => {
  it('evaluates simple thresholds without using shop or currency state', () => {
    const result = evaluate({
      correctOfficialCalls: 25,
      placementCalls: 5,
      placementTarget: 5,
      totalOfficialCalls: 100,
    });

    expect(badge(result, 'first_signal').obtained).toBe(true);
    expect(badge(result, 'placement_revealed').obtained).toBe(true);
    expect(badge(result, 'sharp_eye').obtained).toBe(true);
    expect(badge(result, 'centurion').obtained).toBe(true);
  });

  it('requires five correct calls in the same season', () => {
    const splitAcrossSeasons = [
      ...events('saison-a', [true, true, true]),
      ...events('saison-b', [true, true]),
    ];
    const splitResult = evaluate({
      callEvents: splitAcrossSeasons,
      currentSeasonId: 'saison-b',
      placementTarget: 5,
    });
    expect(badge(splitResult, 'rising_streak').obtained).toBe(false);

    const sameSeasonResult = evaluate({
      callEvents: events('saison-b', [false, true, true, true, true, true]),
      currentSeasonId: 'saison-b',
      placementTarget: 5,
    });
    expect(badge(sameSeasonResult, 'rising_streak').obtained).toBe(true);
  });

  it('preserves the first attribution date and never unlocks the same badge twice', () => {
    const previous: AchievementBadgeUnlockState[] = [{
      id: 'sharp_eye',
      seasonId: 'saison-a',
      unlockedAt: '2026-06-02T10:00:00.000Z',
    }];
    const result = evaluateAchievementBadges(
      { correctOfficialCalls: 0, placementTarget: 5 },
      previous,
      { now: NOW },
    );

    expect(result.newlyUnlocked).toEqual([]);
    expect(result.states).toEqual(previous);
    expect(badge(result, 'sharp_eye')).toMatchObject({
      obtained: true,
      seasonId: 'saison-a',
      unlockedAt: '2026-06-02T10:00:00.000Z',
    });
  });

  it('attributes Elite and Legend only after official season closure', () => {
    const open = evaluate({
      closedSeason: { closed: false, id: 'saison-a', percentile: 0.8 },
      placementTarget: 5,
    });
    expect(badge(open, 'season_elite').obtained).toBe(false);
    expect(badge(open, 'griff_legend').obtained).toBe(false);

    const closed = evaluate({
      closedSeason: { closed: true, id: 'saison-a', percentile: 0.8 },
      placementTarget: 5,
    });
    expect(badge(closed, 'season_elite').obtained).toBe(true);
    expect(badge(closed, 'griff_legend').obtained).toBe(true);
  });

  it('evaluates all five mystery conditions', () => {
    const result = evaluate({
      callEvents: events('saison-a', [false, false, false, true, true, true, true, true], {
        participantPickShare: 0.08,
      }),
      closedSeason: {
        activeWeeks: 12,
        closed: true,
        id: 'saison-a',
        totalWeeks: 12,
      },
      currentSeasonId: 'saison-a',
      placementCorrectCalls: 5,
      placementTarget: 5,
      synchronizedFriendCorrectStreak: 3,
    });

    expect(secretStates(result)).toEqual({
      countercurrent: true,
      perfect_eclipse: true,
      resurgence: true,
      synchrony: true,
      zero_chronicle: true,
    });
  });

  it('does not treat a win streak before three failures as a resurgence', () => {
    expect(hasResurgenceSequence(events('saison-a', [true, true, true, true, true, false, false]))).toBe(false);
    expect(hasResurgenceSequence(events('saison-a', [false, false, false, true, true, true, true, true]))).toBe(true);
  });
});

function evaluate(stats: AchievementStats) {
  return evaluateAchievementBadges(stats, [], { now: NOW });
}

function badge(result: ReturnType<typeof evaluateAchievementBadges>, id: BadgeId) {
  const found = result.badges.find((candidate) => candidate.definition.id === id);
  if (!found) throw new Error(`Badge ${id} absent du catalogue.`);
  return found;
}

function secretStates(result: ReturnType<typeof evaluateAchievementBadges>) {
  return Object.fromEntries(result.badges
    .filter(({ definition }) => definition.isSecret)
    .map(({ definition, obtained }) => [definition.id, obtained]));
}

function events(
  seasonId: string,
  outcomes: readonly boolean[],
  extras: Partial<AchievementCallEvent> = {},
): AchievementCallEvent[] {
  return outcomes.map((correct, index) => ({
    correct,
    finalizedAt: `2026-08-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
    id: `${seasonId}-${index}`,
    seasonId,
    ...extras,
  }));
}
