import { describe, expect, it } from '@jest/globals';

import type { ProfileData } from '../../types';
import { SHOWCASE_RING_CATALOG } from '../catalog';
import {
  adaptShowcaseRingStats,
  resolveAllShowcaseRings,
  resolveEquippedShowcaseRing,
  resolveShowcaseRingProgress,
} from '../progression';
import {
  SHOWCASE_RING_FAMILIES,
  type ShowcaseRingFamily,
  type ShowcaseRingStats,
} from '../types';

const STAGE_VALUES: Record<ShowcaseRingFamily, readonly number[]> = {
  rank: [0, 2, 3, 4, 5],
  streak: [1, 3, 7, 14, 30],
  faction: [1, 25, 100, 350, 1000],
  major: [1, 2, 3, 5, 8],
  seniority: [1, 2, 4, 8, 12],
};

describe('showcase ring progression', () => {
  it('defines five cumulative stages and two static assets for every family', () => {
    expect(SHOWCASE_RING_FAMILIES).toHaveLength(5);
    SHOWCASE_RING_FAMILIES.forEach((family) => {
      const stages = SHOWCASE_RING_CATALOG[family].stages;
      expect(stages).toHaveLength(5);
      expect(stages.map(({ condition }) => condition.threshold)).toEqual(STAGE_VALUES[family]);
      stages.forEach((stage, index) => {
        expect(stage.stage).toBe(index + 1);
        expect(stage.assets.full).toBeTruthy();
        expect(stage.assets.thumbnail).toBeTruthy();
      });
    });
  });

  it.each(SHOWCASE_RING_FAMILIES)('selects the highest unlocked %s stage automatically', (family) => {
    const thresholds = STAGE_VALUES[family];
    thresholds.forEach((value, index) => {
      const progress = resolveShowcaseRingProgress(statsFor(family, value), family);
      expect(progress.current?.stage).toBe(index + 1);
      expect(progress.unlockedStages).toBe(index + 1);
    });
  });

  it('never loses a previous stage when a metric increases', () => {
    SHOWCASE_RING_FAMILIES.forEach((family) => {
      const counts = STAGE_VALUES[family].map((value) => (
        resolveShowcaseRingProgress(statsFor(family, value), family).unlockedStages
      ));
      expect(counts).toEqual([...counts].sort((a, b) => a - b));
    });
  });

  it('maps the existing profile statistics through one isolated adapter', () => {
    const profile = profileFixture({
      currentStreak: 9,
      recap: {
        accomplissements_majeurs: 3,
        contribution_faction: 148,
        saisons_terminees: 5,
      },
      ranking: {
        grade: { classe: true, cle: 'diamant', progression: .42 },
        percentile: 18,
        provisoire: false,
      },
    });
    const stats = adaptShowcaseRingStats(profile, new Date('2026-08-26T12:00:00.000Z'));

    expect(stats.rank.source).toBe('profile');
    expect(stats.rank.value).toBeGreaterThanOrEqual(3);
    expect(stats.streak.value).toBe(9);
    expect(stats.faction.value).toBe(148);
    expect(stats.major.value).toBe(3);
    expect(stats.seniority.value).toBe(5);
    expect(resolveAllShowcaseRings(stats).map(({ current }) => current?.stage)).toEqual([3, 3, 3, 3, 3]);
  });

  it('keeps unavailable business metrics explicit instead of inventing values', () => {
    const stats = adaptShowcaseRingStats(profileFixture(), new Date('2026-08-26T12:00:00.000Z'));
    expect(stats.faction).toEqual({ source: 'missing', value: 0 });
    expect(stats.major).toEqual({ source: 'missing', value: 0 });
  });

  it('exposes equipped only for an actually unlocked family', () => {
    const stats = statsFor('streak', 7);
    expect(resolveShowcaseRingProgress(stats, 'streak', 'streak').availability).toBe('equipped');
    expect(resolveEquippedShowcaseRing(stats, 'streak')).toMatchObject({
      family: 'streak',
      name: 'Série',
      stage: 3,
    });

    const lockedStats = statsFor('streak', 0);
    expect(resolveShowcaseRingProgress(lockedStats, 'streak', 'streak').availability).toBe('locked');
    expect(resolveEquippedShowcaseRing(lockedStats, 'streak')).toBeNull();
  });
});

function statsFor(family: ShowcaseRingFamily, value: number): ShowcaseRingStats {
  return Object.fromEntries(SHOWCASE_RING_FAMILIES.map((candidate) => [
    candidate,
    { source: 'profile', value: candidate === family ? value : 0 },
  ])) as ShowcaseRingStats;
}

function profileFixture(overrides: {
  currentStreak?: number;
  ranking?: {
    grade: { classe: boolean; cle?: 'diamant'; progression: number };
    percentile: number | null;
    provisoire: boolean;
  };
  recap?: Record<string, unknown>;
} = {}) {
  return {
    badges: [],
    createdAt: '2026-08-01T12:00:00.000Z',
    currentStreak: overrides.currentStreak ?? 0,
    ranking: overrides.ranking ?? {
      grade: { classe: false, progression: 0 },
      percentile: null,
      provisoire: true,
    },
    recap: overrides.recap ?? {},
  } as unknown as ProfileData;
}
