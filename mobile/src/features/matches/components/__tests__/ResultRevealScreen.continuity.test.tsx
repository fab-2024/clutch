/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import ResultRevealScreen from '../ResultRevealScreen';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({
    id: 'match-1',
    journeyEvent: 'LEC Summer',
    journeyFormat: '5',
    journeyFrom: 'match',
    journeyGame: 'lol',
    journeyScoreA: '2',
    journeyScoreB: '1',
    journeyTagA: 'G2',
    journeyTagB: 'FNC',
    journeyTeamA: 'G2 Esports',
    journeyTeamB: 'Fnatic',
  }),
}));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const transition = { delay: () => transition, duration: () => transition };
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    cancelAnimation: jest.fn(),
    Easing: { cubic: (value: number) => value, out: () => (value: number) => value },
    FadeIn: transition,
    FadeInDown: transition,
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withDelay: (_delay: number, value: number) => value,
    withRepeat: (value: number) => value,
    withTiming: (value: number) => value,
  };
});
jest.mock('react-native-safe-area-context', () => {
  const ReactNative = jest.requireActual('react-native');
  return { SafeAreaView: ReactNative.View };
});
jest.mock('@/src/components/brand/GriffLogo', () => ({ GriffLockup: () => null }));
jest.mock('@/src/components/ui/CurrencyIcon', () => ({ CurrencyIcon: () => null }));
jest.mock('@/src/features/analytics/api', () => ({ trackAnalyticsEvent: jest.fn() }));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/src/features/shop/components/CosmeticRenderer', () => ({ SupporterIdentity: () => null }));
jest.mock('@/src/lib/feedback', () => ({ errorFeedback: jest.fn(), successFeedback: jest.fn() }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ profile: null, session: null }) }));
jest.mock('@/src/providers/CosmeticsProvider', () => ({ useCosmetics: () => ({ equipped: {} }) }));
jest.mock('@/src/providers/EconomyProvider', () => ({ useEconomy: () => ({ refresh: jest.fn() }) }));
jest.mock('../../api', () => ({
  loadMatchResultReveal: jest.fn(() => new Promise(() => undefined)),
  loadNextUnseenMatchResult: jest.fn(),
  markMatchResultRevealed: jest.fn(),
}));

describe('ResultRevealScreen journey continuity', () => {
  it('keeps the fixture and score visible while the official verdict loads', async () => {
    const screen = await render(<ResultRevealScreen />);

    expect(screen.getByTestId('result-transition-loading').props.accessibilityState).toEqual({ busy: true });
    expect(screen.getByLabelText('Chargement du verdict, G2 Esports contre Fnatic')).toBeTruthy();
    expect(screen.getByText('DEPUIS MATCH CENTER')).toBeTruthy();
    expect(screen.getByText('G2')).toBeTruthy();
    expect(screen.getByText('FNC')).toBeTruthy();
    expect(screen.getByText('2 — 1')).toBeTruthy();
  });
});
