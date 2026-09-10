import balancePolicy from '../economy/balancePolicy.json';
import { packStoreProductId } from '@/src/features/purchases/cosmeticPacks';

import {
  COSMETIC_FAMILY_BY_SLOT,
  type CosmeticItem,
  type CosmeticRarity,
  type CosmeticShopData,
  type CosmeticSlot,
  type EquippedCosmetic,
  type EquippedCosmetics,
} from './types';
import type { TeamPackDefinition, TeamPackPrimaryAction } from './packs/types';

import {
  CHUTE_LIBRE_PACK,
  CONCLAVE_ARCANIQUE_PACK,
  DERNIER_ROUND_PACK,
  SANG_DES_TITANS_PACK,
  SERMENT_DU_GIVRE_PACK,
  TURBO_ARENA_PACK,
} from './originalPackCatalog';

import {
  CLUTCH_ORIGINALS_TEAM_PACK,
} from './packs/originalTeams';

import {
  NEON_PROTOCOL_PACK,
  MYTHS_FORGE_PACK,
  CIRCUIT_ZERO_PACK,
} from './packs/individualCollections';

import {
  FNATIC_TEAM_PACK,
  KC_TEAM_PACK,
  M8_TEAM_PACK,
} from './packs/archivedTeamPacks';

import {
  LEAGUE_OF_LEGENDS_COLLECTION_PACK,
  VALORANT_COLLECTION_PACK,
  ROCKET_LEAGUE_COLLECTION_PACK,
} from './packs/archivedGameCollections';

export type { CosmeticPackKind, TeamPackDefinition, TeamPackItemDefinition, TeamPackPrimaryAction } from './packs/types';
export {
  CHUTE_LIBRE_PACK,
  CONCLAVE_ARCANIQUE_PACK,
  DERNIER_ROUND_PACK,
  SANG_DES_TITANS_PACK,
  SERMENT_DU_GIVRE_PACK,
  TURBO_ARENA_PACK,
} from './originalPackCatalog';
export {
  CLUTCH_ORIGINALS_TEAM_PACK,
} from './packs/originalTeams';
export {
  NEON_PROTOCOL_PACK,
  MYTHS_FORGE_PACK,
  CIRCUIT_ZERO_PACK,
} from './packs/individualCollections';
export {
  FNATIC_TEAM_PACK,
  KC_TEAM_PACK,
  M8_TEAM_PACK,
} from './packs/archivedTeamPacks';
export {
  LEAGUE_OF_LEGENDS_COLLECTION_PACK,
  VALORANT_COLLECTION_PACK,
  ROCKET_LEAGUE_COLLECTION_PACK,
} from './packs/archivedGameCollections';

export const ORIGINAL_PACK_CATALOG: readonly TeamPackDefinition[] = [
  SANG_DES_TITANS_PACK,
  CHUTE_LIBRE_PACK,
  SERMENT_DU_GIVRE_PACK,
  CONCLAVE_ARCANIQUE_PACK,
  TURBO_ARENA_PACK,
  DERNIER_ROUND_PACK,
];

export const INDIVIDUAL_COLLECTION_CATALOG: readonly TeamPackDefinition[] = [
  CIRCUIT_ZERO_PACK,
  MYTHS_FORGE_PACK,
  NEON_PROTOCOL_PACK,
];

export function isIndividualCollection(id: string) {
  return INDIVIDUAL_COLLECTION_CATALOG.some((collection) => collection.id === id);
}

export function individualItemPrice(rarity: CosmeticRarity) {
  return rarity === 'legendaire' ? balancePolicy.individualPrices.legendaire
    : rarity === 'epique' ? balancePolicy.individualPrices.epique : balancePolicy.individualPrices.rare;
}

export const TEAM_PACK_CATALOG: readonly TeamPackDefinition[] = [
  CLUTCH_ORIGINALS_TEAM_PACK,
];

export const GAME_COLLECTION_PACK_CATALOG: readonly TeamPackDefinition[] = [];

export const ARCHIVED_TEAM_PACK_CATALOG: readonly TeamPackDefinition[] = [
  FNATIC_TEAM_PACK,
  KC_TEAM_PACK,
  M8_TEAM_PACK,
];

export const ARCHIVED_GAME_COLLECTION_PACK_CATALOG: readonly TeamPackDefinition[] = [
  LEAGUE_OF_LEGENDS_COLLECTION_PACK,
  VALORANT_COLLECTION_PACK,
  ROCKET_LEAGUE_COLLECTION_PACK,
];

export const COSMETIC_PACK_CATALOG: readonly TeamPackDefinition[] = [
  ...ORIGINAL_PACK_CATALOG,
  ...TEAM_PACK_CATALOG,
];

export const ARCHIVED_COSMETIC_PACK_CATALOG: readonly TeamPackDefinition[] = [
  ...ARCHIVED_TEAM_PACK_CATALOG,
  ...ARCHIVED_GAME_COLLECTION_PACK_CATALOG,
];

export const ALL_COSMETIC_PACK_CATALOG: readonly TeamPackDefinition[] = [
  ...COSMETIC_PACK_CATALOG,
  ...INDIVIDUAL_COLLECTION_CATALOG,
  ...ARCHIVED_COSMETIC_PACK_CATALOG,
];

const COSMETIC_PACK_ITEM_BY_ID = new Map(
  ALL_COSMETIC_PACK_CATALOG.flatMap((pack) => pack.items.map((item) => [item.id, item] as const)),
);

const CURRENT_COSMETIC_PACK_ITEM_BY_ID = new Map(
  [...COSMETIC_PACK_CATALOG, ...INDIVIDUAL_COLLECTION_CATALOG].flatMap((pack) => pack.items.map((item) => [item.id, item] as const)),
);

