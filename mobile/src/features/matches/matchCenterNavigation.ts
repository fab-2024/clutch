import { router } from 'expo-router';

import { resolveTeamLogoUri } from '@/src/features/onboarding/teamLogos';
import { prefetchRemoteImages } from '@/src/lib/imageCache';

export type MatchCenterTarget = {
  equipe_a: string;
  equipe_b: string;
  id: string;
  logo_a?: string | null;
  logo_b?: string | null;
};

type MatchCenterNavigationOptions = {
  rivalId?: string;
  rivalPseudo?: string;
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
  { rivalId, rivalPseudo }: MatchCenterNavigationOptions = {},
) {
  warmMatchCenter(target);
  router.push({
    pathname: '/match/[id]',
    params: rivalId
      ? { id: target.id, duelRivalId: rivalId, duelRivalPseudo: rivalPseudo ?? '' }
      : { id: target.id },
  });
}

export function returnFromMatchCenter(duelToken?: string) {
  if (duelToken) {
    router.replace({ pathname: '/duel/[token]', params: { token: duelToken } });
    return;
  }

  if (router.canGoBack()) {
    router.back();
    return;
  }

  router.replace('/(tabs)/matches');
}
