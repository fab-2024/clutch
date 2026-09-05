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
  rank: [50, 80, 90, 95, 99],
  streak: [5, 10, 15, 20, 50],
  faction: [5, 10, 20, 50, 100],
  major: [25, 50, 100, 500, 1000],
  seniority: [1, 2, 3, 4, 5],
  ritual: [1, 4, 8, 16, 32],
  countercurrent: [1, 3, 5, 10, 25],
  clean_sweep: [1, 2, 3, 4, 5],
  ascension: [1, 2, 3, 5, 8],
  duelist: [1, 5, 10, 25, 50],
  pact: [1, 2, 3, 5, 10],
  echo: [1, 25, 100, 500, 1000],
  metamorphosis: [1, 2, 3, 5, 10],
};

const STAGE_NAMES = ['Germe', 'Éveil', 'Manifestation', 'Ascendance', 'Apogée'];

describe('showcase ring progression', () => {
  it('defines five cumulative stages and two static assets for every family', () => {
    expect(SHOWCASE_RING_FAMILIES).toHaveLength(13);
    SHOWCASE_RING_FAMILIES.forEach((family) => {
      const stages = SHOWCASE_RING_CATALOG[family].stages;
      expect(stages).toHaveLength(5);
      expect(stages.map(({ name }) => name)).toEqual(STAGE_NAMES);
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
      createdAt: '2023-07-01T12:00:00.000Z',
      recap: {
        amis_invites: 20,
        derniere_saison_cloturee: {
          closed: true,
          id: 'saison-2026-printemps',
          percentile: 10,
        },
        gagnes: 100,
        plus_longue_serie: 15,
        plus_longue_serie_semaines: 8,
        calls_contre_courant_reussis: 5,
        placements_gagnes: 3,
        competitions_gagnees_distinctes: 3,
        duels_gagnes: 10,
        serie_calls_synchrones_ami: 3,
        paris: 100,
        resurgences: 3,
      },
    });
    const stats = adaptShowcaseRingStats(profile, new Date('2026-08-26T12:00:00.000Z'));

    expect(stats.rank.source).toBe('profile');
    expect(stats.rank.value).toBe(90);
    expect(stats.streak.value).toBe(15);
    expect(stats.faction.value).toBe(20);
    expect(stats.major.value).toBe(100);
    expect(stats.seniority.value).toBe(3);
    expect(stats.ritual.value).toBe(8);
    expect(stats.countercurrent.value).toBe(5);
    expect(stats.clean_sweep.value).toBe(3);
    expect(stats.ascension.value).toBe(3);
    expect(stats.duelist.value).toBe(10);
    expect(stats.pact.value).toBe(3);
    expect(stats.echo.value).toBe(100);
    expect(stats.metamorphosis.value).toBe(3);
    expect(resolveAllShowcaseRings(stats).map(({ current }) => current?.stage)).toEqual([
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
    ]);
  });

  it('keeps unavailable business metrics explicit instead of inventing values', () => {
    const stats = adaptShowcaseRingStats(profileFixture(), new Date('2026-08-26T12:00:00.000Z'));
    expect(Object.values(stats).every(({ source, value }) => source === 'missing' && value === 0)).toBe(true);
  });

  it('unlocks each seniority trace on the yearly anniversary date', () => {
    const profile = profileFixture({ createdAt: '2021-09-02T23:30:00.000Z' });

    expect(adaptShowcaseRingStats(profile, new Date('2026-09-01T23:59:00.000Z')).seniority.value).toBe(4);
    expect(adaptShowcaseRingStats(profile, new Date('2026-09-02T23:31:00.000Z')).seniority.value).toBe(5);
  });

  it('exposes equipped only for an actually unlocked family', () => {
    const stats = statsFor('streak', 7);
    expect(resolveShowcaseRingProgress(stats, 'streak', 'streak').availability).toBe('equipped');
    expect(resolveEquippedShowcaseRing(stats, 'streak')).toMatchObject({
      family: 'streak',
      name: 'Germe',
      stage: 1,
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
  createdAt?: string;
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
    createdAt: overrides.createdAt ?? '2026-08-01T12:00:00.000Z',
    currentStreak: overrides.currentStreak ?? 0,
    ranking: overrides.ranking ?? {
      grade: { classe: false, progression: 0 },
      percentile: null,
      provisoire: true,
    },
    recap: overrides.recap ?? {},
  } as unknown as ProfileData;
}
