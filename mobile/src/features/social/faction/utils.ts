import { COMMUNITY_FORMS } from './constants';
import type { FactionProgress } from './types';

const OCEAN_SATURATION = 10_000;

export function factionProgress(members: number, reachedLevel?: number | null): FactionProgress {
  const count = Math.max(0, Math.floor(Number(members) || 0));
  const derivedLevel = COMMUNITY_FORMS.reduce(
    (level, form) => (count >= form.threshold ? form.level : level),
    1,
  );
  const persisted = Number(reachedLevel);
  const level = Number.isFinite(persisted)
    ? Math.max(1, Math.min(COMMUNITY_FORMS.length, Math.floor(persisted)))
    : derivedLevel;

  const current = COMMUNITY_FORMS[level - 1];
  const next = level < COMMUNITY_FORMS.length ? COMMUNITY_FORMS[level] : null;
  const floor = current.threshold;
  const objective = next?.threshold ?? OCEAN_SATURATION;
  const denominator = Math.max(1, objective - floor);
  const progress = Math.max(0, Math.min(1, (count - floor) / denominator));
  const max = level === COMMUNITY_FORMS.length && count >= OCEAN_SATURATION;

  return {
    level,
    current,
    next,
    progress: max ? 1 : progress,
    objective,
    remaining: max ? 0 : Math.max(0, objective - count),
    max,
  };
}

export function gameLabel(game: string) {
  const key = String(game || '').toLowerCase();
  if (key.includes('lol') || key.includes('league')) return 'LEAGUE OF LEGENDS';
  if (key.includes('valorant')) return 'VALORANT';
  if (key.includes('cs')) return 'COUNTER-STRIKE 2';
  return String(game || 'ESPORT').toUpperCase();
}
