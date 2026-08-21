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
  statut: 'a_venir' | 'en_cours' | 'termine' | 'annule';
  score_a: number | null;
  score_b: number | null;
  prediction: ArenaPrediction | null;
};

export type ArenaPrediction = {
  match_id: string;
  choix: 'a' | 'b';
  statut: string;
  delta_frags: number | null;
};

export type ProjectionChoice = {
  cle: 'a' | 'b';
  proba: number;
  gain: number;
  perte: number;
};

export type MatchProjection = {
  match_id?: string;
  choix: ProjectionChoice[];
  placements_restants?: number;
  k?: number;
  source?: string;
  figee_le?: string;
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

export type MatchResultReveal = {
  id: string;
  match_id: string;
  saison_id: string;
  statut: 'gagne' | 'perdu';
  choix: 'a' | 'b';
  proba_figee: number;
  delta_frags: number;
  frags_avant: number;
  frags_apres: number;
  rang_avant: number | null;
  rang_apres: number | null;
  verdicts_avant: number;
  verdicts_apres: number;
  regle_le: string;
  revele_le: string | null;
  equipe_a: string;
  equipe_b: string;
  tag_a: string;
  tag_b: string;
  score_a: number;
  score_b: number;
  jeu: string;
  evenement: string;
  format: number;
  debut: string;
  source_resultat: string;
  source_resultat_label: string;
  restants: number;
};

export type MatchCenterData = {
  match: ArenaMatch;
  projection: MatchProjection | null;
  prediction: RankedPrediction | null;
  related: ArenaMatch[];
};
