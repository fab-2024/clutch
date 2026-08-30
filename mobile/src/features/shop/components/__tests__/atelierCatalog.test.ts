/// <reference types="jest" />

import {
  ATELIER_CATALOG,
  atelierProducts,
  createAtelierPreviewItems,
} from '../../atelierCatalog';

describe('showcase Atelier catalog', () => {
  it('keeps the approved order, prices and twenty-six unique identifiers', () => {
    expect(ATELIER_CATALOG.map((item) => item.id)).toEqual([
      'material_graphite',
      'material_steel',
      'material_bronze',
      'material_carbon',
      'material_smoked_glass',
      'lighting_cyan',
      'lighting_amber',
      'lighting_violet',
      'lighting_white',
      'lighting_emerald',
      'lighting_acid',
      'supports_gallery',
      'supports_forge',
      'supports_halo',
      'supports_crystal',
      'supports_vault',
      'supports_champagne',
      'rank_carbon_cradle',
      'rank_crystal_capsule',
      'rank_royal_crown',
      'rank_orbital_core',
      'rank_volcanic_forge',
      'rank_clutch_revelation',
      'jersey_locker',
      'jersey_gallery',
      'jersey_podium',
    ]);
    expect(new Set(ATELIER_CATALOG.map((item) => item.id))).toHaveProperty('size', 26);
    expect(ATELIER_CATALOG.map((item) => item.price)).toEqual([
      0, 120, 180, 220, 260,
      0, 100, 100, 80, 120, 80,
      0, 220, 280, 300, 320, 240,
      0, 180, 220, 260, 300, 360,
      0, 200, 240,
    ]);
  });

  it('maps each category to one server slot and exactly one included default', () => {
    const items = createAtelierPreviewItems();
    expect(items.every((item) => /^[a-z0-9-]+$/.test(item.styleKey))).toBe(true);
    expect(atelierProducts('materials')).toHaveLength(5);
    expect(atelierProducts('lighting')).toHaveLength(6);
    expect(atelierProducts('supports')).toHaveLength(6);
    expect(atelierProducts('ranks')).toHaveLength(6);
    expect(atelierProducts('jerseys')).toHaveLength(3);
    expect(items.filter((item) => item.included).map((item) => item.id)).toEqual([
      'material_graphite',
      'lighting_cyan',
      'supports_gallery',
      'rank_carbon_cradle',
      'jersey_locker',
    ]);
    expect(new Set(atelierProducts('materials').map((item) => item.slot))).toEqual(new Set(['vitrine_materiau']));
    expect(new Set(atelierProducts('lighting').map((item) => item.slot))).toEqual(new Set(['vitrine_eclairage']));
    expect(new Set(atelierProducts('supports').map((item) => item.slot))).toEqual(new Set(['vitrine_supports']));
    expect(new Set(atelierProducts('ranks').map((item) => item.slot))).toEqual(new Set(['vitrine_rang']));
    expect(new Set(atelierProducts('jerseys').map((item) => item.slot))).toEqual(new Set(['vitrine_maillot']));
  });
});
