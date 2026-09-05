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
  SHOWCASE_ACHIEVEMENT_RING_FAMILIES,
  SHOWCASE_BASE_RING_FAMILIES,
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
  ritual: [7, 30, 100, 250, 500],
  countercurrent: [1, 5, 15, 40, 100],
  clean_sweep: [1, 3, 10, 25, 50],
  ascension: [1, 2, 4, 7, 10],
  duelist: [1, 10, 50, 150, 500],
  pact: [1, 5, 15, 40, 100],
  echo: [5, 25, 100, 500, 2000],
  metamorphosis: [1, 3, 7, 15, 30],
};

const STAGE_NAMES = ['Germe', 'Éveil', 'Manifestation', 'Ascendance', 'Apogée'];

describe('showcase ring progression', () => {
  it('keeps the five base families and associates exactly eight achievement families', () => {
    expect(SHOWCASE_BASE_RING_FAMILIES).toEqual(['rank', 'streak', 'faction', 'major', 'seniority']);
    expect(SHOWCASE_ACHIEVEMENT_RING_FAMILIES).toEqual([
      'ritual',
      'countercurrent',
      'clean_sweep',
      'ascension',
      'duelist',
      'pact',
      'echo',
      'metamorphosis',
    ]);
  });

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
        jours_actifs: 100,
        calls_contre_courant_reussis: 15,
        journees_carton_plein: 10,
        promotions_ligue: 4,
        duels_gagnes: 50,
        amis_interactions_distincts: 15,
        likes_vitrine_uniques: 100,
        reliques_evolution_max: 7,
      },
    });
    const stats = adaptShowcaseRingStats(profile, new Date('2026-08-26T12:00:00.000Z'));

    expect(stats.rank.source).toBe('profile');
    expect(stats.rank.value).toBe(90);
    expect(stats.streak.value).toBe(15);
    expect(stats.faction.value).toBe(20);
    expect(stats.major.value).toBe(100);
    expect(stats.seniority.value).toBe(3);
    expect(stats.ritual.value).toBe(100);
    expect(stats.countercurrent.value).toBe(15);
    expect(stats.clean_sweep.value).toBe(10);
    expect(stats.ascension.value).toBe(4);
    expect(stats.duelist.value).toBe(50);
    expect(stats.pact.value).toBe(15);
    expect(stats.echo.value).toBe(100);
    expect(stats.metamorphosis.value).toBe(7);
    expect(resolveAllShowcaseRings(stats).map(({ current }) => current?.stage)).toEqual([
      3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
    ]);
  });

  it('does not reuse the removed achievement shortcuts for the eight new families', () => {
    const stats = adaptShowcaseRingStats(profileFixture({
      recap: {
        competitions_gagnees_distinctes: 8,
        outsiders_250_gagnes: 100,
        paris: 2000,
        placements_gagnes: 5,
        plus_longue_serie_semaines: 32,
        resurgences: 30,
        serie_calls_synchrones_ami: 10,
      },
    }));

    expect([
      stats.ritual,
      stats.countercurrent,
      stats.clean_sweep,
      stats.ascension,
      stats.pact,
      stats.echo,
      stats.metamorphosis,
    ].every(({ source }) => source === 'missing')).toBe(true);
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
