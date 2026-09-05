import type { ProfileData } from '../types';
import { SHOWCASE_RING_CATALOG } from './catalog';
import {
  SHOWCASE_RING_FAMILIES,
  type EquippedShowcaseRing,
  type ShowcaseRingFamily,
  type ShowcaseRingMetric,
  type ShowcaseRingProgress,
  type ShowcaseRingStats,
} from './types';

const CORRECT_STREAK_KEYS = [
  'serie_correcte_saison_max',
  'plus_longue_serie_saison',
  'plus_longue_serie',
] as const;

const INVITED_FRIEND_KEYS = [
  'amis_invites',
  'invitations_amis_acceptees',
  'friends_invited',
  'accepted_friend_invites',
] as const;

const CORRECT_CALL_KEYS = [
  'gagnes',
  'calls_corrects',
  'correct_official_calls',
] as const;

const SENIORITY_YEAR_KEYS = [
  'annees_anciennete',
  'completed_years',
] as const;

const RITUAL_KEYS = [
  'plus_longue_serie_semaines',
  'semaines_actives_consecutives',
  'max_consecutive_active_weeks',
] as const;

const COUNTERCURRENT_KEYS = [
  'calls_contre_courant_reussis',
  'outsiders_250_gagnes',
  'countercurrent_wins',
  'contrarian_correct_calls',
] as const;

const CLEAN_SWEEP_KEYS = [
  'placements_gagnes',
  'placements_corrects',
  'placement_correct_calls',
] as const;

const ASCENSION_KEYS = [
  'competitions_gagnees_distinctes',
  'competitions_calls_corrects',
  'distinct_competitions_with_win',
] as const;

const DUELIST_KEYS = [
  'duels_gagnes',
  'duels_remportes',
  'duel_wins',
  'defis_gagnes',
] as const;

const PACT_KEYS = [
  'serie_calls_synchrones_ami',
  'calls_synchronises_reussis',
  'friend_synchronized_streak',
] as const;

const ECHO_KEYS = [
  'paris',
  'calls_officiels',
  'total_official_calls',
] as const;

const METAMORPHOSIS_KEYS = [
  'resurgences',
  'retours_reussis',
  'resurgence_count',
] as const;

export function adaptShowcaseRingStats(
  data: ProfileData | null | undefined,
  now = new Date(),
): ShowcaseRingStats {
  if (!data) return emptyStats();

  const rank = closedSeasonPerformance(data.recap);
  const streak = firstMetric(data.recap, CORRECT_STREAK_KEYS);
  const invitedFriends = firstMetric(data.recap, INVITED_FRIEND_KEYS);
  const correctCalls = firstMetric(data.recap, CORRECT_CALL_KEYS);
  const seniority = firstMetric(data.recap, SENIORITY_YEAR_KEYS);
  const ritual = firstMetric(data.recap, RITUAL_KEYS)
    ?? achievementProgress(data, 'zero_chronicle', 1);
  const countercurrent = firstMetric(data.recap, COUNTERCURRENT_KEYS)
    ?? achievementProgress(data, 'countercurrent', 1, false);
  const cleanSweep = firstMetric(data.recap, CLEAN_SWEEP_KEYS)
    ?? achievementProgress(data, 'perfect_eclipse', 5);
  const ascension = firstMetric(data.recap, ASCENSION_KEYS)
    ?? achievementProgress(data, 'versatile', 5);
  const duelist = firstMetric(data.recap, DUELIST_KEYS);
  const pact = firstMetric(data.recap, PACT_KEYS)
    ?? achievementProgress(data, 'synchrony', 3);
  const rankedOfficialCalls = Number(data.ranking.pronostics_regles);
  const echo = firstMetric(data.recap, ECHO_KEYS)
    ?? (Number.isFinite(rankedOfficialCalls)
      ? { source: 'profile' as const, value: Math.max(0, rankedOfficialCalls) }
      : null);
  const metamorphosis = firstMetric(data.recap, METAMORPHOSIS_KEYS)
    ?? booleanMetric(data.recap.resurgence_obtenue ?? data.recap.resurgence_achieved)
    ?? achievementProgress(data, 'resurgence', 1, false);
  const derivedYears = completedYears(data.createdAt, now);

  return {
    rank: rank ?? { source: 'missing', value: 0 },
    streak: streak ?? { source: 'missing', value: 0 },
    faction: invitedFriends ?? { source: 'missing', value: 0 },
    major: correctCalls ?? { source: 'missing', value: 0 },
    seniority: seniority ?? {
      source: derivedYears > 0 ? 'derived' : 'missing',
      value: derivedYears,
    },
    ritual: ritual ?? { source: 'missing', value: 0 },
    countercurrent: countercurrent ?? { source: 'missing', value: 0 },
    clean_sweep: cleanSweep ?? { source: 'missing', value: 0 },
    ascension: ascension ?? { source: 'missing', value: 0 },
    duelist: duelist ?? { source: 'missing', value: 0 },
    pact: pact ?? { source: 'missing', value: 0 },
    echo: echo ?? { source: 'missing', value: 0 },
    metamorphosis: metamorphosis ?? { source: 'missing', value: 0 },
  };
}

