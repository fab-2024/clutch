import { describe, expect, it } from '@jest/globals';

import { ACHIEVEMENT_BADGE_CATALOG } from '../catalog';
import { BADGE_IDS } from '../types';

describe('achievement badge catalogue', () => {
  it('defines exactly the 20 canonical badges without duplicate identifiers', () => {
    const ids = ACHIEVEMENT_BADGE_CATALOG.map((badge) => badge.id);

    expect(ACHIEVEMENT_BADGE_CATALOG).toHaveLength(20);
    expect(ids).toEqual([...BADGE_IDS]);
    expect(new Set(ids).size).toBe(20);
  });

  it('contains 15 public accomplishments and 5 mysteries with sealed artwork', () => {
    const visible = ACHIEVEMENT_BADGE_CATALOG.filter((badge) => !badge.isSecret);
    const mysteries = ACHIEVEMENT_BADGE_CATALOG.filter((badge) => badge.isSecret);

    expect(visible).toHaveLength(15);
    expect(mysteries).toHaveLength(5);
    mysteries.forEach((badge) => {
      expect(badge.clue).toBeTruthy();
      expect(badge.sealedVisualFamily).toMatch(/^sealed-/);
      expect(badge.visualFamily).toMatch(/^revealed-/);
    });
  });
});
