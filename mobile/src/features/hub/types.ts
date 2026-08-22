import type { SeasonalGradeState, SeasonalGradeSummary } from '@/src/features/ranking/grades';

export type FragsState = {
  frags: number;
  pic_frags: number;
  pronostics_regles: number;
  pronostics_gagnes: number;
  placements_restants: number;
  provisoire: boolean;
  grade: SeasonalGradeState;
  rang: number | null;
  percentile: number | null;
  joueurs_classes: number;
  meilleur_grade: SeasonalGradeSummary | null;
  meilleur_rang: number | null;
};

export type HubMatch = {
  id: string;
  debut: string;
  jeu: string;
  equipe_a: string;
  tag_a: string;
  equipe_b: string;
  tag_b: string;
  evenement: string;
  format: number;
  statut: string;
};

export type HubPrediction = {
  matchId: string;
  choice: 'a' | 'b';
};

export type HubFaction = {
  equipeId: string;
  nom: string;
  tag: string;
  jeu: string;
  membres: number;
  niveauAtteint: number;
  croissance24h: number;
};

export type HubRecentResult = {
  id: string;
  matchId: string;
  status: 'gagne' | 'perdu';
  choice: 'a' | 'b';
  deltaFrags: number;
  resolvedAt: string;
  game: string;
  event: string;
  teamA: string;
  tagA: string;
  teamB: string;
  tagB: string;
  scoreA: number | null;
  scoreB: number | null;
};

export type HubFactionMission = {
  id: string;
  title: string;
  goal: number;
  progress: number;
  personalContribution: number;
  startsAt: string;
  endsAt: string;
  completed: boolean;
  participants: number;
  team: { id: string; name: string; tag: string; logo: string | null };
};

export type HubReward = {
  id: string;
  name: string;
  family: string | null;
  slot: string;
  rarity: string;
  styleKey: string | null;
  accent: string;
  source: string;
  acquiredAt: string;
};

export type HubData = {
  seasonId: string | null;
  seasonName: string | null;
  frags: FragsState | null;
  streak: number;
  nextMatch: HubMatch | null;
  upNext: HubMatch[];
  nextMatchPrediction: HubPrediction | null;
  predictionsToday: number;
  leagueCount: number;
  faction: HubFaction | null;
  recentResult: HubRecentResult | null;
  factionMission: HubFactionMission | null;
  latestReward: HubReward | null;
};
