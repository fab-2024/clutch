/// <reference types="jest" />

import { createAtelierPreviewItems } from '../../atelierCatalog';
import {
  applyPreviewTeamPackAction,
  createTeamPackPreviewItems,
  FNATIC_TEAM_PACK,
  KC_TEAM_PACK,
  M8_TEAM_PACK,
  SERMENT_DU_GIVRE_PACK,
} from '../../teamPackCatalog';
import {
  applyAtelierTry,
  applyPreviewAtelierAction,
  atelierPrimaryAction,
  atelierRuntimeItems,
  equippedAtelierIds,
  resolveAtelierSceneConfig,
} from '../../atelierState';
import {
  DEFAULT_MONETIZATION_CONTRACT,
  EMPTY_EQUIPPED_COSMETICS,
  type CosmeticItem,
  type CosmeticShopData,
  type EquippedCosmetic,
} from '../../types';

describe('showcase Atelier state', () => {
  it('prevents negative balances and duplicate purchases', () => {
    const initial = makeData(100);
    const steel = findItem(initial, 'material_steel');
    expect(atelierPrimaryAction(steel, initial.balance)).toBe('insufficient');
    expect(applyPreviewAtelierAction(initial, steel.id)).toBe(initial);

    const funded = makeData(500);
    const purchased = applyPreviewAtelierAction(funded, steel.id);
    expect(purchased.balance).toBe(380);
    expect(findItem(purchased, steel.id)).toMatchObject({ owned: true, equipped: true });

    const repeated = applyPreviewAtelierAction(purchased, steel.id);
    expect(repeated.balance).toBe(380);
    expect(repeated).toBe(purchased);
  });

  it.each([
    ['circuit-zero-zero-glyph', 'core'],
    ['circuit-zero-sector-banner', 'profileCard'],
    ['circuit-zero-wake-frame', 'frame'],
    ['circuit-zero-afterimage-effect', 'factionEffect'],
  ] as const)('equips %s individually and preserves the other collection objects', (id, equipmentKey) => {
    const initial = makeData(500);
    const item = findItem(initial, id);
    const purchased = applyPreviewAtelierAction(initial, id);
    expect(purchased.equipped[equipmentKey]?.id).toBe(id);
    expect(purchased.balance).toBe(500 - item.price);
    expect(purchased.items.filter((candidate) => candidate.collectionKey === 'circuit-zero' && candidate.owned).map((candidate) => candidate.id)).toEqual([id]);
    expect(applyPreviewAtelierAction(purchased, id)).toBe(purchased);
  });

  it('keeps exactly one equipped product in each category', () => {
    const first = applyPreviewAtelierAction(makeData(800), 'material_steel');
    const second = applyPreviewAtelierAction(first, 'material_bronze');
    const materials = second.items.filter((item) => item.slot === 'vitrine_materiau');

    expect(materials.filter((item) => item.equipped).map((item) => item.id)).toEqual(['material_bronze']);
    expect(findItem(second, 'material_steel')).toMatchObject({ owned: true, equipped: false });
    expect(findItem(second, 'material_bronze')).toMatchObject({ owned: true, equipped: true });
  });

  it('keeps room and pedestal try-ons independent', () => {
    const data = makeData(500);
    const trial = applyAtelierTry(
      applyAtelierTry(
        applyAtelierTry({}, 'lighting', 'lighting_violet'),
        'supports',
        'supports_halo',
      ),
      'pedestals',
      'sang-des-titans-monolith-pedestal',
    );
    const scene = resolveAtelierSceneConfig(data.equipped, {
      ...trial,
      materials: 'material_carbon',
      ranks: 'rank_orbital_core',
      jerseys: 'jersey_podium',
    });

    expect(data.equipped.showcase.lighting?.id).toBe('lighting_cyan');
    expect(trial).toEqual({
      lighting: 'lighting_violet',
      pedestals: 'sang-des-titans-monolith-pedestal',
      supports: 'supports_halo',
    });
    expect(scene).toEqual({
      theme: 'carbon',
      lighting: 'violet',
      pedestal: 'bronze',
      presenterId: 'supports_gallery',
      rankDisplayId: 'rank_orbital_core',
      roomId: 'azure-horizon',
      jerseyPresentation: 'podium',
    });
    expect(resolveAtelierSceneConfig(data.equipped, { lighting: 'lighting_white' }).lighting).toBe('competition');
    expect(resolveAtelierSceneConfig(data.equipped, { lighting: 'lighting_emerald' }).lighting).toBe('emerald');
    expect(resolveAtelierSceneConfig(data.equipped, { lighting: 'lighting_acid' }).lighting).toBe('acid');
  });

  it('activates the pack-only Fnatic room and orange lighting', () => {
    const items = createTeamPackPreviewItems(FNATIC_TEAM_PACK);
    const fnaticLighting = items.find((item) => item.id === 'fnatic-room-lighting');
    const fnaticPedestals = items.find((item) => item.id === 'fnatic-pedestals');
    if (!fnaticLighting || !fnaticPedestals) throw new Error('Missing Fnatic preview fixtures');

    expect(resolveAtelierSceneConfig({
      ...EMPTY_EQUIPPED_COSMETICS,
      showcase: {
        ...EMPTY_EQUIPPED_COSMETICS.showcase,
        lighting: asEquipped(fnaticLighting),
        supports: asEquipped(fnaticPedestals),
      },
    })).toMatchObject({
      lighting: 'orange',
      presenterId: 'fnatic-pedestals',
    });
  });

  it('activates the pack-only KC room and Blue Wall lighting', () => {
    const items = createTeamPackPreviewItems(KC_TEAM_PACK);
    const lighting = items.find((item) => item.id === 'kc-room-lighting');
    const pedestals = items.find((item) => item.id === 'kc-pedestals');
    if (!lighting || !pedestals) throw new Error('Missing KC preview fixtures');

    expect(resolveAtelierSceneConfig({
      ...EMPTY_EQUIPPED_COSMETICS,
      showcase: {
        ...EMPTY_EQUIPPED_COSMETICS.showcase,
        lighting: asEquipped(lighting),
        supports: asEquipped(pedestals),
      },
    })).toMatchObject({
      lighting: 'blue',
      presenterId: 'kc-pedestals',
    });
  });

  it('activates the pack-only M8 room and silver lighting', () => {
    const items = createTeamPackPreviewItems(M8_TEAM_PACK);
    const lighting = items.find((item) => item.id === 'm8-room-lighting');
    const pedestals = items.find((item) => item.id === 'm8-pedestals');
    if (!lighting || !pedestals) throw new Error('Missing M8 preview fixtures');

    expect(resolveAtelierSceneConfig({
      ...EMPTY_EQUIPPED_COSMETICS,
      showcase: {
        ...EMPTY_EQUIPPED_COSMETICS.showcase,
        lighting: asEquipped(lighting),
        supports: asEquipped(pedestals),
      },
    })).toMatchObject({
      lighting: 'silver',
      presenterId: 'm8-pedestals',
    });
  });

  it('keeps a collection room usable without purchasing a pedestal', () => {
    const purchased = applyPreviewAtelierAction(makeData(500), 'circuit-zero-room');
    expect(purchased.balance).toBe(200);
    expect(resolveAtelierSceneConfig(purchased.equipped)).toMatchObject({
      presenterId: 'circuit-zero-aero-pedestals', roomId: null,
    });
    expect(resolveAtelierSceneConfig(purchased.equipped, { supports: 'supports_halo' }).roomId).toBe('azure-horizon');
  });

  it('replaces a collection room persistently, including an already-owned standard room', () => {
    const standard = applyPreviewAtelierAction(makeData(2000), 'supports_halo');
    const collection = applyPreviewAtelierAction(standard, 'circuit-zero-room');
    expect(equippedAtelierIds(collection.equipped).supports).toBe('circuit-zero-room');
    expect(atelierRuntimeItems(collection).find((item) => item.id === 'supports_halo')?.equipped).toBe(false);
    const restored = applyPreviewAtelierAction(collection, 'supports_halo');
    expect(restored.balance).toBe(collection.balance);
    expect(restored.equipped.showcase.lighting?.id).toBe('lighting_cyan');
    expect(resolveAtelierSceneConfig(restored.equipped).roomId).toBe('azure-horizon');
    expect(atelierRuntimeItems(restored).filter((item) => item.id === 'circuit-zero-room' && item.equipped)).toHaveLength(0);
    const collectionAgain = applyPreviewAtelierAction(restored, 'circuit-zero-room');
    expect(resolveAtelierSceneConfig(collectionAgain.equipped).presenterId).toBe('circuit-zero-aero-pedestals');
  });

  it('equips the complete room included with a Clutch original pack', () => {
    const initial = makeData(1280);
    initial.items = [
      ...initial.items,
      ...createTeamPackPreviewItems(SERMENT_DU_GIVRE_PACK),
    ];

    const purchased = applyPreviewTeamPackAction(initial, SERMENT_DU_GIVRE_PACK);

    expect(purchased.equipped.showcase.lighting?.id).toBe('serment-du-givre-room');
    expect(purchased.items.some((item) => item.id === 'serment-du-givre-ice-sheet-pedestal')).toBe(false);
    expect(resolveAtelierSceneConfig(purchased.equipped)).toMatchObject({
      presenterId: 'serment-du-givre-ice-sheet-pedestal',
      roomId: null,
    });
  });
});

function makeData(balance: number): CosmeticShopData {
  const items = createAtelierPreviewItems();
  return {
    balance,
    items,
    equipped: {
      ...EMPTY_EQUIPPED_COSMETICS,
      showcase: {
        material: asEquipped(findItem({ items } as CosmeticShopData, 'material_graphite')),
        lighting: asEquipped(findItem({ items } as CosmeticShopData, 'lighting_cyan')),
        supports: asEquipped(findItem({ items } as CosmeticShopData, 'supports_gallery')),
        rankDisplay: asEquipped(findItem({ items } as CosmeticShopData, 'rank_carbon_cradle')),
        jersey: asEquipped(findItem({ items } as CosmeticShopData, 'jersey_locker')),
      },
    },
    contract: DEFAULT_MONETIZATION_CONTRACT,
  };
}

function findItem(data: Pick<CosmeticShopData, 'items'>, id: string): CosmeticItem {
  const item = data.items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing test item ${id}`);
  return item;
}

function asEquipped(item: CosmeticItem): EquippedCosmetic {
  const { id, slot, level, name, description, rarity, styleKey, accent } = item;
  return { id, slot, level, name, description, rarity, styleKey, accent };
}
