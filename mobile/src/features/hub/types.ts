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

export type HubFaction = {
  equipeId: string;
  nom: string;
  tag: string;
  jeu: string;
  membres: number;
  niveauAtteint: number;
  croissance24h: number;
};

export type HubData = {
  seasonId: string | null;
  seasonName: string | null;
  frags: FragsState | null;
  streak: number;
  nextMatch: HubMatch | null;
  predictionsToday: number;
  leagueCount: number;
  faction: HubFaction | null;
};
