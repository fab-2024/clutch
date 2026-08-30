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
