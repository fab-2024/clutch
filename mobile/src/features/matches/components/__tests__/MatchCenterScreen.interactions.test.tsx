/// <reference types="jest" />

import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { submitRankedPrediction } from '../../api';
import { PREVIEW_MATCH_CENTER } from '../MatchCenterPreviewScreen';
import MatchCenterScreen from '../MatchCenterScreen';
import {
  errorFeedback,
  impactFeedback,
  selectionFeedback,
  successFeedback,
} from '@/src/lib/feedback';

const mockLoad = jest.fn(async () => undefined);

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('lucide-react-native/icons/check', () => ({ __esModule: true, default: 'Check' }));
jest.mock('lucide-react-native/icons/circle-alert', () => ({ __esModule: true, default: 'CircleAlert' }));
jest.mock('lucide-react-native/icons/circle-check', () => ({ __esModule: true, default: 'CircleCheck' }));
jest.mock('lucide-react-native/icons/inbox', () => ({ __esModule: true, default: 'Inbox' }));
jest.mock('lucide-react-native/icons/lock', () => ({ __esModule: true, default: 'Lock' }));
jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: {
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({}),
}));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  const animation = { delay: () => animation, duration: () => animation };
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: identity, out: () => identity, quad: identity },
    FadeIn: animation,
    FadeInDown: animation,
    runOnJS: (callback: () => void) => callback,
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number, _config: object, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return value;
    },
  };
});
jest.mock('react-native-safe-area-context', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    SafeAreaView: ReactNative.View,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});
jest.mock('@/src/components/brand/GriffLogo', () => ({ GriffLockup: () => null }));
jest.mock('@/src/components/ui/CurrencyIcon', () => ({ CurrencyIcon: () => null }));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/src/features/analytics/api', () => ({
  trackAnalyticsEvent: jest.fn(async () => undefined),
}));
jest.mock('@/src/features/social/duels/api', () => ({ createDuel: jest.fn() }));
jest.mock('@/src/lib/feedback', () => ({
  errorFeedback: jest.fn(),
  impactFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  successFeedback: jest.fn(),
}));
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({ session: { user: { id: 'preview-user' } } }),
}));
jest.mock('@/src/providers/EconomyProvider', () => ({
  useEconomy: () => ({ refresh: jest.fn(async () => undefined) }),
}));
jest.mock('../../api', () => ({ submitRankedPrediction: jest.fn() }));
jest.mock('../../hooks/useMatchCenterData', () => ({
  useMatchCenterData: ({ previewData }: { previewData: unknown }) => ({
    data: previewData,
    error: null,
    load: mockLoad,
    loading: false,
    refreshing: false,
  }),
}));
jest.mock('../MatchCenterSections', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  const Empty = () => null;
  return {
    CallContract: Empty,
    HeroTeam: Empty,
    LoadingCard: Empty,
    LockedPrediction: Empty,
    PredictionZone: ({
      onSelect,
      selected,
    }: {
      onSelect: (choice: 'a' | 'b') => void;
      selected: 'a' | 'b' | null;
    }) => React.createElement(
      ReactNative.Pressable,
      {
        accessibilityLabel: 'Choisir G2 Esports',
        accessibilityRole: 'button',
        accessibilityState: { selected: selected === 'a' },
        onPress: () => onSelect('a'),
      },
      React.createElement(ReactNative.Text, null, 'G2'),
    ),
    ProbabilityBar: Empty,
    ProjectionMeta: Empty,
    RelatedMatches: Empty,
    formatMatchDate: () => 'DEMAIN',
    formatTime: () => '20:00',
  };
});
jest.mock('../MatchArenaHero', () => ({ MatchArenaHero: () => null }));
jest.mock('../PredictionConfirmationSheet', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  return {
    PredictionConfirmationSheet: ({
      error,
      onChangeChoice,
      onClose,
      onClosed,
      onConfirm,
      submitting,
      teamName,
      visible,
    }: {
      error?: string | null;
      onChangeChoice: () => void;
      onClose: () => void;
      onClosed?: () => void;
      onConfirm: () => void;
      submitting: boolean;
      teamName: string;
      visible: boolean;
    }) => visible ? React.createElement(
      ReactNative.View,
      { accessibilityViewIsModal: true, testID: 'prediction-confirmation-sheet' },
      React.createElement(ReactNative.Text, null, teamName),
      error ? React.createElement(ReactNative.Text, null, error) : null,
      React.createElement(
        ReactNative.Pressable,
        {
          accessibilityLabel: 'Fermer Verrouiller ce call ?',
          accessibilityRole: 'button',
          disabled: submitting,
          onPress: () => {
            onClose();
            onClosed?.();
          },
        },
      ),
      React.createElement(ReactNative.Pressable, {
        disabled: submitting,
        onPress: onConfirm,
        testID: 'prediction-lock-confirm',
      }),
      React.createElement(ReactNative.Pressable, {
        disabled: submitting,
        onPress: () => {
          onChangeChoice();
          onClosed?.();
        },
        testID: 'prediction-change-choice',
      }),
    ) : null,
  };
});

