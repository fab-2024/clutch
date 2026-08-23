import type { SeasonalGradeState, SeasonalGradeSummary } from './grades';

export type RankSeason = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
};

export type RankSeasonState = {
  frags: number;
  peakFrags: number;
  settledCalls: number;
  wonCalls: number;
  placementsRemaining: number;
  provisional: boolean;
  grade: SeasonalGradeState;
  rank: number | null;
  percentile: number | null;
  classifiedPlayers: number;
  bestGrade: SeasonalGradeSummary | null;
  bestRank: number | null;
};

export type RankLeaderboardRow = {
  rank: number | null;
  id: string;
  pseudo: string;
  frags: number;
  peakFrags: number;
  settledCalls: number;
  wonCalls: number;
  accuracy: number;
  provisional: boolean;
  me: boolean;
  grade: SeasonalGradeState;
};

export type RankScope = 'global' | 'cercle' | 'faction';

export type RankReward = {
  status: 'a_annoncer' | 'intersaison';
  title: string;
  detail: string;
};

export type RankMovement = {
  id: string;
  matchId: string;
  teamA: string;
  teamB: string;
  game: string;
  status: 'gagne' | 'perdu';
  deltaFrags: number;
  settledAt: string;
};

export type RankRules = {
  base: number;
  placements: number;
  placementK: number;
  rankedK: number;
};

export type RankDashboard = {
  season: RankSeason | null;
  state: RankSeasonState | null;
  leaderboards: Record<RankScope, RankLeaderboardRow[]>;
  recentMovements: RankMovement[];
  rules: RankRules;
  reward: RankReward;
};
