export type DuelStatus = 'en_attente' | 'accepte' | 'termine' | 'annule' | 'expire';
export type DuelChoice = 'a' | 'b';

export type DuelRow = {
  token: string;
  match_id: string;
  statut: DuelStatus;
  moi_role?: 'createur' | 'accepteur';
  createur_pseudo?: string;
  accepteur_pseudo?: string | null;
  createur_choix?: DuelChoice;
  accepteur_choix?: DuelChoice | null;
  equipe_a?: string;
  equipe_b?: string;
  tag_a?: string;
  tag_b?: string;
  jeu?: string;
  evenement?: string;
  debut?: string;
};

export type DuelMutation = {
  token: string;
  statut: DuelStatus;
  match_id?: string;
};

export type DuelInvitation = {
  token: string;
  statut: DuelStatus;
  match_id: string;
  jeu: string;
  evenement: string;
  format: number;
  debut: string;
  score_a: number | null;
  score_b: number | null;
  equipe_a: string;
  equipe_b: string;
  tag_a: string;
  tag_b: string;
  createur_pseudo: string;
  createur_choix: DuelChoice;
  createur_conviction: number | null;
  createur_multiplicateur: number | null;
  choix_oppose: DuelChoice;
  equipe_opposee: string;
  tag_oppose: string;
  accepteur_pseudo: string | null;
  accepteur_choix: DuelChoice | null;
  accepteur_conviction: number | null;
  moi_role: 'createur' | 'accepteur' | 'visiteur';
  mon_prono: {
    id: string;
    choix: DuelChoice;
    conviction: number | null;
    statut: string;
  } | null;
};

export type DuelResult = {
  token: string;
  statut: DuelStatus;
  adversaire_pseudo: string;
  moi_gagne: boolean;
  mon_statut: string;
  adversaire_statut: string;
  score_moi: number;
  score_adversaire: number;
};
