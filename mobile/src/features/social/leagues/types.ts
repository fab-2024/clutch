export type LeagueSummary = {
  id: string;
  nom: string;
  code: string;
  createur_id: string;
  cree_le: string;
  nb_membres: number;
};

export type GlobalRankRow = {
  rang: number;
  id: string;
  pseudo: string;
  frags: number;
  pic_frags: number;
  pronostics_regles: number;
  pronostics_gagnes: number;
  taux_reussite: number | null;
  provisoire: boolean;
  moi: boolean;
};
