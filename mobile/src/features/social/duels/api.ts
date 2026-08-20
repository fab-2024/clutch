import { supabase } from '@/src/lib/supabase';

import type { DuelRow } from './types';

export async function loadDuels(limit = 30): Promise<DuelRow[]> {
  const { data, error } = await supabase.rpc('clutch_mes_defis_match', { p_limite: limit });
  if (error) throw error;
  if (Array.isArray(data)) return data as DuelRow[];
  if (data && typeof data === 'object') {
    const payload = data as { defis?: DuelRow[]; duels?: DuelRow[]; items?: DuelRow[] };
    if (Array.isArray(payload.defis)) return payload.defis;
    if (Array.isArray(payload.duels)) return payload.duels;
    if (Array.isArray(payload.items)) return payload.items;
  }
  return [];
}
