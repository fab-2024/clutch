export type DuelRow = {
  token: string;
  match_id: string;
  statut: string;
  moi_role?: string;
  createur_pseudo?: string;
  accepteur_pseudo?: string | null;
  createur_choix?: 'a' | 'b';
  accepteur_choix?: 'a' | 'b' | null;
  equipe_a?: string;
  equipe_b?: string;
  tag_a?: string;
  tag_b?: string;
  jeu?: string;
  evenement?: string;
  debut?: string;
};
