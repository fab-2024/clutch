import { supabase } from '@/src/lib/supabase';

import { normalizeGradeState, normalizeGradeSummary } from './grades';
import type {
  RankDashboard,
  RankLeaderboardRow,
  RankMovement,
  RankReward,
  RankRules,
  RankScope,
  RankSeason,
  RankSeasonState,
} from './types';

const SCOPES: RankScope[] = ['global', 'cercle', 'faction'];

export async function loadRankDashboard(): Promise<RankDashboard> {
  const { data, error } = await supabase.rpc('clutch_rank_dashboard_v1');
  if (error) throw error;
  const payload = asRecord(data);
  const boards = asRecord(payload.classements);
  return {
    season: normalizeSeason(payload.saison),
    state: normalizeState(payload.etat),
    leaderboards: Object.fromEntries(
      SCOPES.map((scope) => [scope, normalizeRows(boards[scope])]),
    ) as Record<RankScope, RankLeaderboardRow[]>,
    recentMovements: normalizeMovements(payload.mouvements_recents),
    rules: normalizeRules(payload.regles),
    reward: normalizeReward(payload.recompense),
  };
}

function normalizeSeason(value: unknown): RankSeason | null {
  const row = asRecord(value);
  const id = stringValue(row.id);
  if (!id) return null;
  return {
    id,
    name: stringValue(row.nom) || 'Saison active',
    startsAt: stringValue(row.debut),
    endsAt: stringValue(row.fin),
  };
}

function normalizeState(value: unknown): RankSeasonState | null {
  const row = asRecord(value);
  if (!Object.keys(row).length) return null;
  return {
    frags: numberValue(row.frags, 1000),
    peakFrags: numberValue(row.pic_frags, 1000),
    settledCalls: numberValue(row.pronostics_regles),
    wonCalls: numberValue(row.pronostics_gagnes),
    placementsRemaining: numberValue(row.placements_restants, 5),
    provisional: row.provisoire !== false,
    grade: normalizeGradeState(row.grade),
    rank: optionalNumber(row.rang),
    percentile: optionalNumber(row.percentile),
    classifiedPlayers: numberValue(row.joueurs_classes),
    bestGrade: normalizeGradeSummary(row.meilleur_grade),
    bestRank: optionalNumber(row.meilleur_rang),
  };
}

function normalizeRows(value: unknown): RankLeaderboardRow[] {
  return Array.isArray(value)
    ? value.map((item) => {
        const row = asRecord(item);
        return {
          rank: optionalNumber(row.rang),
          id: stringValue(row.id),
          pseudo: stringValue(row.pseudo) || 'Joueur',
          frags: numberValue(row.frags, 1000),
          peakFrags: numberValue(row.pic_frags, 1000),
          settledCalls: numberValue(row.pronostics_regles),
          wonCalls: numberValue(row.pronostics_gagnes),
          accuracy: numberValue(row.taux_reussite),
          provisional: row.provisoire === true,
          me: row.moi === true,
          grade: normalizeGradeState(row.grade),
        };
      }).filter((row) => Boolean(row.id))
    : [];
}

function normalizeReward(value: unknown): RankReward {
  const row = asRecord(value);
  const status = row.statut === 'intersaison' ? 'intersaison' : 'a_annoncer';
  return {
    status,
    title: stringValue(row.titre) || (status === 'intersaison' ? 'Intersaison' : 'Récompense de fin de saison'),
    detail: stringValue(row.detail) || 'La récompense sera annoncée avant la clôture de la saison.',
  };
}

function normalizeMovements(value: unknown): RankMovement[] {
  return Array.isArray(value)
    ? value.map((item) => {
        const row = asRecord(item);
        return {
          id: stringValue(row.id),
          matchId: stringValue(row.match_id),
          teamA: stringValue(row.equipe_a) || 'Équipe A',
          teamB: stringValue(row.equipe_b) || 'Équipe B',
          game: stringValue(row.jeu),
          status: row.statut === 'perdu' ? 'perdu' as const : 'gagne' as const,
          deltaFrags: numberValue(row.delta_frags),
          settledAt: stringValue(row.regle_le),
        };
      }).filter((movement) => Boolean(movement.id))
    : [];
}

function normalizeRules(value: unknown): RankRules {
  const row = asRecord(value);
  return {
    base: numberValue(row.base, 1000),
    placements: numberValue(row.placements, 5),
    placementK: numberValue(row.k_placement, 60),
    rankedK: numberValue(row.k_classe, 40),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) { return typeof value === 'string' ? value.trim() : ''; }
function numberValue(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; }
function optionalNumber(value: unknown) { if (value == null) return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
