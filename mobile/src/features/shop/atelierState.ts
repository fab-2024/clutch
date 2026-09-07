import type {
  ShowcaseJerseyPresentation,
  ShowcaseLighting,
  ShowcasePedestalSkin,
  ShowcaseRoomTheme,
} from '@/src/features/profile/components/showcase/types';

import { ATELIER_CATEGORY_META, type AtelierCategory } from './atelierCatalog';
import {
  DEFAULT_SHOWCASE_PRESENTER_ID,
  showcasePresenterById,
  showcasePresenterByRoomId,
} from './showcasePresenterCatalog';
import { DEFAULT_SHOWCASE_RANK_DISPLAY_ID } from './showcaseRankDisplayCatalog';
import { showcaseRoomByProductId } from './showcaseRoomCatalog';
import { conflictingCollectionRoom, DEFAULT_SHOWCASE_LIGHTING_ID } from './showcaseRoomSelection';
import type { CosmeticItem, CosmeticShopData, EquippedCosmetics, CosmeticSlot } from './types';

export type AtelierPrimaryAction = 'buy' | 'equip' | 'equipped' | 'insufficient' | 'unavailable';
export type AtelierTrySelection = Partial<Record<AtelierCategory, string>>;

export type AtelierSceneConfig = {
  jerseyPresentation: ShowcaseJerseyPresentation;
  lighting: ShowcaseLighting;
  pedestal: ShowcasePedestalSkin;
  presenterId: string;
  rankDisplayId: string;
  roomId: string | null;
  theme: ShowcaseRoomTheme;
};

const DEFAULT_IDS: Record<AtelierCategory, string> = {
  originals: 'circuit-zero-kairos-6',
  materials: 'material_graphite',
  lighting: DEFAULT_SHOWCASE_LIGHTING_ID,
  supports: 'supports_gallery',
  pedestals: 'sang-des-titans-monolith-pedestal',
  ranks: DEFAULT_SHOWCASE_RANK_DISPLAY_ID,
  jerseys: 'jersey_locker',
};

export function atelierPrimaryAction(item: CosmeticItem, balance: number): AtelierPrimaryAction {
  if (item.equipped) return 'equipped';
  if (item.owned) return 'equip';
  if (!item.available || !item.acquirable) return 'unavailable';
  return balance >= item.price ? 'buy' : 'insufficient';
}

export function atelierRuntimeItems(data: CosmeticShopData | null | undefined): CosmeticItem[] {
  if (!data) return [];
  return data.items.map((item) => conflictingCollectionRoom(data.equipped, item.id)
    ? { ...item, equipped: false }
    : item);
}

export function applyPreviewAtelierAction(data: CosmeticShopData, itemId: string): CosmeticShopData {
  const item = atelierRuntimeItems(data).find((candidate) => candidate.id === itemId);
  if (!item) return data;

  const action = atelierPrimaryAction(item, data.balance);
  if (action === 'equipped' || action === 'insufficient' || action === 'unavailable') return data;

  const purchased = action === 'buy';
  const nextBalance = purchased ? data.balance - item.price : data.balance;
  const clearsCollectionRoom = Boolean(conflictingCollectionRoom(data.equipped, itemId));
  const nextItems = data.items.map((candidate) => {
    if (clearsCollectionRoom && candidate.slot === 'vitrine_eclairage') {
      return { ...candidate, equipped: candidate.id === DEFAULT_SHOWCASE_LIGHTING_ID };
    }
    if (candidate.slot !== item.slot) return candidate;
    if (candidate.id === item.id) return { ...candidate, equipped: true, owned: true };
    return { ...candidate, equipped: false };
  });

  return {
    ...data,
    balance: Math.max(0, nextBalance),
    items: nextItems,
    equipped: {
      ...equipmentFromItems(nextItems, data.equipped),
    },
  };
}

export function applyAtelierTry(
  selection: AtelierTrySelection,
  category: AtelierCategory,
  itemId: string,
): AtelierTrySelection {
  return { ...selection, [category]: itemId };
}

