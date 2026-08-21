import type { ArenaMatch } from '@/src/features/matches/types';

export type AdminMatch = ArenaMatch & {
  event_id: string;
  equipe_a_id: string;
  equipe_b_id: string;
  motif_annulation: string | null;
  resultat_source: string | null;
  resultat_source_label: string | null;
  resultat_identifiant_externe: string | null;
  resultat_recu_le: string | null;
  resultat_regle_le: string | null;
  resultat_maj_le: string | null;
  resultat_revision: number;
  resultat_motif_correction: string | null;
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

export type AdminResultInput = {
  matchId: string;
  scoreA: number;
  scoreB: number;
  source: string;
  sourceLabel: string;
  externalId: string;
};

export type AdminResultCorrectionInput = AdminResultInput & {
  reason: string;
};

export type AdminMatchAudit = {
  id: number;
  action: 'import_historique' | 'demarrage' | 'report' | 'annulation' | 'resultat_initial' | 'correction_resultat';
  acteur_id: string | null;
  acteur_pseudo: string | null;
  source_resultat: string | null;
  identifiant_externe: string | null;
  motif: string | null;
  revision: number;
  avant: Record<string, unknown>;
  apres: Record<string, unknown>;
  cree_le: string;
};

export type AdminMatchHistory = {
  match_id: string;
  operations: AdminMatchAudit[];
};
