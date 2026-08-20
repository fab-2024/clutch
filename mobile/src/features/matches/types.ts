export type ArenaMatch = {
  id: string;
  saison_id: string;
  debut: string;
  jeu: string;
  equipe_a: string;
  tag_a: string;
  equipe_b: string;
  tag_b: string;
  evenement: string;
  format: number;
  statut: string;
  score_a: number | null;
  score_b: number | null;
};

export type ProjectionChoice = {
  cle: 'a' | 'b';
  proba: number;
  gain: number;
  perte: number;
};

export type MatchProjection = {
  choix: ProjectionChoice[];
  placements_restants?: number;
  k?: number;
};

export type RankedPrediction = {
  id: string;
  match_id: string;
  choix: 'a' | 'b';
  statut: string;
  proba_figee: number;
  proba_scoring: number;
  k_frags: number;
  delta_frags: number | null;
};

export type MatchCenterData = {
  match: ArenaMatch;
  projection: MatchProjection | null;
  prediction: RankedPrediction | null;
};
