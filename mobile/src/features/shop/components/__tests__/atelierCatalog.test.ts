/// <reference types="jest" />

import {
  ATELIER_CATALOG,
  atelierProducts,
  createAtelierPreviewItems,
} from '../../atelierCatalog';

describe('showcase Atelier catalog', () => {
  it('keeps the approved order, prices and sixteen unique identifiers', () => {
    expect(ATELIER_CATALOG.map((item) => item.id)).toEqual([
      'material_graphite',
      'material_steel',
      'material_bronze',
      'material_carbon',
      'material_smoked_glass',
      'lighting_acid',
      'lighting_cyan',
      'lighting_violet',
      'lighting_amber',
      'lighting_white',
      'supports_forge',
      'supports_gallery',
      'supports_halo',
      'jersey_locker',
      'jersey_gallery',
      'jersey_podium',
    ]);
    expect(new Set(ATELIER_CATALOG.map((item) => item.id))).toHaveProperty('size', 16);
    expect(ATELIER_CATALOG.map((item) => item.price)).toEqual([
      0, 120, 180, 220, 260,
      80, 0, 100, 100, 80,
      220, 0, 280,
      0, 200, 240,
    ]);
  });

  it('maps each category to one server slot and exactly one included default', () => {
    const items = createAtelierPreviewItems();
    expect(atelierProducts('materials')).toHaveLength(5);
    expect(atelierProducts('lighting')).toHaveLength(5);
    expect(atelierProducts('supports')).toHaveLength(3);
    expect(atelierProducts('jerseys')).toHaveLength(3);
    expect(items.filter((item) => item.included).map((item) => item.id)).toEqual([
      'material_graphite',
      'lighting_cyan',
      'supports_gallery',
      'jersey_locker',
    ]);
    expect(new Set(atelierProducts('materials').map((item) => item.slot))).toEqual(new Set(['vitrine_materiau']));
    expect(new Set(atelierProducts('lighting').map((item) => item.slot))).toEqual(new Set(['vitrine_eclairage']));
    expect(new Set(atelierProducts('supports').map((item) => item.slot))).toEqual(new Set(['vitrine_supports']));
    expect(new Set(atelierProducts('jerseys').map((item) => item.slot))).toEqual(new Set(['vitrine_maillot']));
  });
});
