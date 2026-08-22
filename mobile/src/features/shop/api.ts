import { supabase } from '@/src/lib/supabase';

import {
  COSMETIC_SLOTS,
  EMPTY_EQUIPPED_COSMETICS,
  type CosmeticItem,
  type CosmeticMutation,
  type CosmeticRarity,
  type CosmeticShopData,
  type CosmeticSlot,
  type EquippedCosmetic,
  type EquippedCosmetics,
} from './types';

export async function loadCosmeticShop(): Promise<CosmeticShopData> {
  const { data, error } = await supabase.rpc('clutch_boutique_cosmetique_v1');
  if (error) throw error;

  const payload = asRecord(data);
  return {
    balance: toNonNegativeInteger(payload.solde),
    items: Array.isArray(payload.objets)
      ? payload.objets.map(normalizeItem).filter((item): item is CosmeticItem => item !== null)
      : [],
    equipped: normalizeEquipped(payload.equipes),
  };
}

export async function loadMyCosmetics(): Promise<EquippedCosmetics> {
  const { data, error } = await supabase.rpc('clutch_mes_cosmetiques_v1');
  if (error) throw error;
  return normalizeEquipped(data);
}

export async function loadProfileCosmetics(pseudo: string): Promise<EquippedCosmetics> {
  const { data, error } = await supabase.rpc('clutch_cosmetiques_profil_v1', {
    p_pseudo: pseudo.trim(),
  });
  if (error) throw error;
  return normalizeEquipped(data);
}

export async function purchaseCosmetic(itemId: string): Promise<CosmeticMutation> {
  const { data, error } = await supabase.rpc('clutch_acheter_cosmetique_v1', {
    p_objet_id: itemId,
  });
  if (error) throw error;
  return normalizeMutation(data, itemId);
}

export async function equipCosmetic(itemId: string): Promise<CosmeticMutation> {
  const { data, error } = await supabase.rpc('clutch_equiper_cosmetique_v1', {
    p_objet_id: itemId,
  });
  if (error) throw error;
  return normalizeMutation(data, itemId);
}

export function normalizeEquipped(value: unknown): EquippedCosmetics {
  const payload = asRecord(value);
  return {
    frame: normalizeEquippedItem(payload.cadre_profil, 'cadre_profil'),
    title: normalizeEquippedItem(payload.titre_profil, 'titre_profil'),
    core: normalizeEquippedItem(payload.apparence_core, 'apparence_core'),
    factionEffect: normalizeEquippedItem(payload.effet_faction, 'effet_faction'),
    profileCard: normalizeEquippedItem(payload.carte_profil, 'carte_profil'),
  };
}

function normalizeItem(value: unknown): CosmeticItem | null {
  const item = asRecord(value);
  const slot = normalizeSlot(item.emplacement);
  const id = stringValue(item.id);
  const styleKey = stringValue(item.style_key);
  if (!slot || !id || !styleKey) return null;

  return {
    id,
    slot,
    level: Math.max(1, toNonNegativeInteger(item.niveau)),
    name: stringValue(item.nom) || 'Cosmétique Clutch',
    description: stringValue(item.description),
    rarity: normalizeRarity(item.rarete),
    styleKey,
    accent: normalizeAccent(item.accent),
    price: toNonNegativeInteger(item.prix),
    owned: item.possede === true,
    equipped: item.equipe === true,
  };
}

function normalizeEquippedItem(value: unknown, expectedSlot: CosmeticSlot): EquippedCosmetic | null {
  const item = asRecord(value);
  const id = stringValue(item.id);
  const styleKey = stringValue(item.style_key);
  const slot = normalizeSlot(item.emplacement);
  if (!id || !styleKey || slot !== expectedSlot) return null;

  return {
    id,
    slot,
    level: Math.max(1, toNonNegativeInteger(item.niveau)),
    name: stringValue(item.nom) || 'Cosmétique Clutch',
    description: stringValue(item.description),
    rarity: normalizeRarity(item.rarete),
    styleKey,
    accent: normalizeAccent(item.accent),
  };
}

function normalizeMutation(value: unknown, fallbackId: string): CosmeticMutation {
  const payload = asRecord(value);
  const slot = normalizeSlot(payload.emplacement);
  if (!slot) throw new Error('La boutique a renvoyé une réponse incomplète.');
  return {
    itemId: stringValue(payload.objet) || fallbackId,
    slot,
    balance: toNonNegativeInteger(payload.solde),
    purchased: payload.achete === true,
    equipped: payload.equipe === true,
  };
}

function normalizeSlot(value: unknown): CosmeticSlot | null {
  const slot = stringValue(value) as CosmeticSlot;
  return COSMETIC_SLOTS.includes(slot) ? slot : null;
}

function normalizeRarity(value: unknown): CosmeticRarity {
  if (value === 'rare' || value === 'epique' || value === 'legendaire') return value;
  return 'commun';
}

function normalizeAccent(value: unknown) {
  const accent = stringValue(value);
  return /^#[0-9a-f]{6}$/i.test(accent) ? accent.toUpperCase() : '#AAB4BE';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNonNegativeInteger(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

export { EMPTY_EQUIPPED_COSMETICS };
