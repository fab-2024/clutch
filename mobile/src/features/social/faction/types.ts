export type CommunityFaction = {
  equipe_id: string;
  nom: string;
  tag: string;
  jeu: string;
  logo: string | null;
  membres: number;
  niveau_atteint: number;
  croissance_24h: number;
  croissance_7j: number;
  moi: boolean;
  dernier_evenement_id: string | null;
  dernier_evenement_niveau: number | null;
  dernier_evenement_nom: string | null;
  dernier_evenement_le: string | null;
  dernier_evenement_recompense_volts: number;
};

export type CommunityActivity = {
  user_id: string;
  pseudo: string;
  pronos_7j: number;
  gagnes_7j: number;
  rang: number;
};

export type CommunityArchive = {
  id: string;
  niveau: number;
  nom: string;
  seuil: number;
  recompense_volts: number;
  membres: number;
  cree_le: string;
};

export type CommunityMe = {
  user_id: string;
  pseudo: string;
  equipe_id: string;
  membre_depuis: string;
  pronos_depuis: number;
  mutations_vecues: number;
  pronos_7j: number;
  gagnes_7j: number;
  delta_frags_7j: number;
  rang_activite: number | null;
  total_activite: number | null;
  top_activite: CommunityActivity[];
  archives: CommunityArchive[];
  mutation_a_presenter: CommunityMutationPresentation | null;
};

export type CommunityData = {
  factions: CommunityFaction[];
  moi: CommunityMe | null;
};

export type RelicContainer = 'ampoule' | 'fiole' | 'flacon' | 'reacteur' | 'reliquaire';

export type RelicState = 'dormant' | RelicContainer | 'awakened';

export type CommunityForm = {
  state: RelicState;
  level: number;
  code: string;
  name: string;
  threshold: number;
  reward: number;
  phrase: string;
  container: RelicContainer;
  intensity: number;
  coreBottom: number;
  visualScale: number;
};

export type FactionProgress = {
  charge: number;
  level: number;
  current: CommunityForm;
  next: CommunityForm | null;
  progress: number;
  totalProgress: number;
  tierStart: number;
  objective: number;
  remaining: number;
  awakened: boolean;
  max: boolean;
};

export type CommunityMutationPresentation = {
  id: string;
  from_level: number;
  to_level: number;
  name: string;
  threshold: number;
  reward: number;
  awakened: boolean;
  occurred_at: string;
};
