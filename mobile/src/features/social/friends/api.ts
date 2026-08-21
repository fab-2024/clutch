import { supabase } from '@/src/lib/supabase';

import { loadActiveSeasonId } from '../api';
import type { CircleWeeklyData, CircleWeeklyRow, FriendRow, FriendsData, PlayerSearchRow } from './types';

export async function loadFriends(): Promise<FriendsData> {
  const [seasonId, friendsResult, weeklyResult] = await Promise.all([
    loadActiveSeasonId(),
    supabase.rpc('clutch_mes_amis', { p_saison_id: null }),
    supabase.rpc('clutch_cercle_hebdo_v1', { p_saison_id: null }),
  ]);
  if (friendsResult.error) throw friendsResult.error;
  if (weeklyResult.error) throw weeklyResult.error;
  const payload = (friendsResult.data ?? {}) as Partial<FriendsData>;
  return {
    amis: normalizeFriendRows(payload.amis),
    recues: normalizeFriendRows(payload.recues),
    envoyees: normalizeFriendRows(payload.envoyees),
    weekly: normalizeWeekly(weeklyResult.data, seasonId),
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

function normalizeWeekly(value: unknown, fallbackSeasonId: string | null): CircleWeeklyData | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const classement = Array.isArray(row.classement)
    ? row.classement.map(normalizeWeeklyRow)
    : [];
  const me = row.moi && typeof row.moi === 'object'
    ? {
        ...normalizeWeeklyRow(row.moi),
        participants: Math.max(1, Number((row.moi as Record<string, unknown>).participants ?? classement.length)),
      }
    : null;
  return {
    saison_id: typeof row.saison_id === 'string' ? row.saison_id : fallbackSeasonId,
    semaine: String(row.semaine ?? ''),
    debut: String(row.debut ?? ''),
    fin: String(row.fin ?? ''),
    classement,
    moi: me,
  };
}

function normalizeWeeklyRow(value: unknown): CircleWeeklyRow {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    id: String(row.id ?? ''),
    pseudo: String(row.pseudo ?? 'Joueur'),
    tag_favori: typeof row.tag_favori === 'string' ? row.tag_favori : null,
    rang: Math.max(1, Number(row.rang ?? 1)),
    calls: Math.max(0, Number(row.calls ?? 0)),
    victoires: Math.max(0, Number(row.victoires ?? 0)),
    precision_pct: row.precision_pct == null ? null : Number(row.precision_pct),
    frags_hebdo: Number(row.frags_hebdo ?? 0),
    meilleur_call: Number(row.meilleur_call ?? 0),
    frags: Number(row.frags ?? 1000),
    grade: row.grade && typeof row.grade === 'object' ? row.grade as Record<string, unknown> : null,
    moi: Boolean(row.moi),
  };
}
