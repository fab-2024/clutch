import { describe, expect, it } from '@jest/globals';

import { ACHIEVEMENT_BADGE_CATALOG } from '../catalog';
import { BADGE_IDS } from '../types';

describe('achievement badge catalogue', () => {
  it('defines only the retained simple and mystery accomplishments without duplicate identifiers', () => {
    const ids = ACHIEVEMENT_BADGE_CATALOG.map((badge) => badge.id);

    expect(ACHIEVEMENT_BADGE_CATALOG).toHaveLength(7);
    expect(ids).toEqual([...BADGE_IDS]);
    expect(new Set(ids).size).toBe(7);
    expect(ids).toEqual(expect.arrayContaining(['first_signal', 'versatile']));
    expect(ids).not.toEqual(expect.arrayContaining([
      'placement_revealed',
      'rising_streak',
      'clutch_moment',
      'sharp_eye',
      'centurion',
      'strategist',
      'regular',
      'social_bond',
      'rally',
      'standard_bearer',
      'faction_loyal',
      'season_elite',
      'griff_legend',
    ]));
  });

  it('contains 2 simple accomplishments and 5 mysteries with sealed artwork', () => {
    const visible = ACHIEVEMENT_BADGE_CATALOG.filter((badge) => !badge.isSecret);
    const mysteries = ACHIEVEMENT_BADGE_CATALOG.filter((badge) => badge.isSecret);

    expect(visible).toHaveLength(2);
    expect(mysteries).toHaveLength(5);
    mysteries.forEach((badge) => {
      expect(badge.clue).toBeTruthy();
      expect(badge.sealedVisualFamily).toMatch(/^sealed-/);
      expect(badge.visualFamily).toMatch(/^revealed-/);
    });
  });
});
