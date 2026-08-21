import { supabase } from '@/src/lib/supabase';

import type { DuelInvitation, DuelMutation, DuelResult, DuelRow } from './types';

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

export async function createDuel(matchId: string, rivalId?: string | null): Promise<DuelMutation> {
  const { data, error } = await supabase.rpc('clutch_creer_defi_match', {
    p_match_id: matchId,
    p_cible_id: rivalId ?? null,
  });
  if (error) throw error;
  return requirePayload<DuelMutation>(data, 'Le duel n’a pas pu être créé.');
}

export async function loadDuelInvitation(token: string): Promise<DuelInvitation> {
  const { data, error } = await supabase.rpc('clutch_defi_match_public', {
    p_token: normalizeToken(token),
  });
  if (error) throw error;
  return requirePayload<DuelInvitation>(data, 'Cette invitation est introuvable.');
}

export async function acceptDuel(token: string): Promise<DuelMutation> {
  const { data, error } = await supabase.rpc('clutch_accepter_defi_match', {
    p_token: normalizeToken(token),
  });
  if (error) throw error;
  return requirePayload<DuelMutation>(data, 'Le duel n’a pas pu être accepté.');
}

export async function cancelDuel(token: string): Promise<DuelMutation> {
  const { data, error } = await supabase.rpc('clutch_annuler_defi_match', {
    p_token: normalizeToken(token),
  });
  if (error) throw error;
  return requirePayload<DuelMutation>(data, 'Le duel n’a pas pu être annulé.');
}

export async function loadDuelResult(matchId: string): Promise<DuelResult | null> {
  const { data, error } = await supabase.rpc('clutch_duel_resultat_match', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data && typeof data === 'object' ? (data as DuelResult) : null;
}

function normalizeToken(token: string) {
  return token.trim().toLowerCase();
}

function requirePayload<T>(value: unknown, message: string): T {
  if (!value || typeof value !== 'object') throw new Error(message);
  return value as T;
}
