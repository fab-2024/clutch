import { supabase } from '@/src/lib/supabase';

import {
  FOUNDER_ENTITLEMENT_ID,
  FOUNDER_OFFERING_ID,
  FOUNDER_PRODUCT_ID,
  type FounderPackItem,
  type FounderPackState,
  type FounderPackStatus,
  type FounderPlatform,
  type FounderSyncAction,
} from './types';

export async function loadFounderPackStatus(): Promise<FounderPackStatus> {
  const { data, error } = await supabase.rpc('clutch_statut_founder_pack_v1');
  if (error) throw error;
  return normalizeFounderPackStatus(data);
}

export async function syncFounderPackStatus(
  action: FounderSyncAction,
  platform: FounderPlatform,
): Promise<FounderPackStatus> {
  const { data, error } = await supabase.functions.invoke('clutch-founder-sync', {
    body: { action, platform },
  });
  if (error) throw error;

  const payload = asRecord(data);
  if (payload.ok !== true) {
    throw new Error(stringValue(payload.error) || 'La validation serveur du Founder Pack a échoué.');
  }
  return normalizeFounderPackStatus(payload.status);
}

export function normalizeFounderPackStatus(value: unknown): FounderPackStatus {
  const payload = asRecord(value);
  const state = normalizeState(payload.statut);
  const items = Array.isArray(payload.objets)
    ? payload.objets.map(normalizeItem).filter((item): item is FounderPackItem => item !== null)
    : [];

  return {
    version: Math.max(1, integerValue(payload.version) || 1),
    productId: stringValue(payload.produit_id) || FOUNDER_PRODUCT_ID,
    entitlementId: stringValue(payload.droit_id) || FOUNDER_ENTITLEMENT_ID,
    offeringId: stringValue(payload.offre_id) || FOUNDER_OFFERING_ID,
    type: 'non_consumable',
    indicativePrice: stringValue(payload.prix_indicatif) || '4,99 €',
    storePriceRequired: payload.prix_store_requis !== false,
    voltsIncluded: Math.max(0, integerValue(payload.volts_inclus)),
    packActive: payload.pack_actif === true,
    legacyFounder: payload.fondateur_heritage === true,
    isFounder: payload.est_fondateur === true,
    state,
    store: nullableString(payload.store),
    environment: payload.environnement === 'sandbox' || payload.environnement === 'production'
      ? payload.environnement
      : null,
    purchasedAt: nullableDate(payload.achete_le),
    restorable: payload.restaurable !== false,
    items,
  };
}

function normalizeItem(value: unknown): FounderPackItem | null {
  const item = asRecord(value);
  const slot = item.emplacement;
  if (
    slot !== 'cadre_profil'
    && slot !== 'titre_profil'
    && slot !== 'effet_faction'
    && slot !== 'carte_profil'
  ) return null;

  const id = stringValue(item.id);
  const styleKey = stringValue(item.style_key);
  if (!id || !styleKey) return null;
  return {
    id,
    slot,
    name: stringValue(item.nom) || 'Objet Founder',
    description: stringValue(item.description),
    styleKey,
    accent: /^#[0-9a-f]{6}$/i.test(stringValue(item.accent))
      ? stringValue(item.accent).toUpperCase()
      : '#FFCB45',
    owned: item.possede === true,
    equipped: item.equipe === true,
  };
}

function normalizeState(value: unknown): FounderPackState {
  if (
    value === 'active'
    || value === 'refunded'
    || value === 'revoked'
    || value === 'transferred'
    || value === 'legacy'
  ) return value;
  return 'available';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function nullableString(value: unknown) {
  return stringValue(value) || null;
}

function nullableDate(value: unknown) {
  const date = stringValue(value);
  return date && Number.isFinite(Date.parse(date)) ? date : null;
}

function integerValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}