export function equippedAtelierIds(equipped: EquippedCosmetics | null | undefined): Record<AtelierCategory, string> {
  const lightingId = equipped?.showcase.lighting?.id;
  return {
    originals: equipped?.core?.id ?? DEFAULT_IDS.originals,
    materials: equipped?.showcase.material?.id ?? DEFAULT_IDS.materials,
    lighting: equipped?.showcase.lighting?.id ?? DEFAULT_IDS.lighting,
    supports: lightingId && showcasePresenterByRoomId(lightingId)
      ? lightingId
      : equipped?.showcase.supports?.id ?? DEFAULT_IDS.supports,
    pedestals: equipped?.showcase.supports?.id ?? DEFAULT_IDS.pedestals,
    ranks: equipped?.showcase.rankDisplay?.id ?? DEFAULT_IDS.ranks,
    jerseys: equipped?.showcase.jersey?.id ?? DEFAULT_IDS.jerseys,
  };
}

export function resolveAtelierSceneConfig(
  equipped: EquippedCosmetics | null | undefined,
  trial: AtelierTrySelection = {},
): AtelierSceneConfig {
  const persisted = equippedAtelierIds(equipped);
  const materialId = trial.materials ?? persisted.materials;
  const lightingId = trial.lighting ?? persisted.lighting;
  const supportsId = trial.supports ?? equipped?.showcase.supports?.id ?? DEFAULT_IDS.supports;
  const pedestalId = trial.pedestals ?? persisted.pedestals;
  const rankDisplayId = trial.ranks ?? persisted.ranks;
  const jerseyId = trial.jerseys ?? persisted.jerseys;
  const collectionRoom = showcasePresenterByRoomId(trial.supports ?? lightingId);
  const room = collectionRoom ? null : showcaseRoomByProductId(supportsId);

  return {
    theme: materialTheme(materialId),
    lighting: lightingTone(lightingId),
    pedestal: supportsPedestal(pedestalId),
    presenterId: collectionRoom?.id ?? (room ? DEFAULT_SHOWCASE_PRESENTER_ID : supportsId),
    rankDisplayId,
    roomId: room?.id ?? null,
    jerseyPresentation: jerseyPresentation(jerseyId),
  };
}

export function equippedItemForCategory(
  data: CosmeticShopData | null | undefined,
  category: AtelierCategory,
) {
  const slot = ATELIER_CATEGORY_META[category].slot;
  return data?.items.find((item) => item.slot === slot && item.equipped) ?? null;
}

function equipmentFromItems(items: CosmeticItem[], fallback: EquippedCosmetics) {
  const find = (slot: CosmeticSlot) => {
    const item = items.find((candidate) => candidate.slot === slot && candidate.equipped);
    if (!item) return null;
    const { id, level, name, description, rarity, styleKey, accent } = item;
    return { id, slot, level, name, description, rarity, styleKey, accent };
  };

  return {
    frame: find('cadre_profil') ?? fallback.frame,
    title: find('titre_profil') ?? fallback.title,
    core: find('apparence_core') ?? fallback.core,
    factionEffect: find('effet_faction') ?? fallback.factionEffect,
    profileCard: find('carte_profil') ?? fallback.profileCard,
    showcase: {
      material: find('vitrine_materiau') ?? fallback.showcase.material,
      lighting: find('vitrine_eclairage') ?? fallback.showcase.lighting,
      supports: find('vitrine_supports') ?? fallback.showcase.supports,
      rankDisplay: find('vitrine_rang') ?? fallback.showcase.rankDisplay,
      jersey: find('vitrine_maillot') ?? fallback.showcase.jersey,
    },
  };
}

function materialTheme(itemId: string): ShowcaseRoomTheme {
  if (itemId === 'material_steel') return 'steel';
  if (itemId === 'material_bronze') return 'museum';
  if (itemId === 'material_carbon') return 'carbon';
  if (itemId === 'material_smoked_glass') return 'azure';
  return 'graphite';
}

function lightingTone(itemId: string): ShowcaseLighting {
  if (itemId === 'fnatic-room-lighting') return 'orange';
  if (itemId === 'kc-room-lighting') return 'blue';
  if (itemId === 'm8-room-lighting') return 'silver';
  if (itemId === 'lighting_acid') return 'acid';
  if (itemId === 'lighting_emerald') return 'emerald';
  if (itemId === 'lighting_violet') return 'violet';
  if (itemId === 'lighting_amber') return 'amber';
  if (itemId === 'lighting_white') return 'competition';
  return 'cyan';
}

function supportsPedestal(itemId: string): ShowcasePedestalSkin {
  return showcasePresenterById(itemId)?.pedestal ?? 'obsidian';
}

function jerseyPresentation(itemId: string): ShowcaseJerseyPresentation {
  if (itemId === 'jersey_gallery') return 'gallery';
  if (itemId === 'jersey_podium') return 'podium';
  return 'locker';
}
