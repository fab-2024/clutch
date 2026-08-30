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

const RANK_MILESTONE: Record<string, number> = {
  bronze: 1,
  argent: 1.25,
  or: 1.6,
  platine: 2,
  diamant: 3,
  mythique: 4,
  eternel: 4,
};

const FACTION_KEYS = [
  'contribution_faction',
  'contributions_faction',
  'faction_contribution',
  'faction_contributions',
] as const;

const MAJOR_KEYS = [
  'accomplissements_majeurs',
  'majeurs_valides',
  'major_achievements',
  'major_points',
] as const;

const SENIORITY_KEYS = [
  'saisons_terminees',
  'periodes_terminees',
  'completed_seasons',
  'completed_periods',
] as const;

export function adaptShowcaseRingStats(
  data: ProfileData | null | undefined,
  now = new Date(),
): ShowcaseRingStats {
  if (!data) return emptyStats();

  const faction = firstMetric(data.recap, FACTION_KEYS);
  const major = firstMetric(data.recap, MAJOR_KEYS);
  const seniority = firstMetric(data.recap, SENIORITY_KEYS);
  const derivedMajor = data.badges.filter((badge) => badge.obtained && /majeur|major/i.test(badge.family)).length;
  const derivedPeriods = completedPeriods(data.createdAt, now);

  return {
    rank: { source: 'profile', value: rankMetric(data) },
    streak: { source: 'profile', value: Math.max(0, Math.trunc(data.currentStreak)) },
    faction: faction ?? { source: 'missing', value: 0 },
    major: major ?? (derivedMajor > 0
      ? { source: 'derived', value: derivedMajor }
      : { source: 'missing', value: 0 }),
    seniority: seniority ?? {
      source: derivedPeriods > 0 ? 'derived' : 'missing',
      value: derivedPeriods,
    },
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
  if (family === 'rank') return `NIVEAU ${Math.min(5, Math.max(1, Math.floor(value)))}`;
  if (family === 'streak') return `${amount} J${amount > 1 ? 'OURS' : 'OUR'}`;
  if (family === 'faction') return `${formatNumber(amount)} CONTRIBUTION${amount > 1 ? 'S' : ''}`;
  if (family === 'major') return `${amount} ACCOMPLISSEMENT${amount > 1 ? 'S' : ''}`;
  return `${amount} PÉRIODE${amount > 1 ? 'S' : ''}`;
}

function emptyStats(): ShowcaseRingStats {
  const empty: ShowcaseRingMetric = { source: 'missing', value: 0 };
  return {
    rank: empty,
    streak: empty,
    faction: empty,
    major: empty,
    seniority: empty,
  };
}

function firstMetric(
  recap: Record<string, unknown>,
  keys: readonly string[],
): ShowcaseRingMetric | null {
  for (const key of keys) {
    const numeric = Number(recap[key]);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return { source: 'profile', value: numeric };
    }
  }
  return null;
}

function rankMetric(data: ProfileData) {
  const grade = data.ranking.grade;
  if ((data.ranking.percentile ?? 101) <= 1) return 5;
  const base = RANK_MILESTONE[grade.cle ?? ''] ?? 1;
  return Math.min(4.99, base + clamp(grade.progression, 0, 0.99) * 0.96);
}

function completedPeriods(createdAt: string, now: Date) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 0;
  const elapsedDays = Math.max(0, (now.getTime() - created.getTime()) / 86_400_000);
  return Math.floor(elapsedDays / 90);
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
