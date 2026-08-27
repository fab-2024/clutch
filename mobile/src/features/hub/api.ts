import { supabase } from '@/src/lib/supabase';
import { normalizeGradeState, normalizeGradeSummary } from '@/src/features/ranking/grades';

import type {
  FragsState,
  HubData,
  HubFaction,
  HubFactionMission,
  HubMatch,
  HubPrediction,
  HubRecentResult,
  HubReward,
} from './types';

type CommunityRow = {
  equipe_id?: string;
  nom?: string;
  tag?: string;
  jeu?: string;
  membres?: number;
  niveau_atteint?: number;
  croissance_24h?: number;
  moi?: boolean;
};

export async function loadHubData(userId: string, followedGames: string[] = []): Promise<HubData> {
  const now = new Date().toISOString();
  const matchFields = 'id,debut,jeu,equipe_a,tag_a,equipe_b,tag_b,evenement,format,statut,score_a,score_b';
  const games = followedGames.length ? followedGames : ['lol', 'cs2', 'valorant'];
  const [
    seasonResult,
    inProgressResult,
    startedResult,
    upcomingResult,
    leaguesResult,
    communitiesResult,
    complementsResult,
  ] = await Promise.all([
    supabase
      .from('v_saisons')
      .select('id,nom,statut')
      .eq('statut', 'en_cours')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('v_matchs')
      .select(matchFields)
      .eq('statut', 'en_cours')
      .in('jeu', games)
      .order('debut', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('v_matchs')
      .select(matchFields)
      .eq('statut', 'a_venir')
      .in('jeu', games)
      .lte('debut', now)
      .order('debut', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('v_matchs')
      .select(matchFields)
      .eq('statut', 'a_venir')
      .in('jeu', games)
      .gt('debut', now)
      .order('debut', { ascending: true })
      .limit(4),
    supabase.rpc('clutch_mes_ligues'),
    supabase.rpc('classement_communautes'),
    supabase.rpc('clutch_hub_complements_v1'),
  ]);

  if (seasonResult.error) throw seasonResult.error;
  if (inProgressResult.error) throw inProgressResult.error;
  if (startedResult.error) throw startedResult.error;
  if (upcomingResult.error) throw upcomingResult.error;
  if (complementsResult.error) throw complementsResult.error;

  const season = seasonResult.data;
  const upcoming = (upcomingResult.data ?? []) as HubMatch[];
  const match = (inProgressResult.data ?? startedResult.data ?? upcoming[0] ?? null) as HubMatch | null;
  const upNext = upcoming.filter((item) => item.id !== match?.id).slice(0, 3);

  let frags: FragsState | null = null;
  let streak = 0;
  let predictionsToday = 0;
  let leagueCount = 0;
  let faction: HubFaction | null = null;
  let nextMatchPrediction: HubPrediction | null = null;

  if (season?.id) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const predictionRequest = match
      ? supabase
          .from('pronostics_classes')
          .select('match_id,choix')
          .eq('user_id', userId)
          .eq('saison_id', season.id)
          .eq('match_id', match.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const [
      fragsResult,
      participationResult,
      predictionsResult,
      predictionResult,
    ] = await Promise.all([
      supabase.rpc('clutch_etat_frags', { p_saison_id: season.id }),
      supabase
        .from('participations')
        .select('serie_prime')
        .eq('saison_id', season.id)
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('pronostics_classes')
        .select('id', { count: 'exact', head: true })
        .eq('saison_id', season.id)
        .eq('user_id', userId)
        .gte('cree_le', startOfToday.toISOString()),
      predictionRequest,
    ]);

    if (fragsResult.error) throw fragsResult.error;
    if (participationResult.error) throw participationResult.error;
    if (predictionsResult.error) throw predictionsResult.error;
    if (predictionResult.error) throw predictionResult.error;

    const rawFrags = (fragsResult.data ?? {}) as Partial<FragsState>;
    const settledCalls = Number(rawFrags.pronostics_regles ?? 0);
    const rawRating = Number(rawFrags.frags ?? 0);
    const rating = settledCalls === 0
      && (fragsResult.data as Record<string, unknown> | null)?.provisoire === true
      && rawRating === 1000
      ? 0
      : rawRating;
    frags = {
      frags: rating,
      pic_frags: Number(rawFrags.pic_frags ?? rating),
      pronostics_regles: settledCalls,
      pronostics_gagnes: Number(rawFrags.pronostics_gagnes ?? 0),
      grade: normalizeGradeState(rawFrags.grade, { frags: rating, settledCalls }),
      rang: rawFrags.rang == null ? null : Number(rawFrags.rang),
      percentile: rawFrags.percentile == null ? null : Number(rawFrags.percentile),
      joueurs_classes: Number(rawFrags.joueurs_classes ?? 0),
      meilleur_grade: normalizeGradeSummary(rawFrags.meilleur_grade),
      meilleur_rang: rawFrags.meilleur_rang == null ? null : Number(rawFrags.meilleur_rang),
    };
    streak = Number(participationResult.data?.serie_prime ?? 0);
    predictionsToday = Number(predictionsResult.count ?? 0);

    if (predictionResult.data && (predictionResult.data.choix === 'a' || predictionResult.data.choix === 'b')) {
      nextMatchPrediction = {
        matchId: predictionResult.data.match_id,
        choice: predictionResult.data.choix,
      };
    }
  }

  if (!leaguesResult.error && Array.isArray(leaguesResult.data)) {
    leagueCount = leaguesResult.data.length;
  }
  if (!communitiesResult.error && Array.isArray(communitiesResult.data)) {
    faction = findMyFaction(communitiesResult.data as CommunityRow[]);
  }
  const complements = normalizeComplements(complementsResult.data);

  return {
    seasonId: season?.id ?? null,
    seasonName: season?.nom ?? null,
    frags,
    streak,
    predictionsToday,
    leagueCount,
    faction,
    nextMatch: match,
    upNext,
    nextMatchPrediction,
    recentResult: complements.recentResult,
    factionMission: complements.factionMission,
    latestReward: complements.latestReward,
  };
}

function normalizeComplements(value: unknown): {
  recentResult: HubRecentResult | null;
  factionMission: HubFactionMission | null;
  latestReward: HubReward | null;
} {
  const payload = asRecord(value);
  return {
    recentResult: normalizeRecentResult(payload.resultat_recent),
    factionMission: normalizeFactionMission(payload.mission_faction),
    latestReward: normalizeReward(payload.derniere_recompense),
  };
}

function normalizeRecentResult(value: unknown): HubRecentResult | null {
  const row = asRecord(value);
  const status = row.statut === 'gagne' || row.statut === 'perdu' ? row.statut : null;
  const choice = row.choix === 'a' || row.choix === 'b' ? row.choix : null;
  const id = textValue(row.id);
  const matchId = textValue(row.match_id);
  if (!status || !choice || !id || !matchId) return null;
  return {
    id,
    matchId,
    status,
    choice,
    deltaFrags: Number(row.delta_frags ?? 0),
    resolvedAt: textValue(row.regle_le),
    game: textValue(row.jeu),
    event: textValue(row.evenement),
    teamA: textValue(row.equipe_a),
    tagA: textValue(row.tag_a),
    teamB: textValue(row.equipe_b),
    tagB: textValue(row.tag_b),
    scoreA: optionalNumber(row.score_a),
    scoreB: optionalNumber(row.score_b),
  };
}

function normalizeFactionMission(value: unknown): HubFactionMission | null {
  const row = asRecord(value);
  const team = asRecord(row.equipe);
  const id = textValue(row.id);
  const teamId = textValue(team.id);
  if (!id || !teamId) return null;
  return {
    id,
    title: textValue(row.titre) || 'Mission de faction',
    goal: Math.max(1, Number(row.objectif ?? 1)),
    progress: Math.max(0, Number(row.progression ?? 0)),
    personalContribution: Math.max(0, Number(row.contribution_personnelle ?? 0)),
    startsAt: textValue(row.debut),
    endsAt: textValue(row.fin),
    completed: row.terminee === true,
    participants: Math.max(0, Number(row.participants ?? 0)),
    team: {
      id: teamId,
      name: textValue(team.nom),
      tag: textValue(team.tag),
      logo: textValue(team.logo) || null,
    },
  };
}

function normalizeReward(value: unknown): HubReward | null {
  const row = asRecord(value);
  const id = textValue(row.id);
  if (!id) return null;
  return {
    id,
    name: textValue(row.nom) || 'Objet obtenu',
    family: textValue(row.famille) || null,
    slot: textValue(row.emplacement),
    rarity: textValue(row.rarete) || 'commun',
    styleKey: textValue(row.style_key) || null,
    accent: textValue(row.accent) || '#E8FF3D',
    source: textValue(row.source),
    acquiredAt: textValue(row.acquis_le),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function textValue(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function optionalNumber(value: unknown) { if (value == null) return null; const number = Number(value); return Number.isFinite(number) ? number : null; }

function findMyFaction(rows: CommunityRow[]): HubFaction | null {
  const mine = rows.find((row) => Boolean(row.moi));
  if (!mine?.equipe_id || !mine.nom || !mine.tag) return null;
  return {
    equipeId: mine.equipe_id,
    nom: mine.nom,
    tag: mine.tag,
    jeu: mine.jeu ?? '',
    membres: Number(mine.membres ?? 0),
    niveauAtteint: Number(mine.niveau_atteint ?? 1),
    croissance24h: Number(mine.croissance_24h ?? 0),
  };
}
