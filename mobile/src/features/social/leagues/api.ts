import { supabase } from '@/src/lib/supabase';

import { loadActiveSeasonId } from '../api';
import type { GlobalRankRow, LeagueSummary } from './types';

export async function loadLeagues(): Promise<LeagueSummary[]> {
  const { data, error } = await supabase
    .from('v_mes_ligues')
    .select('id,nom,code,createur_id,cree_le,nb_membres')
    .order('cree_le', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, nb_membres: Number(row.nb_membres ?? 0) })) as LeagueSummary[];
}

export async function loadGlobalRanking(): Promise<GlobalRankRow[]> {
  const seasonId = await loadActiveSeasonId();
  if (!seasonId) return [];
  const { data, error } = await supabase.rpc('clutch_classement_frags', { p_saison_id: seasonId });
  if (error) throw error;
  return Array.isArray(data)
    ? data.map((row) => ({
        ...row,
        rang: Number(row.rang ?? 0),
        frags: Number(row.frags ?? 0),
        pic_frags: Number(row.pic_frags ?? 0),
        pronostics_regles: Number(row.pronostics_regles ?? 0),
        pronostics_gagnes: Number(row.pronostics_gagnes ?? 0),
        taux_reussite: row.taux_reussite == null ? null : Number(row.taux_reussite),
        provisoire: Boolean(row.provisoire),
        moi: Boolean(row.moi),
      })) as GlobalRankRow[]
    : [];
}

export async function createLeague(name: string) {
  const { data, error } = await supabase.rpc('creer_ligue', { p_nom: name.trim() });
  if (error) throw error;
  return data;
}

export async function joinLeague(code: string) {
  const { data, error } = await supabase.rpc('rejoindre_ligue', { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data;
}
