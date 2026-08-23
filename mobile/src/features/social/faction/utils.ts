import { COMMUNITY_FORMS, RELIC_TOTAL_AWAKENING } from './constants';
import type { CommunityMutationPresentation, FactionProgress } from './types';

export function factionProgress(members: number, _reachedLevel?: number | null): FactionProgress {
  const count = Math.max(0, Math.floor(Number(members) || 0));
  const current = COMMUNITY_FORMS.reduce(
    (form, candidate) => (count >= candidate.threshold ? candidate : form),
    COMMUNITY_FORMS[0],
  );
  const currentIndex = COMMUNITY_FORMS.indexOf(current);
  const next = currentIndex < COMMUNITY_FORMS.length - 1
    ? COMMUNITY_FORMS[currentIndex + 1]
    : null;
  const floor = current.threshold;
  const objective = next?.threshold ?? RELIC_TOTAL_AWAKENING;
  const denominator = Math.max(1, objective - floor);
  const progress = Math.max(0, Math.min(1, (count - floor) / denominator));
  const max = count >= RELIC_TOTAL_AWAKENING;

  return {
    charge: count,
    level: current.level,
    current,
    next,
    progress: max ? 1 : progress,
    totalProgress: Math.max(0, Math.min(1, count / RELIC_TOTAL_AWAKENING)),
    tierStart: floor,
    objective,
    remaining: max ? 0 : Math.max(0, objective - count),
    awakened: current.state === 'awakened',
    max,
  };
}

export function communityFormForLevel(level: number) {
  const normalized = Math.max(0, Math.min(6, Math.floor(Number(level) || 0)));
  return COMMUNITY_FORMS.find((form) => form.level === normalized) ?? COMMUNITY_FORMS[0];
}

export function shouldPresentRelicMutation(
  mutation: CommunityMutationPresentation | null | undefined,
  alreadyPlayedEventId: string | null,
) {
  if (!mutation || mutation.id === alreadyPlayedEventId) return false;
  return mutation.to_level > mutation.from_level
    && mutation.to_level >= 2
    && mutation.to_level <= 6;
}

export function gameLabel(game: string) {
  const key = String(game || '').toLowerCase();
  if (key.includes('lol') || key.includes('league')) return 'LEAGUE OF LEGENDS';
  if (key.includes('valorant')) return 'VALORANT';
  if (key.includes('cs')) return 'COUNTER-STRIKE 2';
  return String(game || 'ESPORT').toUpperCase();
}
