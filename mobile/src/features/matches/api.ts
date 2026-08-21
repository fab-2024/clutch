import { supabase } from '@/src/lib/supabase';

import type {
  ArenaMatch,
  ArenaPrediction,
  MatchCenterData,
  MatchProjection,
  MatchResultReveal,
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

export async function loadNextUnseenMatchResult(): Promise<MatchResultReveal | null> {
  const { data, error } = await supabase.rpc('clutch_prochain_resultat_a_reveler');
  if (error) throw error;
  return data ? normalizeMatchResult(data) : null;
}

export async function loadMatchResultReveal(matchId: string): Promise<MatchResultReveal | null> {
  const { data, error } = await supabase.rpc('clutch_resultat_match_v1', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data ? normalizeMatchResult(data) : null;
}

export async function markMatchResultRevealed(predictionId: string) {
  const { data, error } = await supabase.rpc('clutch_marquer_resultat_revele', {
    p_pronostic_id: predictionId,
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

function normalizeMatchResult(value: unknown): MatchResultReveal {
  if (!value || typeof value !== 'object') throw new Error('Résultat Clutch invalide.');
  const row = value as Record<string, unknown>;
  const id = requiredString(row.id, 'résultat');
  const matchId = requiredString(row.match_id, 'match');
  const status = row.statut === 'gagne' || row.statut === 'perdu' ? row.statut : null;
  const choice = row.choix === 'a' || row.choix === 'b' ? row.choix : null;
  if (!status || !choice) throw new Error('Verdict Clutch invalide.');

  return {
    id,
    match_id: matchId,
    saison_id: requiredString(row.saison_id, 'saison'),
    statut: status,
    choix: choice,
    proba_figee: finiteNumber(row.proba_figee),
    delta_frags: finiteNumber(row.delta_frags),
    frags_avant: finiteNumber(row.frags_avant),
    frags_apres: finiteNumber(row.frags_apres),
    rang_avant: optionalNumber(row.rang_avant),
    rang_apres: optionalNumber(row.rang_apres),
    verdicts_avant: nonNegativeInteger(row.verdicts_avant),
    verdicts_apres: nonNegativeInteger(row.verdicts_apres),
    regle_le: requiredString(row.regle_le, 'date de résolution'),
    revele_le: typeof row.revele_le === 'string' ? row.revele_le : null,
    equipe_a: requiredString(row.equipe_a, 'équipe A'),
    equipe_b: requiredString(row.equipe_b, 'équipe B'),
    tag_a: requiredString(row.tag_a, 'tag A'),
    tag_b: requiredString(row.tag_b, 'tag B'),
    score_a: finiteNumber(row.score_a),
    score_b: finiteNumber(row.score_b),
    jeu: requiredString(row.jeu, 'jeu'),
    evenement: requiredString(row.evenement, 'évènement'),
    format: nonNegativeInteger(row.format),
    debut: requiredString(row.debut, 'date du match'),
    source_resultat: typeof row.source_resultat === 'string'
      ? row.source_resultat
      : 'validation_clutch',
    source_resultat_label: typeof row.source_resultat_label === 'string'
      ? row.source_resultat_label
      : 'Validation Clutch',
    restants: Math.max(1, nonNegativeInteger(row.restants)),
  };
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Champ ${field} absent du résultat Clutch.`);
  }
  return value;
}

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error('Valeur numérique invalide dans le résultat Clutch.');
  return parsed;
}

function optionalNumber(value: unknown) {
  if (value == null) return null;
  return finiteNumber(value);
}

function nonNegativeInteger(value: unknown) {
  return Math.max(0, Math.trunc(finiteNumber(value)));
}