export function resolveShowcaseRingProgress(
  stats: ShowcaseRingStats,
  family: ShowcaseRingFamily,
  equippedFamily: ShowcaseRingFamily | null = null,
): ShowcaseRingProgress {
  const definition = SHOWCASE_RING_CATALOG[family];
  const value = Math.max(0, stats[family].value);
  const unlocked = definition.stages.filter((stage) => value >= stage.condition.threshold);
  const current = unlocked.at(-1) ?? null;
  const display = current ?? definition.stages[0];
  const next = definition.stages.find((stage) => value < stage.condition.threshold) ?? null;

  return {
    availability: !current ? 'locked' : equippedFamily === family ? 'equipped' : 'unlocked',
    current,
    definition,
    display,
    family,
    next,
    progress: progressBetween(value, current?.condition.threshold ?? 0, next?.condition.threshold),
    unlockedStages: unlocked.length,
    value,
  };
}

export function resolveAllShowcaseRings(
  stats: ShowcaseRingStats,
  equippedFamily: ShowcaseRingFamily | null = null,
) {
  return SHOWCASE_RING_FAMILIES.map((family) => (
    resolveShowcaseRingProgress(stats, family, equippedFamily)
  ));
}

export function resolveEquippedShowcaseRing(
  stats: ShowcaseRingStats,
  family: ShowcaseRingFamily | null,
): EquippedShowcaseRing | null {
  if (!family) return null;
  const progress = resolveShowcaseRingProgress(stats, family, family);
  if (!progress.current) return null;
  return {
    accent: progress.definition.accent,
    asset: progress.current.assets.full,
    family,
    familyName: progress.definition.name,
    name: progress.current.name,
    stage: progress.current.stage,
  };
}

export function showcaseRingMetricLabel(family: ShowcaseRingFamily, value: number) {
  const amount = Math.max(0, Math.floor(value));
  if (family === 'rank') return `TOP ${formatPercent(Math.max(0, 100 - value))} %`;
  if (family === 'streak') return `${formatNumber(amount)} CALL${amount > 1 ? 'S' : ''} CONSÉCUTIF${amount > 1 ? 'S' : ''}`;
  if (family === 'faction') return `${formatNumber(amount)} AMI${amount > 1 ? 'S' : ''} INVITÉ${amount > 1 ? 'S' : ''}`;
  if (family === 'major') return `${formatNumber(amount)} CALL${amount > 1 ? 'S' : ''} JUSTE${amount > 1 ? 'S' : ''}`;
  if (family === 'seniority') return `${amount} AN${amount > 1 ? 'S' : ''}`;
  if (family === 'ritual') return `${amount} SEMAINE${amount > 1 ? 'S' : ''} ACTIVE${amount > 1 ? 'S' : ''}`;
  if (family === 'countercurrent') return `${amount} CONTRE-COURANT${amount > 1 ? 'S' : ''}`;
  if (family === 'clean_sweep') return `${amount}/5 CALLS DE PLACEMENT`;
  if (family === 'ascension') return `${amount} COMPÉTITION${amount > 1 ? 'S' : ''}`;
  if (family === 'duelist') return `${amount} DUEL${amount > 1 ? 'S' : ''} GAGNÉ${amount > 1 ? 'S' : ''}`;
  if (family === 'pact') return `${amount} CALL${amount > 1 ? 'S' : ''} SYNCHRONISÉ${amount > 1 ? 'S' : ''}`;
  if (family === 'echo') return `${formatNumber(amount)} CALL${amount > 1 ? 'S' : ''} OFFICIEL${amount > 1 ? 'S' : ''}`;
  return `${amount} RETOUR${amount > 1 ? 'S' : ''} RÉUSSI${amount > 1 ? 'S' : ''}`;
}

