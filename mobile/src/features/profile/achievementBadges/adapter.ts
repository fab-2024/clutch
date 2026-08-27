import type { ProfileRanking } from '../types';
import {
  BADGE_IDS,
  type AchievementBadgeUnlockState,
  type AchievementCallEvent,
  type AchievementStats,
  type BadgeId,
} from './types';

const BADGE_ID_SET = new Set<string>(BADGE_IDS);
const LEGACY_SECRET_ALIASES: Record<string, BadgeId> = { contre_courant: 'countercurrent' };

export function adaptAchievementStats(
  recap: Record<string, unknown>,
  ranking: ProfileRanking,
): AchievementStats {
  const callEvents = parseCallEvents(firstDefined(recap.achievement_call_events, recap.calls_officiels));
  const openingTarget = 5;
  const officialCalls = optionalNumber(recap.paris) ?? ranking.pronostics_regles;
  const openingCalls = optionalNumber(firstDefined(recap.placements_termines, recap.placement_calls))
    ?? Math.min(openingTarget, officialCalls);
  const openingEvents = callEvents.slice(0, openingTarget);
  const openingCorrectCalls = optionalNumber(firstDefined(recap.placements_gagnes, recap.placements_corrects))
    ?? (openingEvents.length === openingTarget && openingEvents.every((event) => event.correct) ? openingTarget : 0);
  const correctCalls = optionalNumber(recap.gagnes);
  const lowestShare = correctCalls && correctCalls > 0
    ? optionalNumber(firstDefined(recap.part_min_gagnee, recap.proba_min_gagnee))
    : undefined;

  return {
    callEvents: callEvents.length ? callEvents : undefined,
    closedSeason: parseClosedSeason(recap),
    collectiveMissionsCompleted: optionalNumber(firstDefined(recap.missions_collectives_terminees, recap.missions_collectives_100)),
    correctOfficialCalls: correctCalls,
    currentSeasonCorrectCalls: optionalNumber(firstDefined(recap.calls_corrects_saison, recap.current_season_correct_calls)) ?? ranking.pronostics_gagnes,
    currentSeasonId: ranking.saison_id ?? undefined,
    currentSeasonMaxCorrectStreak: optionalNumber(firstDefined(recap.serie_correcte_saison_max, recap.plus_longue_serie_saison)),
    currentSeasonOfficialCalls: optionalNumber(firstDefined(recap.calls_saison_courante, recap.current_season_official_calls)) ?? ranking.pronostics_regles,
    distinctCompetitionsWithWin: optionalNumber(firstDefined(recap.competitions_gagnees_distinctes, recap.competitions_calls_corrects)),
    factionSeasonClosed: optionalBoolean(firstDefined(recap.saison_faction_cloturee, recap.faction_season_closed)),
    factionSeasonWeekCount: optionalNumber(firstDefined(recap.saison_faction_semaines, recap.faction_season_weeks)),
    factionSupportersGained: optionalNumber(firstDefined(recap.supporters_gagnes_faction, recap.faction_supporters_gained)),
    factionWeeklyContributionStreak: optionalNumber(firstDefined(recap.serie_semaines_faction, recap.faction_weekly_streak)),
    lowestWinningPickShare: normalizeShare(lowestShare),
    maxConsecutiveActiveWeeks: optionalNumber(recap.plus_longue_serie_semaines),
    placementCalls: openingCalls,
    placementCorrectCalls: openingCorrectCalls,
    placementTarget: openingTarget,
    resurgenceAchieved: optionalBoolean(firstDefined(recap.resurgence_obtenue, recap.resurgence_achieved)),
    synchronizedFriendCorrectStreak: optionalNumber(firstDefined(recap.serie_calls_synchrones_ami, recap.friend_synchronized_streak)),
    totalOfficialCalls: officialCalls,
    victoriousCollectiveMissions: optionalNumber(firstDefined(recap.missions_collectives_victorieuses, recap.faction_missions_won)),
  };
}

