import { supabase } from '@/src/lib/supabase';

import type {
  AdminEvent,
  AdminMatch,
  AdminMatchData,
  AdminMatchHistory,
  AdminResultCorrectionInput,
  AdminResultInput,
  AdminSeason,
  AdminTeam,
  CreateAdminMatchInput,
} from './types';

const ADMIN_MATCH_FIELDS =
  'id,event_id,saison_id,debut,jeu,equipe_a_id,equipe_b_id,equipe_a,tag_a,equipe_b,tag_b,evenement,format,statut,score_a,score_b,motif_annulation,resultat_source,resultat_source_label,resultat_identifiant_externe,resultat_recu_le,resultat_regle_le,resultat_maj_le,resultat_revision,resultat_motif_correction';

export async function loadAdminMatchData(): Promise<AdminMatchData> {
  const [matchesResult, seasonsResult, eventsResult, teamsResult] = await Promise.all([
    supabase
      .from('v_matchs')
      .select(ADMIN_MATCH_FIELDS)
      .in('statut', ['a_venir', 'en_cours', 'termine', 'annule'])
      .order('debut', { ascending: false })
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

export async function settleAdminMatch(input: AdminResultInput) {
  const { data, error } = await supabase.rpc('clutch_admin_regler_match_v1', {
    p_match_id: input.matchId,
    p_score_a: input.scoreA,
    p_score_b: input.scoreB,
    p_source: input.source,
    p_source_label: input.sourceLabel,
    p_identifiant_externe: input.externalId,
  });
  if (error) throw error;
  return data;
}

export async function correctAdminMatchResult(input: AdminResultCorrectionInput) {
  const { data, error } = await supabase.rpc('clutch_admin_corriger_resultat_v1', {
    p_match_id: input.matchId,
    p_score_a: input.scoreA,
    p_score_b: input.scoreB,
    p_source: input.source,
    p_source_label: input.sourceLabel,
    p_identifiant_externe: input.externalId,
    p_motif: input.reason,
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

export async function loadAdminMatchHistory(matchId: string): Promise<AdminMatchHistory> {
  const { data, error } = await supabase.rpc('clutch_admin_historique_match_v1', {
    p_match_id: matchId,
    p_limite: 20,
  });
  if (error) throw error;
  return data as AdminMatchHistory;
}
