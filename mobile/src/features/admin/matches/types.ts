import type { ArenaMatch } from '@/src/features/matches/types';

export type AdminMatch = ArenaMatch & {
  event_id: string;
  equipe_a_id: string;
  equipe_b_id: string;
};

export type AdminSeason = {
  id: string;
  nom: string;
  statut: 'a_venir' | 'en_cours' | 'terminee';
};

export type AdminEvent = {
  id: string;
  nom: string;
  jeu: string;
};

export type AdminTeam = {
  id: string;
  nom: string;
  tag: string;
  jeu: string;
};

export type AdminMatchData = {
  matches: AdminMatch[];
  seasons: AdminSeason[];
  events: AdminEvent[];
  teams: AdminTeam[];
};

export type CreateAdminMatchInput = {
  eventId: string;
  seasonId: string;
  teamAId: string;
  teamBId: string;
  format: 1 | 3 | 5;
  startsAt: string;
};
