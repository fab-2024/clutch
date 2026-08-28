import { router } from 'expo-router';

import { resolveTeamLogoUri } from '@/src/features/onboarding/teamLogos';
import { prefetchRemoteImages } from '@/src/lib/imageCache';

import {
  buildMatchJourneyParams,
  type MatchJourneySource,
  type MatchJourneyTarget,
} from './matchJourney';

export type MatchCenterTarget = {
  equipe_a: string;
  equipe_b: string;
  id: string;
} & MatchJourneyTarget;

type MatchCenterNavigationOptions = {
  rivalId?: string;
  rivalPseudo?: string;
  source?: MatchJourneySource;
};

type MatchResultNavigationOptions = {
  replace?: boolean;
  source?: MatchJourneySource;
};

export function warmMatchCenter(target: MatchCenterTarget) {
  router.prefetch({ pathname: '/match/[id]', params: { id: target.id } });
  void prefetchRemoteImages([
    resolveTeamLogoUri(target.equipe_a, target.logo_a),
    resolveTeamLogoUri(target.equipe_b, target.logo_b),
  ]);
}

export function openMatchCenter(
  target: MatchCenterTarget,
  { rivalId, rivalPseudo, source = 'matches' }: MatchCenterNavigationOptions = {},
) {
  warmMatchCenter(target);
  router.push({
    pathname: '/match/[id]',
    params: {
      id: target.id,
      ...buildMatchJourneyParams(target, source),
      journeyMotion: 'arena',
      ...(rivalId ? { duelRivalId: rivalId, duelRivalPseudo: rivalPseudo ?? '' } : {}),
    },
  });
}

export function openMatchResult(
  target: MatchJourneyTarget,
  { replace = false, source = 'matches' }: MatchResultNavigationOptions = {},
) {
  const href = {
    pathname: '/result/[id]' as const,
    params: { id: target.id, ...buildMatchJourneyParams(target, source) },
  };
  if (replace) router.replace(href);
  else router.push(href);
}

export function replaceMatchCenter(
  target: MatchCenterTarget,
  source: MatchJourneySource = 'matches',
) {
  warmMatchCenter(target);
  router.replace({
    pathname: '/match/[id]',
    params: { id: target.id, ...buildMatchJourneyParams(target, source), journeyMotion: 'arena' },
  });
}

export function returnFromMatchCenter(
  duelToken?: string,
  source: MatchJourneySource = 'matches',
) {
  if (duelToken) {
    router.replace({ pathname: '/duel/[token]', params: { token: duelToken } });
    return;
  }

  if (router.canGoBack()) {
    router.back();
    return;
  }

  if (source === 'hub') {
    router.replace('/(tabs)');
    return;
  }
  if (source === 'calls') {
    router.replace({ pathname: '/(tabs)/matches', params: { view: 'calls' } });
    return;
  }
  router.replace('/(tabs)/matches');
}

export function returnFromMatchResult(
  target: MatchJourneyTarget,
  source: MatchJourneySource,
) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  if (source === 'hub') {
    router.replace('/(tabs)');
    return;
  }
  if (source === 'profile') {
    router.replace('/(tabs)/profile');
    return;
  }
  if (source === 'match') {
    router.replace({
      pathname: '/match/[id]',
      params: { id: target.id, ...buildMatchJourneyParams(target, 'matches') },
    });
    return;
  }
  if (source === 'calls') {
    router.replace({ pathname: '/(tabs)/matches', params: { view: 'calls' } });
    return;
  }
  router.replace('/(tabs)/matches');
}
