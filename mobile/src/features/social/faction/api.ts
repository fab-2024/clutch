import { supabase } from '@/src/lib/supabase';

import type {
  CommunityData,
  CommunityFaction,
  CommunityMe,
} from './types';

export async function loadCommunityData(): Promise<CommunityData> {
  const { data, error } = await supabase.rpc('clutch_communaute_dashboard_v4');
  if (error) throw error;

  const payload = (data ?? {}) as Partial<CommunityData>;
  return {
    factions: Array.isArray(payload.factions)
      ? payload.factions.map(normalizeFaction)
      : [],
    moi: payload.moi ? normalizeMe(payload.moi) : null,
  };
}

function normalizeFaction(value: CommunityFaction): CommunityFaction {
  return {
    ...value,
    membres: Number(value.membres ?? 0),
    niveau_atteint: Number(value.niveau_atteint ?? 1),
    croissance_24h: Number(value.croissance_24h ?? 0),
    croissance_7j: Number(value.croissance_7j ?? 0),
    dernier_evenement_id: value.dernier_evenement_id == null
      ? null
      : String(value.dernier_evenement_id),
    dernier_evenement_recompense_volts: Number(value.dernier_evenement_recompense_volts ?? 0),
    moi: Boolean(value.moi),
  };
}

function normalizeMe(value: CommunityMe): CommunityMe {
  return {
    ...value,
    pronos_depuis: Number(value.pronos_depuis ?? 0),
    mutations_vecues: Number(value.mutations_vecues ?? 0),
    pronos_7j: Number(value.pronos_7j ?? 0),
    gagnes_7j: Number(value.gagnes_7j ?? 0),
    delta_frags_7j: Number(value.delta_frags_7j ?? 0),
    rang_activite: value.rang_activite == null ? null : Number(value.rang_activite),
    total_activite: value.total_activite == null ? null : Number(value.total_activite),
    top_activite: Array.isArray(value.top_activite)
      ? value.top_activite.map((item) => ({
          ...item,
          pronos_7j: Number(item.pronos_7j ?? 0),
          gagnes_7j: Number(item.gagnes_7j ?? 0),
          rang: Number(item.rang ?? 0),
        }))
      : [],
    archives: Array.isArray(value.archives)
      ? value.archives.map((item) => ({
          ...item,
          id: String(item.id),
          niveau: Number(item.niveau ?? 1),
          seuil: Number(item.seuil ?? 0),
          recompense_volts: Number(item.recompense_volts ?? 0),
          membres: Number(item.membres ?? 0),
        }))
      : [],
    mutation_a_presenter: null,
  };
}
