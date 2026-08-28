/// <reference types="jest" />

import { act, fireEvent, render } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

import { SnackbarProvider, useSnackbar } from '../SnackbarProvider';

const mockUndo = jest.fn();

jest.mock('lucide-react-native/icons/circle-alert', () => ({ __esModule: true, default: 'CircleAlert' }));
jest.mock('lucide-react-native/icons/circle-check', () => ({ __esModule: true, default: 'CircleCheck' }));
jest.mock('lucide-react-native/icons/info', () => ({ __esModule: true, default: 'Info' }));
jest.mock('lucide-react-native/icons/x', () => ({ __esModule: true, default: 'X' }));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  const builder = { duration: () => builder, easing: () => builder };
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: identity, in: () => identity, out: () => identity, quad: identity },
    FadeInDown: builder,
    FadeOutDown: builder,
    useReducedMotion: () => true,
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));
jest.mock('@/src/lib/feedback', () => ({ selectionFeedback: jest.fn() }));

function Harness() {
  const { showSnackbar } = useSnackbar();
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        onPress={() => showSnackbar({
          action: { label: 'ANNULER', onPress: mockUndo },
          message: 'Acier brossé est équipé.',
          tone: 'success',
        })}
      >
        <Text>Afficher succès</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => showSnackbar({ duration: 2_500, message: 'Action impossible.', tone: 'error' })}
      >
        <Text>Afficher erreur</Text>
      </Pressable>
    </View>
  );
}

describe('SnackbarProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUndo.mockReset();
  });

  afterEach(() => jest.useRealTimers());

  it('announces one global message and exposes a reversible action', async () => {
    const screen = await render(<SnackbarProvider><Harness /></SnackbarProvider>);

    await fireEvent.press(screen.getByRole('button', { name: 'Afficher succès' }));

    expect(screen.getByTestId('global-snackbar')).toBeTruthy();
    expect(screen.getByText('Acier brossé est équipé.').props.accessibilityLiveRegion).toBe('polite');
    await fireEvent.press(screen.getByRole('button', { name: 'ANNULER' }));

    expect(mockUndo).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('global-snackbar')).toBeNull();
  });

  it('uses an assertive error and dismisses it after its bounded duration', async () => {
    const screen = await render(<SnackbarProvider><Harness /></SnackbarProvider>);

    await fireEvent.press(screen.getByRole('button', { name: 'Afficher erreur' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Action impossible.');

    await act(async () => jest.advanceTimersByTime(2_500));
    expect(screen.queryByTestId('global-snackbar')).toBeNull();
  });
});
