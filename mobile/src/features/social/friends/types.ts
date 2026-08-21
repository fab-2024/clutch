export type FriendRow = {
  id: string;
  pseudo: string;
  solde?: number;
  paris?: number;
  gagnes?: number;
  tag_favori?: string | null;
  depuis?: string;
};

export type FriendsData = {
  amis: FriendRow[];
  recues: FriendRow[];
  envoyees: FriendRow[];
  weekly: CircleWeeklyData | null;
};

export type CircleWeeklyRow = {
  id: string;
  pseudo: string;
  tag_favori?: string | null;
  rang: number;
  calls: number;
  victoires: number;
  precision_pct: number | null;
  frags_hebdo: number;
  meilleur_call: number;
  frags: number;
  grade?: Record<string, unknown> | null;
  moi: boolean;
};

export type CircleWeeklyMe = Omit<CircleWeeklyRow, 'moi'> & {
  participants: number;
};

export type CircleWeeklyData = {
  saison_id: string | null;
  semaine: string;
  debut: string;
  fin: string;
  classement: CircleWeeklyRow[];
  moi: CircleWeeklyMe | null;
};

export type PlayerSearchRow = {
  id: string;
  pseudo: string;
  relation: 'aucune' | 'demande_envoyee' | 'demande_recue' | 'ami' | string;
};
