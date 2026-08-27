/// <reference types="jest" />

import { router } from 'expo-router';

import { returnFromMatchCenter } from '../matchCenterNavigation';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(),
    replace: jest.fn(),
  },
}));

const back = router.back as jest.Mock;
const canGoBack = router.canGoBack as jest.Mock;
const replace = router.replace as jest.Mock;

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
});
