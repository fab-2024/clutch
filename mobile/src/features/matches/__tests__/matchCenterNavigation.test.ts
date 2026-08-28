/// <reference types="jest" />

import { router } from 'expo-router';

import { prefetchRemoteImages } from '@/src/lib/imageCache';
import { openMatchCenter, returnFromMatchCenter, warmMatchCenter } from '../matchCenterNavigation';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(),
    prefetch: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
}));
jest.mock('@/src/lib/imageCache', () => ({
  prefetchRemoteImages: jest.fn(async () => true),
}));
jest.mock('@/src/features/onboarding/teamLogos', () => ({
  resolveTeamLogoUri: (name: string, uri?: string | null) => uri || `logo:${name}`,
}));

const back = router.back as jest.Mock;
const canGoBack = router.canGoBack as jest.Mock;
const prefetch = router.prefetch as jest.Mock;
const push = router.push as jest.Mock;
const replace = router.replace as jest.Mock;
const prefetchImages = prefetchRemoteImages as jest.Mock;

const target = {
  equipe_a: 'G2 Esports',
  equipe_b: 'Fnatic',
  id: 'match-42',
  logo_a: 'https://cdn.example/g2.png',
};

describe('returnFromMatchCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    canGoBack.mockReturnValue(true);
  });

  it('restores the previous screen when a navigation context exists', () => {
    returnFromMatchCenter();

    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('falls back to Matches when the screen was opened from a deep link', () => {
    canGoBack.mockReturnValue(false);

    returnFromMatchCenter();

    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/(tabs)/matches');
  });

  it('preserves the Duel branch regardless of stack history', () => {
    returnFromMatchCenter('duel-token');

    expect(canGoBack).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith({
      pathname: '/duel/[token]',
      params: { token: 'duel-token' },
    });
  });

  it('warms the route and team marks', () => {
    warmMatchCenter(target);

    expect(prefetch).toHaveBeenCalledWith({
      pathname: '/match/[id]',
      params: { id: 'match-42' },
    });
    expect(prefetchImages).toHaveBeenCalledWith([
      'https://cdn.example/g2.png',
      'logo:Fnatic',
    ]);
  });

  it('reuses the warm-up path before pushing the Match Center', () => {
    openMatchCenter(target, { rivalId: 'rival-1', rivalPseudo: 'Nova' });

    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith({
      pathname: '/match/[id]',
      params: {
        id: 'match-42',
        duelRivalId: 'rival-1',
        duelRivalPseudo: 'Nova',
      },
    });
  });
});
