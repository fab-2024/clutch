/// <reference types="jest" />

import {
  applyPreviewTeamPackAction,
  COSMETIC_PACK_CATALOG,
  cosmeticPackById,
  createTeamPackPreviewItems,
  FNATIC_TEAM_PACK,
  GAME_COLLECTION_PACK_CATALOG,
  KC_TEAM_PACK,
  LEAGUE_OF_LEGENDS_COLLECTION_PACK,
  M8_TEAM_PACK,
  TEAM_PACK_CATALOG,
  teamPackById,
  teamPackPrimaryAction,
  type TeamPackDefinition,
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

const KC_EXPECTED_IDS = [
  'kc-room-lighting',
  'kc-jersey',
  'kc-logo-3d',
  'kc-banner',
  'kc-pedestals',
  'kc-supporter-token',
  'kc-totem',
  'kc-supporter-badge',
  'kc-profile-frame',
  'kc-blue-wall-effect',
  'kc-share-card',
  'kc-title',
];

const M8_EXPECTED_IDS = [
  'm8-room-lighting',
  'm8-jersey',
  'm8-crest-3d',
  'm8-banner',
  'm8-pedestals',
  'm8-supporter-token',
  'm8-crest-totem',
  'm8-supporter-badge',
  'm8-profile-frame',
  'm8-sparkle-effect',
  'm8-share-card',
  'm8-title',
];

const LOL_EXPECTED_IDS = [
  'lol-infinity-edge',
  'lol-nexus-fragment',
  'lol-jinx-fishbones-gallery',
  'lol-baron-nashor',
  'lol-vision-ward',
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

describe('Karmine Corp team pack catalogue', () => {
  it('publishes the official team packs and the twelve Blue Wall objects', () => {
    expect(TEAM_PACK_CATALOG.map((pack) => pack.id)).toEqual([
      'fnatic-black-orange',
      'kc-blue-wall',
      'm8-gentle-mates',
    ]);
    expect(teamPackById('kc-blue-wall')).toBe(KC_TEAM_PACK);
    expect(KC_TEAM_PACK.price).toBe(FNATIC_TEAM_PACK.price);
    expect(KC_TEAM_PACK.items.map((item) => item.id)).toEqual(KC_EXPECTED_IDS);
    expect(KC_TEAM_PACK.items.every((item) => COSMETIC_SLOTS.includes(item.slot))).toBe(true);
  });

  it('buys and equips the eight Blue Wall defaults atomically', () => {
    const initial = makeData(1280, KC_TEAM_PACK);
    const next = applyPreviewTeamPackAction(initial, KC_TEAM_PACK);

    expect(next.balance).toBe(80);
    expect(next.items.every((item) => item.owned)).toBe(true);
    expect(next.items.filter((item) => item.equipped).map((item) => item.id)).toEqual([
      'kc-room-lighting',
      'kc-jersey',
      'kc-logo-3d',
      'kc-pedestals',
      'kc-profile-frame',
      'kc-blue-wall-effect',
      'kc-share-card',
      'kc-title',
    ]);
    expect(next.equipped.showcase.lighting?.id).toBe('kc-room-lighting');
    expect(next.equipped.showcase.supports?.id).toBe('kc-pedestals');
    expect(next.equipped.factionEffect?.id).toBe('kc-blue-wall-effect');
    expect(teamPackPrimaryAction(KC_TEAM_PACK, next)).toBe('equipped');
  });
});

describe('M8 team pack catalogue', () => {
  it('publishes the twelve Gentle Mates Paris cosmetics with the agreed rarity mix', () => {
    expect(teamPackById('m8-gentle-mates')).toBe(M8_TEAM_PACK);
    expect(M8_TEAM_PACK.price).toBe(1200);
    expect(M8_TEAM_PACK.brandKey).toBe('m8');
    expect(M8_TEAM_PACK.items.map((item) => item.id)).toEqual(M8_EXPECTED_IDS);
    expect(M8_TEAM_PACK.items.every((item) => COSMETIC_SLOTS.includes(item.slot))).toBe(true);
    expect(M8_TEAM_PACK.items.filter((item) => item.rarity === 'legendaire')).toHaveLength(3);
    expect(M8_TEAM_PACK.items.filter((item) => item.rarity === 'epique')).toHaveLength(7);
    expect(M8_TEAM_PACK.items.filter((item) => item.rarity === 'rare')).toHaveLength(2);
  });

  it('buys and equips the eight M8 defaults atomically', () => {
    const initial = makeData(1280, M8_TEAM_PACK);
    const next = applyPreviewTeamPackAction(initial, M8_TEAM_PACK);

    expect(next.balance).toBe(80);
    expect(next.items.every((item) => item.owned)).toBe(true);
    expect(next.items.filter((item) => item.equipped).map((item) => item.id)).toEqual([
      'm8-room-lighting',
      'm8-jersey',
      'm8-crest-3d',
      'm8-pedestals',
      'm8-profile-frame',
      'm8-sparkle-effect',
      'm8-share-card',
      'm8-title',
    ]);
    expect(next.equipped.showcase.lighting?.id).toBe('m8-room-lighting');
    expect(next.equipped.showcase.supports?.id).toBe('m8-pedestals');
    expect(next.equipped.factionEffect?.id).toBe('m8-sparkle-effect');
    expect(teamPackPrimaryAction(M8_TEAM_PACK, next)).toBe('equipped');
  });
});

describe('League of Legends game collection pack catalogue', () => {
  it('publishes one game collection outside the team-pack shelf', () => {
    expect(GAME_COLLECTION_PACK_CATALOG).toEqual([LEAGUE_OF_LEGENDS_COLLECTION_PACK]);
    expect(COSMETIC_PACK_CATALOG).toContain(LEAGUE_OF_LEGENDS_COLLECTION_PACK);
    expect(TEAM_PACK_CATALOG).not.toContain(LEAGUE_OF_LEGENDS_COLLECTION_PACK);
    expect(cosmeticPackById('league-of-legends-collection')).toBe(LEAGUE_OF_LEGENDS_COLLECTION_PACK);
    expect(LEAGUE_OF_LEGENDS_COLLECTION_PACK.kind).toBe('game_collection');
    expect(LEAGUE_OF_LEGENDS_COLLECTION_PACK.price).toBe(900);
    expect(LEAGUE_OF_LEGENDS_COLLECTION_PACK.items.map((item) => item.id)).toEqual(LOL_EXPECTED_IDS);
  });

  it('buys the five objects and equips the collection gallery atomically', () => {
    const initial = makeData(1_000, LEAGUE_OF_LEGENDS_COLLECTION_PACK);
    const next = applyPreviewTeamPackAction(initial, LEAGUE_OF_LEGENDS_COLLECTION_PACK);

    expect(next.balance).toBe(100);
    expect(next.items.every((item) => item.owned)).toBe(true);
    expect(next.items.filter((item) => item.equipped).map((item) => item.id)).toEqual([
      'lol-jinx-fishbones-gallery',
    ]);
    expect(next.equipped.showcase.supports?.id).toBe('lol-jinx-fishbones-gallery');
    expect(teamPackPrimaryAction(LEAGUE_OF_LEGENDS_COLLECTION_PACK, next)).toBe('equipped');
  });
});

function makeData(balance: number, pack: TeamPackDefinition = FNATIC_TEAM_PACK): CosmeticShopData {
  return {
    balance,
    contract: DEFAULT_MONETIZATION_CONTRACT,
    equipped: EMPTY_EQUIPPED_COSMETICS,
    items: createTeamPackPreviewItems(pack),
  };
}
