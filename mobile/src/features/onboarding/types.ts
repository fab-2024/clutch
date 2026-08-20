export type GameId = 'lol' | 'valorant' | 'cs2';

export type TeamRow = {
  id: string;
  nom: string;
  tag: string;
  jeu: GameId;
};

export type TeamOrganization = {
  key: string;
  name: string;
  tag: string;
  games: GameId[];
  teams: TeamRow[];
};
