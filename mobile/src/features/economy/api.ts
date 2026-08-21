import { supabase } from '@/src/lib/supabase';

import type { PlayerEconomy } from './types';

type FragsState = {
  frags?: number | null;
};

export async function loadPlayerEconomy(userId: string): Promise<PlayerEconomy> {
  const [seasonResult, voltsResult] = await Promise.all([
    supabase
      .from('v_saisons')
      .select('id')
      .eq('statut', 'en_cours')
      .limit(1)
      .maybeSingle(),
    supabase.rpc('clutch_solde_volts', { p_user: userId }),
  ]);

  if (seasonResult.error) throw seasonResult.error;
  if (voltsResult.error) throw voltsResult.error;

  const seasonId = typeof seasonResult.data?.id === 'string' ? seasonResult.data.id : null;
  let frags: number | null = null;

  if (seasonId) {
    const { data, error } = await supabase.rpc('clutch_etat_frags', { p_saison_id: seasonId });
    if (error) throw error;
    frags = toBalance((data as FragsState | null)?.frags);
  }

  return {
    frags,
    volts: toBalance(voltsResult.data),
    seasonId,
  };
}

function toBalance(value: unknown): number | null {
  const balance = Number(value);
  return Number.isFinite(balance) ? Math.max(0, Math.round(balance)) : null;
}