export function extractAchievementUnlockStates(recap: Record<string, unknown>) {
  const states = new Map<BadgeId, AchievementBadgeUnlockState>();
  const stored = firstDefined(recap.badges_accomplissement_obtenus, recap.achievement_badges_unlocked);

  if (Array.isArray(stored)) {
    stored.forEach((value) => {
      if (typeof value === 'string') {
        const id = normalizeBadgeId(value);
        if (id) states.set(id, { id });
        return;
      }
      if (!value || typeof value !== 'object') return;
      const record = value as Record<string, unknown>;
      const id = normalizeBadgeId(String(firstDefined(record.id, record.badge_id, record.key) ?? ''));
      if (!id) return;
      states.set(id, {
        id,
        seasonId: optionalString(firstDefined(record.seasonId, record.season_id, record.saison_id)),
        unlockedAt: optionalString(firstDefined(record.unlockedAt, record.unlocked_at, record.obtenu_le)),
      });
    });
  }

  if (Array.isArray(recap.secrets_obtenus)) {
    recap.secrets_obtenus.forEach((value) => {
      const id = normalizeBadgeId(String(value));
      if (id && !states.has(id)) states.set(id, { id });
    });
  }
  return Array.from(states.values());
}

function parseCallEvents(value: unknown): AchievementCallEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const record = candidate as Record<string, unknown>;
    const finalizedAt = optionalString(firstDefined(record.finalizedAt, record.finalized_at, record.regle_le));
    const seasonId = optionalString(firstDefined(record.seasonId, record.season_id, record.saison_id));
    const correct = optionalBoolean(firstDefined(record.correct, record.gagne, record.won));
    if (!finalizedAt || !seasonId || correct == null) return [];
    return [{
      id: optionalString(record.id) ?? `call-${index}`,
      finalizedAt,
      seasonId,
      correct,
      placement: optionalBoolean(record.placement),
      decidingSeriesTie: optionalBoolean(firstDefined(record.decidingSeriesTie, record.manche_decisive_egalite)),
      participantPickShare: normalizeShare(optionalNumber(firstDefined(record.participantPickShare, record.pick_share, record.part_choix))),
    }];
  });
}

function parseClosedSeason(recap: Record<string, unknown>) {
  const candidate = firstDefined(recap.derniere_saison_cloturee, recap.achievement_closed_season);
  if (candidate && typeof candidate === 'object') {
    const record = candidate as Record<string, unknown>;
    const id = optionalString(firstDefined(record.id, record.season_id, record.saison_id));
    const closed = optionalBoolean(firstDefined(record.closed, record.cloturee));
    if (id && closed != null) {
      return {
        id,
        activeWeeks: optionalNumber(firstDefined(record.activeWeeks, record.semaines_actives)),
        closed,
        percentile: optionalNumber(record.percentile),
        totalWeeks: optionalNumber(firstDefined(record.totalWeeks, record.nombre_semaines)),
      };
    }
  }

  const id = optionalString(firstDefined(recap.derniere_saison_id, recap.closed_season_id));
  const closed = optionalBoolean(firstDefined(recap.saison_cloturee, recap.closed_season));
  if (!id || closed == null) return undefined;
  return {
    id,
    activeWeeks: optionalNumber(firstDefined(recap.saison_semaines_actives, recap.closed_season_active_weeks)),
    closed,
    percentile: optionalNumber(firstDefined(recap.saison_percentile_final, recap.closed_season_percentile)),
    totalWeeks: optionalNumber(firstDefined(recap.saison_nombre_semaines, recap.closed_season_total_weeks)),
  };
}

function normalizeBadgeId(value: string): BadgeId | null {
  if (BADGE_ID_SET.has(value)) return value as BadgeId;
  return LEGACY_SECRET_ALIASES[value] ?? null;
}

function normalizeShare(value: number | undefined) {
  if (value == null) return undefined;
  return value > 1 ? value / 100 : value;
}

function firstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null);
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function optionalBoolean(value: unknown) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return undefined;
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}