const submitPrediction = submitRankedPrediction as jest.MockedFunction<typeof submitRankedPrediction>;
const playErrorFeedback = errorFeedback as jest.Mock;
const playImpactFeedback = impactFeedback as jest.Mock;
const playSelectionFeedback = selectionFeedback as jest.Mock;
const playSuccessFeedback = successFeedback as jest.Mock;

async function renderOpenMatch() {
  return await render(<MatchCenterScreen previewData={PREVIEW_MATCH_CENTER} />);
}

async function chooseG2(screen: Awaited<ReturnType<typeof renderOpenMatch>>) {
  const choice = screen.getByLabelText(/Choisir G2 Esports/);
  await waitFor(() => {
    expect(choice.props.accessibilityState).toEqual({ selected: false });
  });
  fireEvent.press(choice);
  await waitFor(() => {
    expect(screen.getByLabelText(/Choisir G2 Esports/).props.accessibilityState).toEqual({ selected: true });
  });
}

async function openReview(screen: Awaited<ReturnType<typeof renderOpenMatch>>) {
  fireEvent.press(screen.getByTestId('prediction-review-trigger'));
  await waitFor(() => {
    expect(screen.getByTestId('prediction-confirmation-sheet')).toBeTruthy();
  });
}

describe('MatchCenterScreen prediction confirmation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    submitPrediction.mockResolvedValue(null);
  });

  it('reviews the choice in a universal sheet and keeps it when the sheet is dismissed', async () => {
    const screen = await renderOpenMatch();

    await chooseG2(screen);
    expect(playSelectionFeedback).toHaveBeenCalledTimes(1);

    await openReview(screen);
    expect(screen.getByText('G2 Esports')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Fermer Verrouiller ce call ?' }));

    await waitFor(() => {
      expect(screen.queryByTestId('prediction-confirmation-sheet')).toBeNull();
    });
    expect(screen.getByTestId('prediction-review-trigger')).toBeTruthy();
  });

  it('provides a recoverable empty state for an incomplete match link', async () => {
    const replace = jest.requireMock('expo-router').router.replace as jest.Mock;
    const screen = await render(<MatchCenterScreen />);

    expect(screen.getByText('Match introuvable')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'RETOUR AUX MATCHS' }));
    expect(replace).toHaveBeenCalledWith('/(tabs)/matches');
  });

  it('locks the selected team once and closes after success', async () => {
    const screen = await renderOpenMatch();

    await chooseG2(screen);
    await openReview(screen);
    await act(async () => {
      fireEvent.press(screen.getByTestId('prediction-lock-confirm'));
    });

    await waitFor(() => {
      expect(submitPrediction).toHaveBeenCalledWith('preview-open-g2-fnc', 'a');
      expect(mockLoad).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('prediction-confirmation-sheet')).toBeNull();
    });
    expect(playImpactFeedback).toHaveBeenCalledTimes(1);
    expect(playSuccessFeedback).toHaveBeenCalledTimes(1);
    expect(playErrorFeedback).not.toHaveBeenCalled();
  });

  it('keeps the review open and explains an API rejection', async () => {
    submitPrediction.mockRejectedValueOnce(new Error('Le marché vient de fermer.'));
    const screen = await renderOpenMatch();

    await chooseG2(screen);
    await openReview(screen);
    await act(async () => {
      fireEvent.press(screen.getByTestId('prediction-lock-confirm'));
    });

    await waitFor(() => {
      expect(screen.getAllByText('Le marché vient de fermer.')).not.toHaveLength(0);
    });
    expect(screen.getByTestId('prediction-confirmation-sheet')).toBeTruthy();
    expect(playErrorFeedback).toHaveBeenCalledTimes(1);
    expect(playSuccessFeedback).not.toHaveBeenCalled();
  });

  it('clears the ticket when the player explicitly changes choice', async () => {
    const screen = await renderOpenMatch();

    await chooseG2(screen);
    await openReview(screen);
    fireEvent.press(screen.getByTestId('prediction-change-choice'));

    await waitFor(() => {
      expect(screen.queryByTestId('prediction-confirmation-sheet')).toBeNull();
      expect(screen.queryByTestId('prediction-review-trigger')).toBeNull();
    });
  });
});
