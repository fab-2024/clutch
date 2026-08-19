import { supabase } from '@/src/lib/supabase';

export type FragsState = {
  frags: number;
  pic_frags: number;
  pronostics_regles: number;
  pronostics_gagnes: number;
  placements_restants: number;
  provisoire: boolean;
};

export type HubMatch = {
  id: string;
  debut: string;
  jeu: string;
  equipe_a: string;
  tag_a: string;
  equipe_b: string;
  tag_b: string;
  evenement: string;
  format: number;
  statut: string;
};

export type HubData = {
  seasonId: string | null;
  seasonName: string | null;
  frags: FragsState | null;
  streak: number;
  nextMatch: HubMatch | null;
};

export async function loadHubData(userId: string): Promise<HubData> {
  const { data: season, error: seasonError } = await supabase
    .from('v_saisons')
    .select('id,nom,statut')
    .eq('statut', 'en_cours')
    .limit(1)
    .maybeSingle();

  if (seasonError) throw seasonError;

  const { data: match, error: matchError } = await supabase
    .from('v_matchs')
    .select('id,debut,jeu,equipe_a,tag_a,equipe_b,tag_b,evenement,format,statut')
    .gte('debut', new Date().toISOString())
    .order('debut', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (matchError) throw matchError;

  let frags: FragsState | null = null;
  let streak = 0;

  if (season?.id) {
    const [fragsResult, participationResult] = await Promise.all([
      supabase.rpc('clutch_etat_frags', { p_saison_id: season.id }),
      supabase
        .from('participations')
        .select('serie_prime')
        .eq('saison_id', season.id)
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (fragsResult.error) throw fragsResult.error;
    if (participationResult.error) throw participationResult.error;

    frags = fragsResult.data as FragsState;
    streak = Number(participationResult.data?.serie_prime ?? 0);
  }

  return {
    seasonId: season?.id ?? null,
    seasonName: season?.nom ?? null,
    frags,
    streak,
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
