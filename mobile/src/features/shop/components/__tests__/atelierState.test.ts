/// <reference types="jest" />

import { createAtelierPreviewItems } from '../../atelierCatalog';
import { createTeamPackPreviewItems } from '../../teamPackCatalog';
import {
  applyAtelierTry,
  applyPreviewAtelierAction,
  atelierPrimaryAction,
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

  it('keeps exactly one equipped product in each category', () => {
    const first = applyPreviewAtelierAction(makeData(800), 'material_steel');
    const second = applyPreviewAtelierAction(first, 'material_bronze');
    const materials = second.items.filter((item) => item.slot === 'vitrine_materiau');

    expect(materials.filter((item) => item.equipped).map((item) => item.id)).toEqual(['material_bronze']);
    expect(findItem(second, 'material_steel')).toMatchObject({ owned: true, equipped: false });
    expect(findItem(second, 'material_bronze')).toMatchObject({ owned: true, equipped: true });
  });

  it('keeps try-on temporary and derives all five scene layers', () => {
    const data = makeData(500);
    const trial = applyAtelierTry({}, 'lighting', 'lighting_violet');
    const scene = resolveAtelierSceneConfig(data.equipped, {
      ...trial,
      materials: 'material_carbon',
      supports: 'supports_halo',
      ranks: 'rank_orbital_core',
      jerseys: 'jersey_podium',
    });

    expect(data.equipped.showcase.lighting?.id).toBe('lighting_cyan');
    expect(trial).toEqual({ lighting: 'lighting_violet' });
    expect(scene).toEqual({
      theme: 'carbon',
      lighting: 'violet',
      pedestal: 'steel',
      presenterId: 'supports_halo',
      rankDisplayId: 'rank_orbital_core',
      jerseyPresentation: 'podium',
    });
    expect(resolveAtelierSceneConfig(data.equipped, { lighting: 'lighting_white' }).lighting).toBe('competition');
    expect(resolveAtelierSceneConfig(data.equipped, { lighting: 'lighting_emerald' }).lighting).toBe('emerald');
    expect(resolveAtelierSceneConfig(data.equipped, { lighting: 'lighting_acid' }).lighting).toBe('acid');
  });

  it('activates the pack-only Fnatic room and orange lighting', () => {
    const items = createTeamPackPreviewItems();
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
