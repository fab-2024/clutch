import { supabase } from '@/src/lib/supabase';

import { packStoreProductId } from './cosmeticPacks';
import type { StorePlatform } from './types';

export async function syncCosmeticPacks(platform: StorePlatform): Promise<void> {
  const { data, error } = await supabase.functions.invoke('clutch-pack-sync', { body: { platform } });
  if (error) throw error;
  if (asRecord(data).ok !== true) throw new Error('La validation de tes achats est en attente. Utilise « Restaurer mes achats » pour réessayer.');
}

export async function isCosmeticPackBillingReady(packId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('clutch_pack_cosmetique_v1', { p_pack_id: packId });
  if (error) return false;
  const payload = asRecord(data);
  if (payload.achat_store_requis !== true || payload.produit_store_id !== packStoreProductId(packId)) return false;
  const readiness = await supabase.functions.invoke('clutch-pack-sync', { body: { action: 'availability' } });
  return !readiness.error && asRecord(readiness.data).ready === true;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}
