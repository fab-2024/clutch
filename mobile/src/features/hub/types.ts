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
};
