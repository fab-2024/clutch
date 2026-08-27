import { supabase } from '@/src/lib/supabase';
import { visibleBrandLabel } from '@/src/config/brand';
import { normalizeGradeState } from '@/src/features/ranking/grades';

import type {
  ArenaMatch,
  ArenaPrediction,
  CallDistribution,
  CallResolutionRule,
  MatchCallContext,
  MatchCenterData,
  MatchProjection,
  MatchResultReveal,
  MyCallItem,
  MyCallsDashboard,
  MyCallState,
  RankedPrediction,
} from './types';

const MATCH_FIELDS =
  'id,saison_id,debut,jeu,equipe_a,tag_a,equipe_b,tag_b,evenement,format,statut,score_a,score_b,resultat_source,resultat_source_label,resultat_identifiant_externe,resultat_recu_le,resultat_regle_le,resultat_maj_le,resultat_revision,resultat_motif_correction';

export async function loadArenaMatches(userId: string) {
  const now = new Date().toISOString();
  const [
    inProgressResult,
    startedResult,
    upcomingResult,
    finishedResult,
    predictionsResult,
    callsResult,
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
    supabase.rpc('clutch_mes_calls_v1', { p_saison_id: null }),
  ]);

  if (inProgressResult.error) throw inProgressResult.error;
  if (startedResult.error) throw startedResult.error;
  if (upcomingResult.error) throw upcomingResult.error;
  if (finishedResult.error) throw finishedResult.error;
  if (predictionsResult.error) throw predictionsResult.error;
  if (callsResult.error) throw callsResult.error;

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
    calls: normalizeCallsDashboard(callsResult.data),
  };
}

export async function loadMatchCenter(matchId: string): Promise<MatchCenterData> {
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

  const callContextPromise = supabase.rpc('clutch_call_context_v1', { p_match_id: matchId });

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

  const [projectionResult, callContextResult, relatedResult] = await Promise.all([
    projectionPromise,
    callContextPromise,
    relatedPromise,
  ]);

  if (projectionResult.error) {
    console.warn('Projection Frags indisponible', projectionResult.error);
  }
  if (callContextResult.error) throw callContextResult.error;
  if (relatedResult.error) throw relatedResult.error;

  const callContext = normalizeCallContext(callContextResult.data, matchId, typedMatch.debut);

  return {
    match: { ...typedMatch, prediction: callContext.prediction },
    projection: projectionResult.error
      ? null
      : (projectionResult.data as MatchProjection | null),
    prediction: callContext.prediction,
    callContext,
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
  if (!value || typeof value !== 'object') throw new Error('Résultat GRIFF invalide.');
  const row = value as Record<string, unknown>;
  const id = requiredString(row.id, 'résultat');
  const matchId = requiredString(row.match_id, 'match');
  const status = row.statut === 'gagne' || row.statut === 'perdu' ? row.statut : null;
  const choice = row.choix === 'a' || row.choix === 'b' ? row.choix : null;
  if (!status || !choice) throw new Error('Verdict GRIFF invalide.');
  const fragsBefore = finiteNumber(row.frags_avant);
  const fragsAfter = finiteNumber(row.frags_apres);
  const verdictsBefore = nonNegativeInteger(row.verdicts_avant);
  const verdictsAfter = nonNegativeInteger(row.verdicts_apres);

  return {
    id,
    match_id: matchId,
    saison_id: requiredString(row.saison_id, 'saison'),
    statut: status,
    choix: choice,
    proba_figee: finiteNumber(row.proba_figee),
    delta_frags: finiteNumber(row.delta_frags),
    frags_avant: fragsBefore,
    frags_apres: fragsAfter,
    rang_avant: optionalNumber(row.rang_avant),
    rang_apres: optionalNumber(row.rang_apres),
    verdicts_avant: verdictsBefore,
    verdicts_apres: verdictsAfter,
    grade_avant: normalizeGradeState(row.grade_avant, { frags: fragsBefore, settledCalls: verdictsBefore }),
    grade_apres: normalizeGradeState(row.grade_apres, { frags: fragsAfter, settledCalls: verdictsAfter }),
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
      ? visibleBrandLabel(row.source_resultat_label)
      : 'Validation GRIFF',
    identifiant_resultat_externe: requiredString(
      row.identifiant_resultat_externe,
      'référence externe',
    ),
    revision_resultat: positiveInteger(row.revision_resultat, 1),
    resultat_corrige: row.resultat_corrige === true,
    regle_resolution: normalizeResolutionRule(row.regle_resolution),
    restants: Math.max(1, nonNegativeInteger(row.restants)),
  };
}

function normalizeCallsDashboard(value: unknown): MyCallsDashboard {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const counters = row.compteurs && typeof row.compteurs === 'object'
    ? row.compteurs as Record<string, unknown>
    : {};
  return {
    saison_id: stringOrNull(row.saison_id),
    saison_nom: stringOrNull(row.saison_nom),
    compteurs: {
      ouverts: nonNegativeInteger(counters.ouverts),
      verrouilles: nonNegativeInteger(counters.verrouilles),
      reussis: nonNegativeInteger(counters.reussis),
      manques: nonNegativeInteger(counters.manques),
    },
    ouverts: normalizeCallItems(row.ouverts, 'ouvert'),
    verrouilles: normalizeCallItems(row.verrouilles, 'verrouille'),
    reussis: normalizeCallItems(row.reussis, 'reussi'),
    manques: normalizeCallItems(row.manques, 'manque'),
  };
}

function normalizeCallItems(value: unknown, expectedState: MyCallState) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeCallItem(item, expectedState));
}

