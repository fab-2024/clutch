/// <reference types="jest" />

import {
  applyPreviewTeamPackAction,
  createTeamPackPreviewItems,
  FNATIC_TEAM_PACK,
  teamPackPrimaryAction,
} from '../../teamPackCatalog';
import {
  COSMETIC_SLOTS,
  DEFAULT_MONETIZATION_CONTRACT,
  EMPTY_EQUIPPED_COSMETICS,
  type CosmeticShopData,
} from '../../types';

const EXPECTED_IDS = [
  'fnatic-room-lighting',
  'fnatic-jersey',
  'fnatic-logo-3d',
  'fnatic-banner',
  'fnatic-pedestals',
  'fnatic-supporter-token',
  'fnatic-totem',
  'fnatic-supporter-badge',
  'fnatic-profile-frame',
  'fnatic-embers',
  'fnatic-share-card',
  'fnatic-title',
];

describe('Fnatic team pack catalogue', () => {
  it('publishes the twelve referenced objects without adding a cosmetic slot', () => {
    expect(FNATIC_TEAM_PACK.id).toBe('fnatic-black-orange');
    expect(FNATIC_TEAM_PACK.price).toBe(1200);
    expect(FNATIC_TEAM_PACK.items.map((item) => item.id)).toEqual(EXPECTED_IDS);
    expect(FNATIC_TEAM_PACK.items.every((item) => COSMETIC_SLOTS.includes(item.slot))).toBe(true);
  });

  it('defines one default object per equipped slot and keeps four collectibles optional', () => {
    const defaults = FNATIC_TEAM_PACK.items.filter((item) => item.equipByDefault);
    const defaultSlots = defaults.map((item) => item.slot);

    expect(defaults).toHaveLength(8);
    expect(new Set(defaultSlots).size).toBe(defaultSlots.length);
    expect(FNATIC_TEAM_PACK.items.filter((item) => !item.equipByDefault).map((item) => item.id)).toEqual([
      'fnatic-banner',
      'fnatic-supporter-token',
      'fnatic-totem',
      'fnatic-supporter-badge',
    ]);
  });

  it('buys and equips the complete preview pack atomically', () => {
    const initial = makeData(1280);
    expect(teamPackPrimaryAction(FNATIC_TEAM_PACK, initial)).toBe('buy');

    const next = applyPreviewTeamPackAction(initial);

    expect(next.balance).toBe(80);
    expect(next.items.filter((item) => EXPECTED_IDS.includes(item.id)).every((item) => item.owned)).toBe(true);
    expect(next.items.filter((item) => item.equipped).map((item) => item.id)).toEqual([
      'fnatic-room-lighting',
      'fnatic-jersey',
      'fnatic-logo-3d',
      'fnatic-pedestals',
      'fnatic-profile-frame',
      'fnatic-embers',
      'fnatic-share-card',
      'fnatic-title',
    ]);
    expect(next.equipped.frame?.id).toBe('fnatic-profile-frame');
    expect(next.equipped.showcase.supports?.id).toBe('fnatic-pedestals');
    expect(teamPackPrimaryAction(FNATIC_TEAM_PACK, next)).toBe('equipped');
  });

  it('blocks the pack action when the Volt balance is insufficient', () => {
    expect(teamPackPrimaryAction(FNATIC_TEAM_PACK, makeData(1199))).toBe('insufficient');
  });
});

function makeData(balance: number): CosmeticShopData {
  return {
    balance,
    contract: DEFAULT_MONETIZATION_CONTRACT,
    equipped: EMPTY_EQUIPPED_COSMETICS,
    items: createTeamPackPreviewItems(),
  };
}