export function teamPackById(id: string | null | undefined) {
  return ALL_COSMETIC_PACK_CATALOG.find((pack) => pack.kind === 'team' && pack.id === id) ?? null;
}

export function cosmeticPackById(id: string | null | undefined) {
  return ALL_COSMETIC_PACK_CATALOG.find((pack) => pack.id === id) ?? null;
}

export function teamPackItemById(id: string | null | undefined) {
  return cosmeticPackItemById(id);
}

export function cosmeticPackItemById(id: string | null | undefined) {
  return id ? COSMETIC_PACK_ITEM_BY_ID.get(id) ?? null : null;
}

export function currentCosmeticPackItemById(id: string | null | undefined) {
  return id ? CURRENT_COSMETIC_PACK_ITEM_BY_ID.get(id) ?? null : null;
}

export function teamPackRuntimeItems(pack: TeamPackDefinition, data: CosmeticShopData | null | undefined) {
  const ids = new Set(pack.items.map((item) => item.id));
  return (data?.items ?? []).filter((item) => ids.has(item.id));
}

export function teamPackPrimaryAction(
  pack: TeamPackDefinition,
  data: CosmeticShopData | null | undefined,
): TeamPackPrimaryAction {
  if (!data || isIndividualCollection(pack.id)) return 'unavailable';
  const byId = new Map(teamPackRuntimeItems(pack, data).map((item) => [item.id, item]));
  if (byId.size !== pack.items.length) return 'unavailable';

  const owned = pack.items.every((definition) => byId.get(definition.id)?.owned === true);
  if (owned) {
    const equipped = pack.items
      .filter((definition) => definition.equipByDefault)
      .every((definition) => byId.get(definition.id)?.equipped === true);
    return equipped ? 'equipped' : 'equip';
  }
  return packStoreProductId(pack.id) ? 'buy' : data.balance >= pack.price ? 'buy' : 'insufficient';
}

export function createTeamPackPreviewItems(pack: TeamPackDefinition = NEON_PROTOCOL_PACK): CosmeticItem[] {
  return pack.items.map((definition, index) => ({
    id: definition.id,
    slot: definition.slot,
    family: COSMETIC_FAMILY_BY_SLOT[definition.slot],
    level: index + 1,
    name: definition.name,
    description: definition.description,
    rarity: definition.rarity,
    styleKey: definition.id,
    accent: definition.accent,
    price: isIndividualCollection(pack.id) ? individualItemPrice(definition.rarity) : 0,
    collectionKey: pack.id,
    source: isIndividualCollection(pack.id) ? 'achat' : 'team_pack',
    team: null,
    brandKey: pack.brandKey,
    campaignKey: null,
    seasonId: null,
    availableFrom: null,
    availableUntil: null,
    publicationStatus: 'publie',
    license: { type: isClutchOriginal(pack) ? 'originale' : 'partenaire', holder: pack.licenseHolder },
    included: false,
    available: true,
    acquirable: isIndividualCollection(pack.id),
    owned: false,
    equipped: false,
  }));
}

export function applyPreviewTeamPackAction(
  data: CosmeticShopData,
  pack: TeamPackDefinition = NEON_PROTOCOL_PACK,
): CosmeticShopData {
  const action = teamPackPrimaryAction(pack, data);
  if (action !== 'buy' && action !== 'equip') return data;

  const definitionById = new Map(pack.items.map((item) => [item.id, item]));
  const defaultBySlot = new Map(
    pack.items
      .filter((item) => item.equipByDefault)
      .map((item) => [item.slot, item.id] as const),
  );
  const nextItems = data.items.map((item) => {
    const definition = definitionById.get(item.id);
    if (definition) {
      return {
        ...item,
        owned: true,
        equipped: definition.equipByDefault,
      };
    }
    return defaultBySlot.has(item.slot) ? { ...item, equipped: false } : item;
  });

  return {
    ...data,
    balance: action === 'buy' && !packStoreProductId(pack.id) ? Math.max(0, data.balance - pack.price) : data.balance,
    items: nextItems,
    equipped: equipmentFromPack(nextItems, data.equipped, defaultBySlot),
  };
}

export function isClutchOriginal(pack: TeamPackDefinition) {
  return pack.kind === 'original' || pack.brandKey === 'clutch-originals';
}

function equipmentFromPack(
  items: CosmeticItem[],
  fallback: EquippedCosmetics,
  defaultBySlot: ReadonlyMap<CosmeticSlot, string>,
): EquippedCosmetics {
  const find = (slot: CosmeticSlot): EquippedCosmetic | null => {
    const id = defaultBySlot.get(slot);
    const item = id ? items.find((candidate) => candidate.id === id) : null;
    return item ? asEquipped(item) : null;
  };

  return {
    frame: find('cadre_profil') ?? fallback.frame,
    title: find('titre_profil') ?? fallback.title,
    core: find('apparence_core') ?? fallback.core,
    factionEffect: find('effet_faction') ?? fallback.factionEffect,
    profileCard: find('carte_profil') ?? fallback.profileCard,
    showcase: {
      material: fallback.showcase.material,
      lighting: find('vitrine_eclairage') ?? fallback.showcase.lighting,
      supports: find('vitrine_supports') ?? fallback.showcase.supports,
      rankDisplay: fallback.showcase.rankDisplay,
      jersey: find('vitrine_maillot') ?? fallback.showcase.jersey,
    },
  };
}

function asEquipped(item: CosmeticItem): EquippedCosmetic {
  const { accent, description, id, level, name, rarity, slot, styleKey } = item;
  return { accent, description, id, level, name, rarity, slot, styleKey };
}
