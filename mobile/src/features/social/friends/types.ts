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
};

export type PlayerSearchRow = {
  id: string;
  pseudo: string;
  relation: 'aucune' | 'demande_envoyee' | 'demande_recue' | 'ami' | string;
};
