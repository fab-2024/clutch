import { supabase } from '@/src/lib/supabase';

import type { GameId, TeamOrganization, TeamRow } from './types';

const DISPLAY_NAMES: Record<string, string> = {
  'natus vincere': 'NAVI',
  navi: 'NAVI',
  'g2 esports': 'G2 Esports',
  g2: 'G2 Esports',
  'team vitality': 'Team Vitality',
  vitality: 'Team Vitality',
};

function organizationKey(name: string) {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (normalized === 'natus vincere') return 'navi';
  if (normalized === 'g2') return 'g2 esports';
  if (normalized === 'vitality') return 'team vitality';
  return normalized;
}

export async function loadTeamOrganizations(games: GameId[]): Promise<TeamOrganization[]> {
  if (!games.length) return [];

  const { data, error } = await supabase
    .from('equipes')
    .select('id,nom,tag,jeu')
    .in('jeu', games)
    .order('nom', { ascending: true });

  if (error) throw error;

  const groups = new Map<string, TeamOrganization>();

  for (const raw of data ?? []) {
    const team = raw as TeamRow;
    const key = organizationKey(team.nom);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        key,
        name: DISPLAY_NAMES[key] ?? team.nom,
        tag: team.tag,
        games: [team.jeu],
        teams: [team],
      });
      continue;
    }

    existing.teams.push(team);
    if (!existing.games.includes(team.jeu)) existing.games.push(team.jeu);
  }

  return [...groups.values()]
    .sort((a, b) => b.games.length - a.games.length || a.name.localeCompare(b.name, 'fr'))
    .slice(0, 18);
}

export async function saveOnboarding(games: GameId[], teamId: string, userId: string) {
  const { error: gamesError } = await supabase.rpc('clutch_definir_jeux_suivis', {
    p_jeux: games,
  });
  if (gamesError) throw gamesError;

  const { error: teamError } = await supabase
    .from('profils')
    .update({ equipe_favorite_id: teamId })
    .eq('id', userId);
  if (teamError) throw teamError;
}
