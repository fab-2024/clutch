export type QuestPartner = { id?: string; pseudo?: string };
export type QuestMatch = { id?: string; tag_a?: string; tag_b?: string; equipe_a?: string; equipe_b?: string };
export type QuestLeague = { id?: string; nom?: string };

export type FriendQuest = {
  id: string;
  type: string;
  statut: string;
  progression: number;
  objectif: number;
  recompense_xp: number;
  recompense_volts: number;
  expire_le: string | null;
  moi_fait?: boolean;
  partenaire_fait?: boolean;
  partenaire?: QuestPartner | null;
  match?: QuestMatch | null;
  ligue?: QuestLeague | null;
};

export type DuoStreak = {
  user_id?: string;
  pseudo?: string;
  missions_terminees?: number;
  serie_semaines?: number;
};

export type FriendQuestsData = {
  actives: FriendQuest[];
  historique: FriendQuest[];
  duos: DuoStreak[];
  a_reveler: FriendQuest | null;
};
