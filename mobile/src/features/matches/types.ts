import type { SeasonalGradeState } from '@/src/features/ranking/grades';

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
  resultat_source?: string | null;
  resultat_source_label?: string | null;
  resultat_identifiant_externe?: string | null;
  resultat_recu_le?: string | null;
  resultat_regle_le?: string | null;
  resultat_maj_le?: string | null;
  resultat_revision?: number;
  resultat_motif_correction?: string | null;
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
  conviction?: string;
  multiplicateur_conviction?: number;
  cree_le?: string;
  regle_le?: string | null;
};

export type CallDistribution = {
  total: number;
  a: number;
  b: number;
  a_pct: number;
  b_pct: number;
};

export type CallResolutionRule = {
  cle: 'vainqueur_match';
  libelle: string;
  detail: string;
};

export type MyCallState = 'ouvert' | 'verrouille' | 'reussi' | 'manque';

export type MyCallItem = {
  id: string;
  pronostic_id: string | null;
  match_id: string;
  saison_id: string;
  etat: MyCallState;
  jeu: string;
  evenement: string;
  format: number;
  debut: string;
  statut_match: ArenaMatch['statut'];
  equipe_a: string;
  tag_a: string;
  equipe_b: string;
  tag_b: string;
  score_a: number | null;
  score_b: number | null;
  choix: 'a' | 'b' | null;
  statut: string | null;
  delta_frags: number | null;
  verrouille_le: string | null;
  ferme_le: string;
  regle_le: string | null;
  participants: number;
  distribution: CallDistribution | null;
  regle_resolution: CallResolutionRule;
  source_resultat: string | null;
  source_resultat_label: string | null;
  identifiant_resultat_externe: string | null;
  revision_resultat: number;
  resultat_corrige: boolean;
};

export type MyCallsDashboard = {
  saison_id: string | null;
  saison_nom: string | null;
  compteurs: {
    ouverts: number;
    verrouilles: number;
    reussis: number;
    manques: number;
  };
  ouverts: MyCallItem[];
  verrouilles: MyCallItem[];
  reussis: MyCallItem[];
  manques: MyCallItem[];
};

export type MatchCallContext = {
  match_id: string;
  participants: number;
  ferme_le: string;
  verrouille_le: string | null;
  distribution: CallDistribution | null;
  regle_resolution: CallResolutionRule;
  prediction: RankedPrediction | null;
  source_resultat: string | null;
  source_resultat_label: string | null;
  identifiant_resultat_externe: string | null;
  revision_resultat: number;
  resultat_corrige: boolean;
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
  grade_avant: SeasonalGradeState;
  grade_apres: SeasonalGradeState;
  objectif_placements: number;
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
  identifiant_resultat_externe: string;
  revision_resultat: number;
  resultat_corrige: boolean;
  regle_resolution: CallResolutionRule;
  restants: number;
};

export type MatchCenterData = {
  match: ArenaMatch;
  projection: MatchProjection | null;
  prediction: RankedPrediction | null;
  callContext: MatchCallContext;
  related: ArenaMatch[];
};
