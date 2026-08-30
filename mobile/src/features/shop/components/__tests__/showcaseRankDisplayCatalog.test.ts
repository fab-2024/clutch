/// <reference types="jest" />

import {
  DEFAULT_SHOWCASE_RANK_DISPLAY_ID,
  SHOWCASE_RANK_DISPLAY_CATALOG,
  showcaseRankDisplayById,
} from '../../showcaseRankDisplayCatalog';

describe('showcase rank display catalog', () => {
  it('keeps the six approved displays in visual order', () => {
    expect(SHOWCASE_RANK_DISPLAY_CATALOG.map((display) => display.id)).toEqual([
      'rank_carbon_cradle',
      'rank_crystal_capsule',
      'rank_royal_crown',
      'rank_orbital_core',
      'rank_volcanic_forge',
      'rank_clutch_revelation',
    ]);
    expect(SHOWCASE_RANK_DISPLAY_CATALOG.map((display) => display.name)).toEqual([
      'Écrin Mécanique Carbone',
      'Capsule Cristal',
      'Couronne Royale',
      'Noyau Orbital',
      'Forge Volcanique',
      'Révélation Clutch',
    ]);
  });

  it('exposes one included display and five deterministic Volt acquisitions', () => {
    expect(DEFAULT_SHOWCASE_RANK_DISPLAY_ID).toBe('rank_carbon_cradle');
    expect(SHOWCASE_RANK_DISPLAY_CATALOG.map((display) => display.price)).toEqual([
      0, 180, 220, 260, 300, 360,
    ]);
    expect(SHOWCASE_RANK_DISPLAY_CATALOG.every((display) => display.image)).toBe(true);
    expect(SHOWCASE_RANK_DISPLAY_CATALOG.every((display) => display.overlayImage)).toBe(true);
    expect(new Set(SHOWCASE_RANK_DISPLAY_CATALOG.map((display) => display.id)).size).toBe(6);
  });

  it('resolves known displays and rejects unknown identifiers', () => {
    expect(showcaseRankDisplayById('rank_orbital_core')).toMatchObject({
      accent: '#7ED9F4',
      name: 'Noyau Orbital',
    });
    expect(showcaseRankDisplayById('missing-rank-display')).toBeNull();
  });
});
