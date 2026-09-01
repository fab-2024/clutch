/// <reference types="jest" />

import {
  applyPreviewTeamPackAction,
  ARCHIVED_GAME_COLLECTION_PACK_CATALOG,
  ARCHIVED_TEAM_PACK_CATALOG,
  COSMETIC_PACK_CATALOG,
  cosmeticPackById,
  createTeamPackPreviewItems,
  FNATIC_TEAM_PACK,
  GAME_COLLECTION_PACK_CATALOG,
  KC_TEAM_PACK,
  LEAGUE_OF_LEGENDS_COLLECTION_PACK,
  M8_TEAM_PACK,
  NEON_PROTOCOL_PACK,
  ORIGINAL_PACK_CATALOG,
  ROCKET_LEAGUE_COLLECTION_PACK,
  TEAM_PACK_CATALOG,
  teamPackById,
  teamPackPrimaryAction,
  VALORANT_COLLECTION_PACK,
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

const VALORANT_EXPECTED_IDS = [
  'valorant-vandal',
  'valorant-spike',
  'valorant-jett-gallery',
  'valorant-omen',
  'valorant-wingman',
];

const ROCKET_LEAGUE_EXPECTED_IDS = [
  'rocket-league-zomba-wheel',
  'rocket-league-boost-100',
  'rocket-league-octane-gallery',
  'rocket-league-arena-ball',
  'rocket-league-goal-explosion',
];

const NEON_PROTOCOL_EXPECTED_IDS = [
  'neon-protocol-room',
  'neon-protocol-armor-vega',
  'neon-protocol-glyph-node',
  'neon-protocol-banner-phase',
  'neon-protocol-vector-pedestals',
  'neon-protocol-syn-token',
  'neon-protocol-null-totem',
  'neon-protocol-pioneer-badge',
  'neon-protocol-phase-frame',
  'neon-protocol-impulse-effect',
  'neon-protocol-share-card',
  'neon-protocol-architect-title',
];

describe('Pack Protocole Néon catalogue', () => {
  it('is the only active pack while preserving the six archived definitions', () => {
    expect(ORIGINAL_PACK_CATALOG).toEqual([NEON_PROTOCOL_PACK]);
    expect(COSMETIC_PACK_CATALOG).toEqual([NEON_PROTOCOL_PACK]);
    expect(TEAM_PACK_CATALOG).toEqual([]);
    expect(GAME_COLLECTION_PACK_CATALOG).toEqual([]);
    expect(ARCHIVED_TEAM_PACK_CATALOG).toEqual([
      FNATIC_TEAM_PACK,
      KC_TEAM_PACK,
      M8_TEAM_PACK,
    ]);
    expect(ARCHIVED_GAME_COLLECTION_PACK_CATALOG).toEqual([
      LEAGUE_OF_LEGENDS_COLLECTION_PACK,
      VALORANT_COLLECTION_PACK,
      ROCKET_LEAGUE_COLLECTION_PACK,
    ]);
  });

  it('publishes twelve original objects across existing cosmetic slots', () => {
    expect(NEON_PROTOCOL_PACK.id).toBe('neon-protocol');
    expect(NEON_PROTOCOL_PACK.kind).toBe('original');
    expect(NEON_PROTOCOL_PACK.price).toBe(1200);
    expect(NEON_PROTOCOL_PACK.items.map((item) => item.id)).toEqual(NEON_PROTOCOL_EXPECTED_IDS);
    expect(NEON_PROTOCOL_PACK.items.every((item) => COSMETIC_SLOTS.includes(item.slot))).toBe(true);
    expect(NEON_PROTOCOL_PACK.items.filter((item) => item.equipByDefault)).toHaveLength(8);
    expect(new Set(
      NEON_PROTOCOL_PACK.items.filter((item) => item.equipByDefault).map((item) => item.slot),
    ).size).toBe(8);
  });

  it('buys and equips the complete original pack atomically', () => {
    const initial = makeData(1280, NEON_PROTOCOL_PACK);
    const next = applyPreviewTeamPackAction(initial, NEON_PROTOCOL_PACK);

    expect(next.balance).toBe(80);
    expect(next.items.every((item) => item.owned)).toBe(true);
    expect(next.items.filter((item) => item.equipped).map((item) => item.id)).toEqual([
      'neon-protocol-room',
      'neon-protocol-armor-vega',
      'neon-protocol-glyph-node',
      'neon-protocol-vector-pedestals',
      'neon-protocol-phase-frame',
      'neon-protocol-impulse-effect',
      'neon-protocol-share-card',
      'neon-protocol-architect-title',
    ]);
    expect(next.equipped.showcase.supports?.id).toBe('neon-protocol-vector-pedestals');
    expect(next.equipped.factionEffect?.id).toBe('neon-protocol-impulse-effect');
    expect(teamPackPrimaryAction(NEON_PROTOCOL_PACK, next)).toBe('equipped');
  });
});

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

    const next = applyPreviewTeamPackAction(initial, FNATIC_TEAM_PACK);

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
  it('keeps the archived team definitions and the twelve Blue Wall objects resolvable', () => {
    expect(ARCHIVED_TEAM_PACK_CATALOG.map((pack) => pack.id)).toEqual([
      'fnatic-black-orange',
      'kc-blue-wall',
      'm8-gentle-mates',
    ]);
    expect(TEAM_PACK_CATALOG).toEqual([]);
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
  it('keeps game collections archived outside the active shelf', () => {
    expect(GAME_COLLECTION_PACK_CATALOG).toEqual([]);
    expect(ARCHIVED_GAME_COLLECTION_PACK_CATALOG).toEqual([
      LEAGUE_OF_LEGENDS_COLLECTION_PACK,
      VALORANT_COLLECTION_PACK,
      ROCKET_LEAGUE_COLLECTION_PACK,
    ]);
    expect(COSMETIC_PACK_CATALOG).not.toContain(LEAGUE_OF_LEGENDS_COLLECTION_PACK);
    expect(TEAM_PACK_CATALOG).not.toContain(LEAGUE_OF_LEGENDS_COLLECTION_PACK);
    expect(cosmeticPackById('league-of-legends-collection')).toBe(LEAGUE_OF_LEGENDS_COLLECTION_PACK);
    expect(LEAGUE_OF_LEGENDS_COLLECTION_PACK.kind).toBe('game_collection');
    expect(LEAGUE_OF_LEGENDS_COLLECTION_PACK.price).toBe(900);
    expect(LEAGUE_OF_LEGENDS_COLLECTION_PACK.items.map((item) => item.id)).toEqual(LOL_EXPECTED_IDS);
  });

  it('publishes and equips the five-object Valorant collection atomically', () => {
    expect(COSMETIC_PACK_CATALOG).not.toContain(VALORANT_COLLECTION_PACK);
    expect(TEAM_PACK_CATALOG).not.toContain(VALORANT_COLLECTION_PACK);
    expect(cosmeticPackById('valorant-collection')).toBe(VALORANT_COLLECTION_PACK);
    expect(VALORANT_COLLECTION_PACK.kind).toBe('game_collection');
    expect(VALORANT_COLLECTION_PACK.price).toBe(900);
    expect(VALORANT_COLLECTION_PACK.items.map((item) => item.id)).toEqual(VALORANT_EXPECTED_IDS);

    const initial = makeData(1_000, VALORANT_COLLECTION_PACK);
    const next = applyPreviewTeamPackAction(initial, VALORANT_COLLECTION_PACK);

    expect(next.balance).toBe(100);
    expect(next.items.every((item) => item.owned)).toBe(true);
    expect(next.items.filter((item) => item.equipped).map((item) => item.id)).toEqual([
      'valorant-jett-gallery',
    ]);
    expect(next.equipped.showcase.supports?.id).toBe('valorant-jett-gallery');
    expect(teamPackPrimaryAction(VALORANT_COLLECTION_PACK, next)).toBe('equipped');
  });

  it('publishes and equips the five-object Rocket League collection atomically', () => {
    expect(COSMETIC_PACK_CATALOG).not.toContain(ROCKET_LEAGUE_COLLECTION_PACK);
    expect(TEAM_PACK_CATALOG).not.toContain(ROCKET_LEAGUE_COLLECTION_PACK);
    expect(cosmeticPackById('rocket-league-collection')).toBe(ROCKET_LEAGUE_COLLECTION_PACK);
    expect(ROCKET_LEAGUE_COLLECTION_PACK.kind).toBe('game_collection');
    expect(ROCKET_LEAGUE_COLLECTION_PACK.price).toBe(900);
    expect(ROCKET_LEAGUE_COLLECTION_PACK.items.map((item) => item.id)).toEqual(
      ROCKET_LEAGUE_EXPECTED_IDS,
    );

    const initial = makeData(1_000, ROCKET_LEAGUE_COLLECTION_PACK);
    const next = applyPreviewTeamPackAction(initial, ROCKET_LEAGUE_COLLECTION_PACK);

    expect(next.balance).toBe(100);
    expect(next.items.every((item) => item.owned)).toBe(true);
    expect(next.items.filter((item) => item.equipped).map((item) => item.id)).toEqual([
      'rocket-league-octane-gallery',
    ]);
    expect(next.equipped.showcase.supports?.id).toBe('rocket-league-octane-gallery');
    expect(teamPackPrimaryAction(ROCKET_LEAGUE_COLLECTION_PACK, next)).toBe('equipped');
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