function emptyStats(): ShowcaseRingStats {
  const empty: ShowcaseRingMetric = { source: 'missing', value: 0 };
  return {
    rank: empty,
    streak: empty,
    faction: empty,
    major: empty,
    seniority: empty,
    ritual: empty,
    countercurrent: empty,
    clean_sweep: empty,
    ascension: empty,
    duelist: empty,
    pact: empty,
    echo: empty,
    metamorphosis: empty,
  };
}

function firstMetric(
  recap: Record<string, unknown>,
  keys: readonly string[],
): ShowcaseRingMetric | null {
  for (const key of keys) {
    const value = recap[key];
    if (value == null || value === '') continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return { source: 'profile', value: numeric };
    }
  }
  return null;
}

function achievementProgress(
  data: ProfileData,
  id: ProfileData['badges'][number]['id'],
  obtainedValue: number,
  useProgress = true,
): ShowcaseRingMetric | null {
  const badge = data.badges.find((candidate) => candidate.id === id);
  if (!badge) return null;
  if (useProgress && badge.progress && Number.isFinite(badge.progress.current)) {
    return { source: 'derived', value: Math.max(0, badge.progress.current) };
  }
  return badge.obtained ? { source: 'derived', value: obtainedValue } : null;
}

function booleanMetric(value: unknown): ShowcaseRingMetric | null {
  if (value === true || value === 'true' || value === 1 || value === '1') {
    return { source: 'profile', value: 1 };
  }
  if (value === false || value === 'false' || value === 0 || value === '0') {
    return { source: 'profile', value: 0 };
  }
  return null;
}

function closedSeasonPerformance(recap: Record<string, unknown>): ShowcaseRingMetric | null {
  const nested = recap.derniere_saison_cloturee ?? recap.achievement_closed_season;
  if (nested && typeof nested === 'object') {
    const season = nested as Record<string, unknown>;
    const closed = season.closed ?? season.cloturee;
    const percentile = Number(season.percentile);
    if ((closed === true || closed === 'true' || closed === 1) && Number.isFinite(percentile)) {
      return { source: 'profile', value: clamp(100 - percentile, 0, 100) };
    }
  }

  const closed = recap.saison_cloturee ?? recap.closed_season;
  const percentile = Number(recap.saison_percentile_final ?? recap.closed_season_percentile);
  return (closed === true || closed === 'true' || closed === 1) && Number.isFinite(percentile)
    ? { source: 'profile', value: clamp(100 - percentile, 0, 100) }
    : null;
}

function completedYears(createdAt: string, now: Date) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  let years = now.getUTCFullYear() - created.getUTCFullYear();
  const anniversaryPending = now.getUTCMonth() < created.getUTCMonth()
    || (now.getUTCMonth() === created.getUTCMonth() && now.getUTCDate() < created.getUTCDate());
  if (anniversaryPending) years -= 1;
  return Math.max(0, years);
}

function progressBetween(value: number, start: number, end?: number) {
  if (end == null) return 1;
  if (end <= start) return value >= end ? 1 : 0;
  return clamp((value - start) / (end - start), 0, 1);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
}
