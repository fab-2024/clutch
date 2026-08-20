import { supabase } from '@/src/lib/supabase';

import type { FragsState, HubData, HubFaction, HubMatch } from './types';

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
  const { data: season, error: seasonError } = await supabase
    .from('v_saisons')
    .select('id,nom,statut')
    .eq('statut', 'en_cours')
    .limit(1)
    .maybeSingle();

  if (seasonError) throw seasonError;

  const now = new Date().toISOString();
  const matchFields = 'id,debut,jeu,equipe_a,tag_a,equipe_b,tag_b,evenement,format,statut';
  const games = followedGames.length ? followedGames : ['lol', 'cs2', 'valorant'];
  const [inProgressResult, startedResult, upcomingResult] = await Promise.all([
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
      .limit(1)
      .maybeSingle(),
  ]);

  if (inProgressResult.error) throw inProgressResult.error;
  if (startedResult.error) throw startedResult.error;
  if (upcomingResult.error) throw upcomingResult.error;

  const match = inProgressResult.data ?? startedResult.data ?? upcomingResult.data;

  let frags: FragsState | null = null;
  let streak = 0;
  let predictionsToday = 0;
  let leagueCount = 0;
  let faction: HubFaction | null = null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const optionalRequests = [
    supabase.rpc('clutch_mes_ligues'),
    supabase.rpc('classement_communautes'),
  ] as const;

  if (season?.id) {
    const [fragsResult, participationResult, predictionsResult, leaguesResult, communitiesResult] = await Promise.all([
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
      optionalRequests[0],
      optionalRequests[1],
    ]);

    if (fragsResult.error) throw fragsResult.error;
    if (participationResult.error) throw participationResult.error;
    if (predictionsResult.error) throw predictionsResult.error;

    frags = fragsResult.data as FragsState;
    streak = Number(participationResult.data?.serie_prime ?? 0);
    predictionsToday = Number(predictionsResult.count ?? 0);

    if (!leaguesResult.error && Array.isArray(leaguesResult.data)) {
      leagueCount = leaguesResult.data.length;
    }

    if (!communitiesResult.error && Array.isArray(communitiesResult.data)) {
      const mine = (communitiesResult.data as CommunityRow[]).find((row) => Boolean(row.moi));
      if (mine?.equipe_id && mine.nom && mine.tag) {
        faction = {
          equipeId: mine.equipe_id,
          nom: mine.nom,
          tag: mine.tag,
          jeu: mine.jeu ?? '',
          membres: Number(mine.membres ?? 0),
          niveauAtteint: Number(mine.niveau_atteint ?? 1),
          croissance24h: Number(mine.croissance_24h ?? 0),
        };
      }
    }
  } else {
    const [leaguesResult, communitiesResult] = await Promise.all(optionalRequests);
    if (!leaguesResult.error && Array.isArray(leaguesResult.data)) leagueCount = leaguesResult.data.length;
    if (!communitiesResult.error && Array.isArray(communitiesResult.data)) {
      const mine = (communitiesResult.data as CommunityRow[]).find((row) => Boolean(row.moi));
      if (mine?.equipe_id && mine.nom && mine.tag) {
        faction = {
          equipeId: mine.equipe_id,
          nom: mine.nom,
          tag: mine.tag,
          jeu: mine.jeu ?? '',
          membres: Number(mine.membres ?? 0),
          niveauAtteint: Number(mine.niveau_atteint ?? 1),
          croissance24h: Number(mine.croissance_24h ?? 0),
        };
      }
    }
  }

  return {
    seasonId: season?.id ?? null,
    seasonName: season?.nom ?? null,
    frags,
    streak,
    predictionsToday,
    leagueCount,
    faction,
    nextMatch: match
      ? ({
          id: match.id,
          debut: match.debut,
          jeu: match.jeu,
          equipe_a: match.equipe_a,
          tag_a: match.tag_a,
          equipe_b: match.equipe_b,
          tag_b: match.tag_b,
          evenement: match.evenement,
          format: match.format,
          statut: match.statut,
        } as HubMatch)
      : null,
  };
}
