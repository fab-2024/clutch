import { describe, expect, it } from '@jest/globals';

import { ACHIEVEMENT_BADGE_BY_ID } from '../catalog';
import { getPublicBadgeView, isLockedSecretBadge } from '../publicView';

describe('public achievement badge projection', () => {
  it('does not expose the real mystery name, condition, progress or revealed visual while locked', () => {
    const definition = ACHIEVEMENT_BADGE_BY_ID.get('countercurrent');
    if (!definition) throw new Error('Définition Contre-courant absente.');

    const view = getPublicBadgeView(definition, {
      dataAvailable: true,
      definition,
      obtained: false,
      progress: { current: 88, target: 90 },
    });

    expect(isLockedSecretBadge(view)).toBe(true);
    expect(view).toMatchObject({
      id: 'countercurrent',
      locked: true,
      name: 'Anneau mystère',
      obtained: false,
      visualFamily: 'sealed-countercurrent',
      clue: 'La foule regardait ailleurs.',
    });
    expect(view).not.toHaveProperty('description');
    expect(view).not.toHaveProperty('condition');
    expect(view).not.toHaveProperty('progress');
    expect(view).not.toHaveProperty('unlockedAt');
    expect(view).not.toHaveProperty('seasonId');
    expect(JSON.stringify(view)).not.toContain('Contre-courant');
    expect(JSON.stringify(view)).not.toContain('10 %');
    expect(JSON.stringify(view)).not.toContain('revealed-countercurrent');
  });

  it('reveals the canonical identity only after attribution', () => {
    const definition = ACHIEVEMENT_BADGE_BY_ID.get('countercurrent');
    if (!definition) throw new Error('Définition Contre-courant absente.');
    const view = getPublicBadgeView(definition, {
      dataAvailable: true,
      definition,
      obtained: true,
      seasonId: 'saison-a',
      unlockedAt: '2026-08-11T20:00:00.000Z',
    });

    expect(view).toMatchObject({
      condition: 'Réussir un call choisi par 10 % des participants ou moins.',
      name: 'Contre-courant',
      seasonId: 'saison-a',
      visualFamily: 'revealed-countercurrent',
    });
  });
});
