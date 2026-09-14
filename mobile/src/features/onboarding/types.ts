export type GameId = 'lol' | 'valorant' | 'rocket_league';

export type TeamRow = {
  id: string;
  nom: string;
  tag: string;
  jeu: GameId;
  logo?: string | null;
};

export type TeamOrganization = {
  key: string;
  name: string;
  tag: string;
  logo?: string | null;
  games: GameId[];
  teams: TeamRow[];
};

export type OnboardingDraft = {
  step: number;
  favoriteGame: GameId | null;
  favoriteTeamKey: string | null;
  favoriteTeamId: string | null;
  missingGame: string;
  missingTeam: string;
};
