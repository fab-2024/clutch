/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { PREVIEW_MATCH_CENTER } from '../MatchCenterPreviewScreen';
import { LoadingCard, PredictionZone } from '../MatchCenterSections';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('../MatchCenterScreen', () => () => null);
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: identity, out: () => identity, quad: identity },
    runOnJS: (callback: () => void) => callback,
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number) => value,
  };
});
jest.mock('expo-router', () => ({
  Redirect: () => null,
  router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock('lucide-react-native/icons/check', () => ({ __esModule: true, default: 'Check' }));
jest.mock('lucide-react-native/icons/lock', () => ({ __esModule: true, default: 'Lock' }));
jest.mock('@/src/components/ui/CurrencyIcon', () => ({ CurrencyIcon: () => null }));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => ({
  __esModule: true,
  default: () => null,
}));

describe('MatchCenterSections accessibility states', () => {
  it('exposes selection and lock timing without relying on color', async () => {
    const onSelect = jest.fn();
    const screen = await render(
      <PredictionZone
        data={PREVIEW_MATCH_CENTER}
        onSelect={onSelect}
        open
        selected={null}
      />,
    );

    const choice = screen.getByRole('button', { name: /Choisir G2 Esports/ });
    expect(choice.props.accessibilityState).toEqual({ selected: false });
    fireEvent.press(choice);
    expect(onSelect).toHaveBeenCalledWith('a');

    const timer = screen.getByRole('timer');
    expect(timer.props.accessibilityLabel).toMatch(/^Verrouillage dans /);
  });

  it('announces the Match Center skeleton as busy', async () => {
    const screen = await render(<LoadingCard />);

    expect(screen.getByRole('progressbar').props.accessibilityState).toEqual({ busy: true });
    expect(screen.getByLabelText('Chargement du Match Center')).toBeTruthy();
  });
});
