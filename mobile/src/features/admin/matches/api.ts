import { supabase } from '@/src/lib/supabase';

import type {
  AdminEvent,
  AdminMatch,
  AdminMatchData,
  AdminSeason,
  AdminTeam,
  CreateAdminMatchInput,
} from './types';

const ADMIN_MATCH_FIELDS =
  'id,event_id,saison_id,debut,jeu,equipe_a_id,equipe_b_id,equipe_a,tag_a,equipe_b,tag_b,evenement,format,statut,score_a,score_b';

export async function loadAdminMatchData(): Promise<AdminMatchData> {
  const [matchesResult, seasonsResult, eventsResult, teamsResult] = await Promise.all([
    supabase
      .from('v_matchs')
      .select(ADMIN_MATCH_FIELDS)
      .in('statut', ['a_venir', 'en_cours'])
      .order('debut', { ascending: true })
      .limit(80),
    supabase
      .from('v_saisons')
      .select('id,nom,statut')
      .in('statut', ['en_cours', 'a_venir'])
      .order('debut', { ascending: true }),
    supabase
      .from('evenements')
      .select('id,nom,jeu')
      .order('jeu', { ascending: true })
      .order('nom', { ascending: true }),
    supabase
      .from('equipes')
      .select('id,nom,tag,jeu')
      .order('jeu', { ascending: true })
      .order('nom', { ascending: true }),
  ]);

  if (matchesResult.error) throw matchesResult.error;
  if (seasonsResult.error) throw seasonsResult.error;
  if (eventsResult.error) throw eventsResult.error;
  if (teamsResult.error) throw teamsResult.error;

  return {
    matches: (matchesResult.data ?? []) as AdminMatch[],
    seasons: (seasonsResult.data ?? []) as AdminSeason[],
    events: (eventsResult.data ?? []) as AdminEvent[],
    teams: (teamsResult.data ?? []) as AdminTeam[],
  };
}

export async function createAdminMatch(input: CreateAdminMatchInput) {
  const { data, error } = await supabase.rpc('creer_match', {
    p_event_id: input.eventId,
    p_equipe_a: input.teamAId,
    p_equipe_b: input.teamBId,
    p_format: input.format,
    p_debut: input.startsAt,
    p_saison_id: input.seasonId,
  });
  if (error) throw error;
  return data;
}

export async function startAdminMatch(matchId: string) {
  const { data, error } = await supabase.rpc('clutch_admin_demarrer_match_v1', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data;
}

export async function rescheduleAdminMatch(matchId: string, startsAt: string) {
  const { data, error } = await supabase.rpc('clutch_admin_reporter_match_v1', {
    p_match_id: matchId,
    p_nouveau_debut: startsAt,
  });
  if (error) throw error;
  return data;
}

export async function settleAdminMatch(matchId: string, scoreA: number, scoreB: number) {
  const { data, error } = await supabase.rpc('regler_match', {
    p_match_id: matchId,
    p_score_a: scoreA,
    p_score_b: scoreB,
  });
  if (error) throw error;
  return data;
}

export async function cancelAdminMatch(matchId: string, reason: string) {
  const { data, error } = await supabase.rpc('annuler_match', {
    p_match_id: matchId,
    p_motif: reason,
  });
  if (error) throw error;
  return data;
}
