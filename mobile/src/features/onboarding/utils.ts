import type { GameId, TeamOrganization } from './types';

export function teamIdForOrganization(organization: TeamOrganization, games: GameId[]) {
  for (const game of games) {
    const match = organization.teams.find((team) => team.jeu === game);
    if (match) return match.id;
  }
  return organization.teams[0]?.id ?? null;
}
