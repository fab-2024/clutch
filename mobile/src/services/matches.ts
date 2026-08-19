import { supabase } from '@/src/lib/supabase';

export type ArenaMatch = {
  id: string;
  saison_id: string;
  debut: string;
  jeu: string;
  equipe_a: string;
  tag_a: string;
  equipe_b: string;
  tag_b: string;
  evenement: string;
  format: number;
  statut: string;
  score_a: number | null;
  score_b: number | null;
};

export type ProjectionChoice = {
  cle: 'a' | 'b';
  proba: number;
  gain: number;
  perte: number;
};

export type MatchProjection = {
  choix: ProjectionChoice[];
  placements_restants?: number;
  k?: number;
};

export type RankedPrediction = {
  id: string;
  match_id: string;
  choix: 'a' | 'b';
  statut: string;
  proba_figee: number;
  proba_scoring: number;
  k_frags: number;
  delta_frags: number | null;
};

export type MatchCenterData = {
  match: ArenaMatch;
  projection: MatchProjection | null;
  prediction: RankedPrediction | null;
};

const MATCH_FIELDS =
  'id,saison_id,debut,jeu,equipe_a,tag_a,equipe_b,tag_b,evenement,format,statut,score_a,score_b';

export async function loadArenaMatches() {
  const [upcomingResult, finishedResult] = await Promise.all([
    supabase
      .from('v_matchs')
      .select(MATCH_FIELDS)
      .eq('statut', 'a_venir')
      .gte('debut', new Date().toISOString())
      .order('debut', { ascending: true })
      .limit(40),
    supabase
      .from('v_matchs')
      .select(MATCH_FIELDS)
      .eq('statut', 'termine')
      .order('debut', { ascending: false })
      .limit(40),
  ]);

  if (upcomingResult.error) throw upcomingResult.error;
  if (finishedResult.error) throw finishedResult.error;

  return {
    upcoming: (upcomingResult.data ?? []) as ArenaMatch[],
    finished: (finishedResult.data ?? []) as ArenaMatch[],
  };
}

export async function loadMatchCenter(matchId: string): Promise<MatchCenterData> {
  const { data: match, error: matchError } = await supabase
    .from('v_matchs')
    .select(MATCH_FIELDS)
    .eq('id', matchId)
    .single();

  if (matchError) throw matchError;
  const typedMatch = match as ArenaMatch;

  const projectionPromise = typedMatch.statut === 'termine'
    ? Promise.resolve({ data: null, error: null })
    : supabase.rpc('clutch_projection_match_frags', { p_match_id: matchId });

  const predictionsPromise = supabase.rpc('clutch_mes_pronostics_classes', {
    p_saison_id: typedMatch.saison_id,
  });

  const [projectionResult, predictionsResult] = await Promise.all([
    projectionPromise,
    predictionsPromise,
  ]);

  if (projectionResult.error) {
    console.warn('Projection Frags indisponible', projectionResult.error);
  }
  if (predictionsResult.error) throw predictionsResult.error;

  const predictions = Array.isArray(predictionsResult.data)
    ? (predictionsResult.data as RankedPrediction[])
    : [];

  return {
    match: typedMatch,
    projection: projectionResult.error
      ? null
      : (projectionResult.data as MatchProjection | null),
    prediction: predictions.find((item) => item.match_id === matchId) ?? null,
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

export function gameLabel(game: string) {
  const key = String(game || '').toLowerCase();
  if (key.includes('lol') || key.includes('league')) return 'LoL';
  if (key.includes('valorant')) return 'VALORANT';
  if (key.includes('cs')) return 'CS2';
  return String(game || 'ESPORT').toUpperCase();
}

export function gameKey(game: string) {
  const label = gameLabel(game);
  return label === 'LoL' || label === 'VALORANT' || label === 'CS2' ? label : 'Autres';
}
