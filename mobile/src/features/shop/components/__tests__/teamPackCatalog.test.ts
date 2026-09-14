/// <reference types="jest" />

import {
  applyPreviewTeamPackAction,
  CHUTE_LIBRE_PACK,
  CIRCUIT_ZERO_PACK,
  CLUTCH_ORIGINALS_TEAM_PACK,
  CONCLAVE_ARCANIQUE_PACK,
  COSMETIC_PACK_CATALOG,
  cosmeticPackById,
  createTeamPackPreviewItems,
  currentCosmeticPackItemById,
  DERNIER_ROUND_PACK,
  GAME_COLLECTION_PACK_CATALOG,
  INDIVIDUAL_COLLECTION_CATALOG,
  MYTHS_FORGE_PACK,
  NEON_PROTOCOL_PACK,
  ORIGINAL_PACK_CATALOG,
  SANG_DES_TITANS_PACK,
  SERMENT_DU_GIVRE_PACK,
  TEAM_PACK_CATALOG,
  teamPackPrimaryAction,
  TURBO_ARENA_PACK,
  type TeamPackDefinition,
} from '../../teamPackCatalog';
import {
  COSMETIC_SLOTS,
  DEFAULT_MONETIZATION_CONTRACT,
  EMPTY_EQUIPPED_COSMETICS,
  type CosmeticShopData,
} from '../../types';

const ORIGINAL_PACKS = [
  SANG_DES_TITANS_PACK,
  CHUTE_LIBRE_PACK,
  SERMENT_DU_GIVRE_PACK,
  CONCLAVE_ARCANIQUE_PACK,
  TURBO_ARENA_PACK,
  DERNIER_ROUND_PACK,
] as const;

describe('current cosmetic catalogue', () => {
  it('contains only the collections shipped by the current application', () => {
    expect(ORIGINAL_PACK_CATALOG).toEqual(ORIGINAL_PACKS);
    expect(COSMETIC_PACK_CATALOG).toEqual([...ORIGINAL_PACKS, CLUTCH_ORIGINALS_TEAM_PACK]);
    expect(TEAM_PACK_CATALOG).toEqual([CLUTCH_ORIGINALS_TEAM_PACK]);
    expect(GAME_COLLECTION_PACK_CATALOG).toEqual([]);
    expect(INDIVIDUAL_COLLECTION_CATALOG).toEqual([
      CIRCUIT_ZERO_PACK,
      MYTHS_FORGE_PACK,
      NEON_PROTOCOL_PACK,
    ]);
    expect(cosmeticPackById('fnatic-black-orange')).toBeNull();
    expect(cosmeticPackById('league-of-legends-collection')).toBeNull();
    expect(currentCosmeticPackItemById(SANG_DES_TITANS_PACK.items[5].id)).toBe(
      SANG_DES_TITANS_PACK.items[5],
    );
  });

  it.each(ORIGINAL_PACKS)('publishes and equips every current object from $name', (pack) => {
    expect(pack).toMatchObject({ brandKey: 'clutch-originals', kind: 'original', licenseHolder: 'Clutch' });
    expect(pack.items).toHaveLength(8);
    expect(new Set(pack.items.map((item) => item.id))).toHaveProperty('size', 8);
    expect(pack.items.every((item) => COSMETIC_SLOTS.includes(item.slot))).toBe(true);

    const defaults = pack.items.filter((item) => item.equipByDefault);
    const next = applyPreviewTeamPackAction(makeData(1280, pack), pack);
    expect(next.items.every((item) => item.owned)).toBe(true);
    expect(next.items.filter((item) => item.equipped).map((item) => item.id)).toEqual(
      defaults.map((item) => item.id),
    );
    expect(teamPackPrimaryAction(pack, next)).toBe('equipped');
  });

  it.each(INDIVIDUAL_COLLECTION_CATALOG)('keeps $name available as individual objects', (collection) => {
    const data = makeData(1280, collection);
    expect(collection.items).toHaveLength(8);
    expect(data.items.every((item) => item.source === 'achat' && item.acquirable && item.price > 0)).toBe(true);
    expect(teamPackPrimaryAction(collection, data)).toBe('unavailable');
    expect(COSMETIC_PACK_CATALOG).not.toContain(collection);
  });
});

function makeData(balance: number, pack: TeamPackDefinition): CosmeticShopData {
  return {
    balance,
    contract: DEFAULT_MONETIZATION_CONTRACT,
    equipped: EMPTY_EQUIPPED_COSMETICS,
    items: createTeamPackPreviewItems(pack),
  };
}