function normalizeCallItem(value: unknown, expectedState: MyCallState): MyCallItem {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const matchStatus = row.statut_match === 'en_cours'
    || row.statut_match === 'termine'
    || row.statut_match === 'annule'
    ? row.statut_match
    : 'a_venir';
  return {
    id: requiredString(row.id, 'call'),
    pronostic_id: stringOrNull(row.pronostic_id),
    match_id: requiredString(row.match_id, 'match'),
    saison_id: requiredString(row.saison_id, 'saison'),
    etat: isCallState(row.etat) ? row.etat : expectedState,
    jeu: requiredString(row.jeu, 'jeu'),
    evenement: requiredString(row.evenement, 'évènement'),
    format: positiveInteger(row.format, 1),
    debut: requiredString(row.debut, 'date du match'),
    statut_match: matchStatus,
    equipe_a: requiredString(row.equipe_a, 'équipe A'),
    tag_a: requiredString(row.tag_a, 'tag A'),
    equipe_b: requiredString(row.equipe_b, 'équipe B'),
    tag_b: requiredString(row.tag_b, 'tag B'),
    score_a: optionalNumber(row.score_a),
    score_b: optionalNumber(row.score_b),
    choix: row.choix === 'a' || row.choix === 'b' ? row.choix : null,
    statut: stringOrNull(row.statut),
    delta_frags: optionalNumber(row.delta_frags),
    verrouille_le: stringOrNull(row.verrouille_le),
    ferme_le: requiredString(row.ferme_le, 'fermeture'),
    regle_le: stringOrNull(row.regle_le),
    participants: nonNegativeInteger(row.participants),
    distribution: normalizeDistribution(row.distribution),
    regle_resolution: normalizeResolutionRule(row.regle_resolution),
    source_resultat: stringOrNull(row.source_resultat),
    source_resultat_label: stringOrNull(row.source_resultat_label),
    identifiant_resultat_externe: stringOrNull(row.identifiant_resultat_externe),
    revision_resultat: nonNegativeInteger(row.revision_resultat),
    resultat_corrige: row.resultat_corrige === true,
  };
}

function normalizeCallContext(value: unknown, matchId: string, closesAt: string): MatchCallContext {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const prediction = row.prediction && typeof row.prediction === 'object'
    ? normalizeRankedPrediction(row.prediction)
    : null;
  return {
    match_id: typeof row.match_id === 'string' ? row.match_id : matchId,
    participants: nonNegativeInteger(row.participants),
    ferme_le: typeof row.ferme_le === 'string' ? row.ferme_le : closesAt,
    verrouille_le: stringOrNull(row.verrouille_le),
    distribution: normalizeDistribution(row.distribution),
    regle_resolution: normalizeResolutionRule(row.regle_resolution),
    prediction,
    source_resultat: stringOrNull(row.source_resultat),
    source_resultat_label: stringOrNull(row.source_resultat_label),
    identifiant_resultat_externe: stringOrNull(row.identifiant_resultat_externe),
    revision_resultat: nonNegativeInteger(row.revision_resultat),
    resultat_corrige: row.resultat_corrige === true,
  };
}

function normalizeRankedPrediction(value: unknown): RankedPrediction {
  const row = value as Record<string, unknown>;
  const choice = row.choix === 'a' || row.choix === 'b' ? row.choix : null;
  if (!choice) throw new Error('Choix du call invalide.');
  return {
    id: requiredString(row.id, 'pronostic'),
    match_id: requiredString(row.match_id, 'match'),
    choix: choice,
    statut: requiredString(row.statut, 'statut'),
    proba_figee: finiteNumber(row.proba_figee),
    proba_scoring: finiteNumber(row.proba_scoring),
    k_frags: nonNegativeInteger(row.k_frags),
    delta_frags: optionalNumber(row.delta_frags),
    conviction: stringOrNull(row.conviction) ?? undefined,
    multiplicateur_conviction: row.multiplicateur_conviction == null
      ? undefined
      : finiteNumber(row.multiplicateur_conviction),
    cree_le: stringOrNull(row.cree_le) ?? undefined,
    regle_le: stringOrNull(row.regle_le),
  };
}

function normalizeDistribution(value: unknown): CallDistribution | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  return {
    total: nonNegativeInteger(row.total),
    a: nonNegativeInteger(row.a),
    b: nonNegativeInteger(row.b),
    a_pct: finiteNumber(row.a_pct),
    b_pct: finiteNumber(row.b_pct),
  };
}

function normalizeResolutionRule(value: unknown): CallResolutionRule {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    cle: 'vainqueur_match',
    libelle: typeof row.libelle === 'string' ? row.libelle : 'Vainqueur de la série',
    detail: typeof row.detail === 'string'
      ? row.detail
      : 'Le call est réussi si l’équipe choisie remporte le score final de la série.',
  };
}

function isCallState(value: unknown): value is MyCallState {
  return value === 'ouvert' || value === 'verrouille' || value === 'reussi' || value === 'manque';
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Champ ${field} absent du résultat GRIFF.`);
  }
  return value;
}

function finiteNumber(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error('Valeur numérique invalide dans le résultat GRIFF.');
  return parsed;
}

function optionalNumber(value: unknown) {
  if (value == null) return null;
  return finiteNumber(value);
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function stringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function nonNegativeInteger(value: unknown) {
  return Math.max(0, Math.trunc(finiteNumber(value)));
}
