/// <reference types="jest" />

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { EMPTY_ONBOARDING_DRAFT, writeOnboardingDraft } from '../../draft';
import OnboardingScreen from '../OnboardingScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Icon = (props: Record<string, unknown>) => React.createElement(View, props);
  return {
    Apple: Icon,
    ArrowLeft: Icon,
    ArrowRight: Icon,
    ChevronDown: Icon,
    Gamepad2: Icon,
    Mail: Icon,
    Search: Icon,
    ShieldCheck: Icon,
    Trophy: Icon,
    Users: Icon,
    X: Icon,
    Zap: Icon,
  };
});
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const transition = { duration: () => undefined };
  return {
    __esModule: true,
    default: { View },
    FadeIn: transition,
    FadeInDown: transition,
    useReducedMotion: () => true,
  };
});
jest.mock('@/src/components/layout/AppAtmosphere', () => ({ AppAtmosphere: () => null }));
jest.mock('@/src/features/profile/avatars/PlayerAvatar', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, default: () => React.createElement(View, { testID: 'player-avatar' }) };
});
jest.mock('@/src/features/social/faction/reactor/ReactorScene', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return { ReactorScene: () => React.createElement(View, { testID: 'reactor-scene' }) };
});
jest.mock('@/src/features/analytics/api', () => ({ trackAnalyticsEvent: jest.fn() }));
jest.mock('@/src/features/auth/api', () => ({ createOAuthSignInUrl: jest.fn() }));
jest.mock('@/src/lib/feedback', () => ({
  errorFeedback: jest.fn(),
  impactFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  successFeedback: jest.fn(),
}));
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({ profile: null, refreshProfile: jest.fn(), session: null, status: 'signed_out' }),
}));
jest.mock('@/src/providers/EconomyProvider', () => ({ useEconomy: () => ({ refresh: jest.fn() }) }));
jest.mock('../../api', () => ({ loadTeamOrganizations: jest.fn(async () => []), saveOnboarding: jest.fn() }));

describe('OnboardingScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('presents the three product mechanics in order', async () => {
    await writeOnboardingDraft({ ...EMPTY_ONBOARDING_DRAFT, step: 1 });
    const screen = await render(<OnboardingScreen preview />);

    await waitFor(() => expect(screen.getByText('CHOISIS TON CAMP.')).toBeTruthy());
    expect(screen.getByLabelText('Match Karmine Corp contre Gentle Mates')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByLabelText('Choisir Gentle Mates')); });
    await act(async () => { fireEvent.press(screen.getByText('Continuer')); });
    await waitFor(() => expect(screen.getByText('CHAQUE BON CALL COMPTE.')).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByText('Continuer')); });
    await waitFor(() => expect(screen.getByText('FAIS GRANDIR TA RELIQUE.')).toBeTruthy());
    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('@griff/onboarding-draft/v2');
      expect(JSON.parse(stored ?? '{}').step).toBe(3);
    });
  });

  it('uses a preview step only as the initial page and keeps the buttons interactive', async () => {
    const screen = await render(<OnboardingScreen preview previewStep={1} />);

    await waitFor(() => expect(screen.getByText('CHOISIS TON CAMP.')).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByText('Continuer')); });
    await screen.rerender(<OnboardingScreen preview previewStep={1} />);

    await waitFor(() => expect(screen.getByText('CHAQUE BON CALL COMPTE.')).toBeTruthy());
    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('@griff/onboarding-draft/v2');
      expect(JSON.parse(stored ?? '{}').step).toBe(2);
    });
  });

  it('finishes with Apple, Google, Discord and classic email options', async () => {
    const screen = await render(<OnboardingScreen preview previewStep={6} />);

    await waitFor(() => expect(screen.getByText('TA SAISON COMMENCE.')).toBeTruthy());
    expect(screen.getByText('Continuer avec Apple')).toBeTruthy();
    expect(screen.getByLabelText('Continuer avec Google')).toBeTruthy();
    expect(screen.getByLabelText('Continuer avec Discord')).toBeTruthy();
    expect(screen.getByLabelText('Continuer avec une adresse e-mail')).toBeTruthy();
    expect(screen.getByTestId('player-avatar')).toBeTruthy();
  });

  it('collects an unavailable game from the native-style game sheet', async () => {
    await writeOnboardingDraft({ ...EMPTY_ONBOARDING_DRAFT, step: 4 });
    const screen = await render(<OnboardingScreen preview />);

    await waitFor(() => expect(screen.getByText('CHOISIS TON JEU.')).toBeTruthy());
    await act(async () => { fireEvent.press(screen.getByLabelText('Je ne vois pas mon jeu')); });
    expect(screen.getByText('Trouve ton jeu')).toBeTruthy();
    await act(async () => { fireEvent.press(screen.getByText('Counter-Strike 2')); });
    await act(async () => { fireEvent.press(screen.getByText('Valider')); });

    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('@griff/onboarding-draft/v2');
      expect(JSON.parse(stored ?? '{}').missingGame).toBe('Counter-Strike 2');
    });
  });
});
