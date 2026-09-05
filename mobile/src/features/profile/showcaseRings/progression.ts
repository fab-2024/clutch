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
  'jours_calls_distincts',
  'jours_actifs',
  'distinct_call_days',
] as const;

const COUNTERCURRENT_KEYS = [
  'calls_contre_courant_reussis',
  'calls_justes_moins_30_pct',
  'community_underdog_correct_calls',
] as const;

const CLEAN_SWEEP_KEYS = [
  'journees_carton_plein',
  'journees_parfaites_min_3',
  'perfect_call_days',
] as const;

const ASCENSION_KEYS = [
  'promotions_ligue',
  'promotions_ligues',
  'league_promotions',
] as const;

const DUELIST_KEYS = [
  'duels_gagnes',
  'duels_remportes',
  'duel_wins',
  'defis_gagnes',
] as const;

const PACT_KEYS = [
  'amis_interactions_distincts',
  'amis_actifs_distincts',
  'distinct_interacted_friends',
] as const;

const ECHO_KEYS = [
  'likes_vitrine_uniques',
  'vitrine_likes_uniques',
  'unique_showcase_likes',
] as const;

const METAMORPHOSIS_KEYS = [
  'reliques_evolution_max',
  'reliques_maximisees',
  'max_evolved_relics',
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
  const ritual = firstMetric(data.recap, RITUAL_KEYS);
  const countercurrent = firstMetric(data.recap, COUNTERCURRENT_KEYS);
  const cleanSweep = firstMetric(data.recap, CLEAN_SWEEP_KEYS);
  const ascension = firstMetric(data.recap, ASCENSION_KEYS);
  const duelist = firstMetric(data.recap, DUELIST_KEYS);
  const pact = firstMetric(data.recap, PACT_KEYS);
  const echo = firstMetric(data.recap, ECHO_KEYS);
  const metamorphosis = firstMetric(data.recap, METAMORPHOSIS_KEYS);
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
  if (family === 'ritual') return `${amount} JOUR${amount > 1 ? 'S' : ''} DE CALL`;
  if (family === 'countercurrent') return `${amount} CALL${amount > 1 ? 'S' : ''} MINORITAIRE${amount > 1 ? 'S' : ''} JUSTE${amount > 1 ? 'S' : ''}`;
  if (family === 'clean_sweep') return `${amount} JOURNÉE${amount > 1 ? 'S' : ''} PARFAITE${amount > 1 ? 'S' : ''}`;
  if (family === 'ascension') return `${amount} PROMOTION${amount > 1 ? 'S' : ''}`;
  if (family === 'duelist') return `${amount} DUEL${amount > 1 ? 'S' : ''} GAGNÉ${amount > 1 ? 'S' : ''}`;
  if (family === 'pact') return `${amount} AMI${amount > 1 ? 'S' : ''} ACTIF${amount > 1 ? 'S' : ''}`;
  if (family === 'echo') return `${formatNumber(amount)} LIKE${amount > 1 ? 'S' : ''} UNIQUE${amount > 1 ? 'S' : ''}`;
  return `${amount} RELIQUE${amount > 1 ? 'S' : ''} À L’APOGÉE`;
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
