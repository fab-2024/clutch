/// <reference types="jest" />

import { router } from 'expo-router';

import { prefetchRemoteImages } from '@/src/lib/imageCache';
import {
  openMatchCenter,
  openMatchResult,
  replaceMatchCenter,
  returnFromMatchCenter,
  returnFromMatchResult,
  warmMatchCenter,
} from '../matchCenterNavigation';

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
  evenement: 'LEC Summer',
  format: 5,
  id: 'match-42',
  jeu: 'lol',
  logo_a: 'https://cdn.example/g2.png',
  tag_a: 'G2',
  tag_b: 'FNC',
};

const journeyParams = {
  journeyEvent: 'LEC Summer',
  journeyFormat: '5',
  journeyFrom: 'matches',
  journeyGame: 'lol',
  journeyTagA: 'G2',
  journeyTagB: 'FNC',
  journeyTeamA: 'G2 Esports',
  journeyTeamB: 'Fnatic',
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
        ...journeyParams,
        duelRivalId: 'rival-1',
        duelRivalPseudo: 'Nova',
      },
    });
  });

  it('preserves the journey snapshot when replacing a related Match Center', () => {
    replaceMatchCenter(target, 'hub');

    expect(prefetch).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith({
      pathname: '/match/[id]',
      params: {
        id: 'match-42',
        ...journeyParams,
        journeyFrom: 'hub',
      },
    });
  });

  it('opens and replaces a result with its origin and match snapshot', () => {
    openMatchResult({ ...target, score_a: 2, score_b: 1 }, { source: 'match' });
    openMatchResult({ id: 'match-next' }, { replace: true, source: 'system' });

    expect(push).toHaveBeenCalledWith({
      pathname: '/result/[id]',
      params: {
        id: 'match-42',
        ...journeyParams,
        journeyFrom: 'match',
        journeyScoreA: '2',
        journeyScoreB: '1',
      },
    });
    expect(replace).toHaveBeenCalledWith({
      pathname: '/result/[id]',
      params: { id: 'match-next', journeyFrom: 'system' },
    });
  });

  it('returns a replay to its source and provides a deep-link fallback', () => {
    returnFromMatchResult(target, 'profile');
    expect(back).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();
    canGoBack.mockReturnValue(false);
    returnFromMatchResult(target, 'profile');

    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/(tabs)/profile');
  });
});
