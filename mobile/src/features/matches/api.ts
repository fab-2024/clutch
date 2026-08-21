import { supabase } from '@/src/lib/supabase';

import type {
  ArenaMatch,
  ArenaPrediction,
  MatchCenterData,
  MatchProjection,
  RankedPrediction,
} from './types';

const MATCH_FIELDS =
  'id,saison_id,debut,jeu,equipe_a,tag_a,equipe_b,tag_b,evenement,format,statut,score_a,score_b';

export async function loadArenaMatches(userId: string) {
  const now = new Date().toISOString();
  const [
    inProgressResult,
    startedResult,
    upcomingResult,
    finishedResult,
    predictionsResult,
  ] = await Promise.all([
    supabase
      .from('v_matchs')
      .select(MATCH_FIELDS)
      .eq('statut', 'en_cours')
      .order('debut', { ascending: false })
      .limit(20),
    supabase
      .from('v_matchs')
      .select(MATCH_FIELDS)
      .eq('statut', 'a_venir')
      .lte('debut', now)
      .order('debut', { ascending: false })
      .limit(20),
    supabase
      .from('v_matchs')
      .select(MATCH_FIELDS)
      .eq('statut', 'a_venir')
      .gt('debut', now)
      .order('debut', { ascending: true })
      .limit(40),
    supabase
      .from('v_matchs')
      .select(MATCH_FIELDS)
      .eq('statut', 'termine')
      .order('debut', { ascending: false })
      .limit(40),
    supabase
      .from('pronostics_classes')
      .select('match_id,choix,statut,delta_frags')
      .eq('user_id', userId)
      .order('cree_le', { ascending: false })
      .limit(200),
  ]);

  if (inProgressResult.error) throw inProgressResult.error;
  if (startedResult.error) throw startedResult.error;
  if (upcomingResult.error) throw upcomingResult.error;
  if (finishedResult.error) throw finishedResult.error;
  if (predictionsResult.error) throw predictionsResult.error;

  const predictions = new Map(
    ((predictionsResult.data ?? []) as ArenaPrediction[]).map((prediction) => [
      prediction.match_id,
      prediction,
    ]),
  );

  const live = [
    ...(inProgressResult.data ?? []),
    ...(startedResult.data ?? []),
  ].map((match) => withPrediction(match as Omit<ArenaMatch, 'prediction'>, predictions));
  live.sort((a, b) => new Date(b.debut).getTime() - new Date(a.debut).getTime());

  return {
    upcoming: [
      ...live,
      ...(upcomingResult.data ?? []).map((match) => withPrediction(
        match as Omit<ArenaMatch, 'prediction'>,
        predictions,
      )),
    ],
    finished: (finishedResult.data ?? []).map((match) => withPrediction(
      match as Omit<ArenaMatch, 'prediction'>,
      predictions,
    )),
  };
}

export async function loadMatchCenter(matchId: string, userId: string): Promise<MatchCenterData> {
  const { data: match, error: matchError } = await supabase
    .from('v_matchs')
    .select(MATCH_FIELDS)
    .eq('id', matchId)
    .single();

  if (matchError) throw matchError;
  const typedMatch = { ...match, prediction: null } as ArenaMatch;

  const projectionPromise = typedMatch.statut === 'termine' || typedMatch.statut === 'annule'
    ? Promise.resolve({ data: null, error: null })
    : supabase.rpc('clutch_projection_match_frags', { p_match_id: matchId });

  const predictionPromise = supabase
    .from('pronostics_classes')
    .select('id,match_id,choix,statut,proba_figee,proba_scoring,k_frags,delta_frags')
    .eq('user_id', userId)
    .eq('match_id', matchId)
    .maybeSingle();

  const now = new Date().toISOString();
  const relatedAfter = new Date(typedMatch.debut).getTime() > Date.now()
    ? typedMatch.debut
    : now;
  const relatedPromise = supabase
    .from('v_matchs')
    .select(MATCH_FIELDS)
    .eq('jeu', typedMatch.jeu)
    .eq('statut', 'a_venir')
    .gt('debut', relatedAfter)
    .neq('id', matchId)
    .order('debut', { ascending: true })
    .limit(3);

  const [projectionResult, predictionResult, relatedResult] = await Promise.all([
    projectionPromise,
    predictionPromise,
    relatedPromise,
  ]);

  if (projectionResult.error) {
    console.warn('Projection Frags indisponible', projectionResult.error);
  }
  if (predictionResult.error) throw predictionResult.error;
  if (relatedResult.error) throw relatedResult.error;

  return {
    match: typedMatch,
    projection: projectionResult.error
      ? null
      : (projectionResult.data as MatchProjection | null),
    prediction: (predictionResult.data as RankedPrediction | null) ?? null,
    related: (relatedResult.data ?? []).map((item) => ({
      ...item,
      prediction: null,
    })) as ArenaMatch[],
  };
}

export async function submitRankedPrediction(matchId: string, choice: 'a' | 'b') {
  const { data, error } = await supabase.rpc('placer_pronostic_classe', {
    p_match_id: matchId,
    p_choix: choice,
  });

  if (error) throw error;
  return data;
}

function withPrediction(
  match: Omit<ArenaMatch, 'prediction'>,
  predictions: Map<string, ArenaPrediction>,
): ArenaMatch {
  return {
    ...match,
    prediction: predictions.get(match.id) ?? null,
  };
}
