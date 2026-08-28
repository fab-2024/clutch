/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { StateView } from '../StateView';

jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: identity, out: () => identity, quad: identity },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number) => value,
  };
});

jest.mock('lucide-react-native/icons/circle-alert', () => 'CircleAlert');
jest.mock('lucide-react-native/icons/circle-check', () => 'CircleCheck');
jest.mock('lucide-react-native/icons/inbox', () => 'Inbox');

describe('StateView', () => {
  it('announces errors and exposes a retry action', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <StateView
        action={{ label: 'RÉESSAYER', onPress }}
        description="Le Match Center ne répond pas."
        testID="state"
        title="Indisponible"
        variant="error"
      />,
    );

    expect(screen.getByTestId('state').props.accessibilityLiveRegion).toBe('assertive');
    expect(screen.getByRole('alert')).toHaveTextContent('Indisponible');
    fireEvent.press(screen.getByRole('button', { name: 'RÉESSAYER' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses a polite live region for loading feedback', async () => {
    const screen = await render(<StateView testID="state" title="Chargement" variant="loading" />);

    expect(screen.getByTestId('state').props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByRole('progressbar').props.accessibilityState).toEqual({ busy: true });
    expect(screen.getByText('Chargement')).toBeTruthy();
  });
});
