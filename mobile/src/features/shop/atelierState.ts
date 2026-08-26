import type {
  ShowcaseJerseyPresentation,
  ShowcaseLighting,
  ShowcasePedestalSkin,
  ShowcaseRoomTheme,
} from '@/src/features/profile/components/showcase/types';

import { ATELIER_CATEGORY_META, type AtelierCategory } from './atelierCatalog';
import type { CosmeticItem, CosmeticShopData, EquippedCosmetics } from './types';

export type AtelierPrimaryAction = 'buy' | 'equip' | 'equipped' | 'insufficient' | 'unavailable';
export type AtelierTrySelection = Partial<Record<AtelierCategory, string>>;

export type AtelierSceneConfig = {
  jerseyPresentation: ShowcaseJerseyPresentation;
  lighting: ShowcaseLighting;
  pedestal: ShowcasePedestalSkin;
  theme: ShowcaseRoomTheme;
};

const DEFAULT_IDS: Record<AtelierCategory, string> = {
  materials: 'material_graphite',
  lighting: 'lighting_cyan',
  supports: 'supports_gallery',
  jerseys: 'jersey_locker',
};

export function atelierPrimaryAction(item: CosmeticItem, balance: number): AtelierPrimaryAction {
  if (item.equipped) return 'equipped';
  if (item.owned) return 'equip';
  if (!item.available || !item.acquirable) return 'unavailable';
  return balance >= item.price ? 'buy' : 'insufficient';
}

export function applyPreviewAtelierAction(data: CosmeticShopData, itemId: string): CosmeticShopData {
  const item = data.items.find((candidate) => candidate.id === itemId);
  if (!item) return data;

  const action = atelierPrimaryAction(item, data.balance);
  if (action === 'equipped' || action === 'insufficient' || action === 'unavailable') return data;

  const purchased = action === 'buy';
  const nextBalance = purchased ? data.balance - item.price : data.balance;
  const nextItems = data.items.map((candidate) => {
    if (candidate.slot !== item.slot) return candidate;
    if (candidate.id === item.id) return { ...candidate, equipped: true, owned: true };
    return { ...candidate, equipped: false };
  });

  return {
    ...data,
    balance: Math.max(0, nextBalance),
    items: nextItems,
    equipped: {
      ...data.equipped,
      showcase: equipmentFromItems(nextItems, data.equipped),
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
  return {
    materials: equipped?.showcase.material?.id ?? DEFAULT_IDS.materials,
    lighting: equipped?.showcase.lighting?.id ?? DEFAULT_IDS.lighting,
    supports: equipped?.showcase.supports?.id ?? DEFAULT_IDS.supports,
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
  const supportsId = trial.supports ?? persisted.supports;
  const jerseyId = trial.jerseys ?? persisted.jerseys;

  return {
    theme: materialTheme(materialId),
    lighting: lightingTone(lightingId),
    pedestal: supportsPedestal(supportsId),
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
  const find = (category: AtelierCategory) => {
    const slot = ATELIER_CATEGORY_META[category].slot;
    const item = items.find((candidate) => candidate.slot === slot && candidate.equipped);
    if (!item) return null;
    const { id, level, name, description, rarity, styleKey, accent } = item;
    return { id, slot, level, name, description, rarity, styleKey, accent };
  };

  return {
    material: find('materials') ?? fallback.showcase.material,
    lighting: find('lighting') ?? fallback.showcase.lighting,
    supports: find('supports') ?? fallback.showcase.supports,
    jersey: find('jerseys') ?? fallback.showcase.jersey,
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
  if (itemId === 'lighting_acid') return 'acid';
  if (itemId === 'lighting_violet') return 'violet';
  if (itemId === 'lighting_amber') return 'amber';
  if (itemId === 'lighting_white') return 'white';
  return 'cyan';
}

function supportsPedestal(itemId: string): ShowcasePedestalSkin {
  if (itemId === 'supports_forge') return 'bronze';
  if (itemId === 'supports_halo') return 'steel';
  return 'obsidian';
}

function jerseyPresentation(itemId: string): ShowcaseJerseyPresentation {
  if (itemId === 'jersey_gallery') return 'gallery';
  if (itemId === 'jersey_podium') return 'podium';
  return 'locker';
}
