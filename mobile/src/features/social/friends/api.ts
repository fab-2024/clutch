import { supabase } from '@/src/lib/supabase';

import { loadActiveSeasonId } from '../api';
import type { FriendRow, FriendsData, PlayerSearchRow } from './types';

export async function loadFriends(): Promise<FriendsData> {
  const seasonId = await loadActiveSeasonId();
  const { data, error } = await supabase.rpc('clutch_mes_amis', { p_saison_id: seasonId });
  if (error) throw error;
  const payload = (data ?? {}) as Partial<FriendsData>;
  return {
    amis: normalizeFriendRows(payload.amis),
    recues: normalizeFriendRows(payload.recues),
    envoyees: normalizeFriendRows(payload.envoyees),
  };
}

export async function searchPlayers(term: string): Promise<PlayerSearchRow[]> {
  const { data, error } = await supabase.rpc('clutch_chercher_joueurs', { p_terme: term.trim() });
  if (error) throw error;
  return Array.isArray(data) ? (data as PlayerSearchRow[]) : [];
}

export async function requestFriend(userId: string) {
  const { data, error } = await supabase.rpc('clutch_demander_ami', { p_user: userId });
  if (error) throw error;
  return data;
}

export async function answerFriendRequest(userId: string, accept: boolean) {
  const { data, error } = await supabase.rpc('clutch_repondre_demande', { p_user: userId, p_accepter: accept });
  if (error) throw error;
  return data;
}

export async function removeFriend(userId: string) {
  const { data, error } = await supabase.rpc('clutch_retirer_ami', { p_user: userId });
  if (error) throw error;
  return data;
}

function normalizeFriendRows(value: FriendRow[] | undefined) {
  return Array.isArray(value)
    ? value.map((row) => ({
        ...row,
        solde: row.solde == null ? undefined : Number(row.solde),
        paris: row.paris == null ? undefined : Number(row.paris),
        gagnes: row.gagnes == null ? undefined : Number(row.gagnes),
      }))
    : [];
}
