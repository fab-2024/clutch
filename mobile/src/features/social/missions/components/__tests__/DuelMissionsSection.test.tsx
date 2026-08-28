/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { EMPTY_FRIEND_MISSIONS_FIXTURE, FRIEND_MISSIONS_FIXTURE } from '../../testing/fixtures';
import { DuelMissionsSection } from '../DuelMissionsSection';

jest.mock('lucide-react-native/icons/chevron-right', () => ({ __esModule: true, default: 'ChevronRight' }));
jest.mock('lucide-react-native/icons/circle-alert', () => ({ __esModule: true, default: 'CircleAlert' }));
jest.mock('lucide-react-native/icons/circle-check', () => ({ __esModule: true, default: 'CircleCheck' }));
jest.mock('lucide-react-native/icons/inbox', () => ({ __esModule: true, default: 'Inbox' }));
jest.mock('lucide-react-native/icons/zap', () => ({ __esModule: true, default: 'Zap' }));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    cancelAnimation: jest.fn(),
    Easing: { cubic: (value: number) => value, inOut: () => (value: number) => value, out: () => (value: number) => value, quad: (value: number) => value },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withRepeat: (value: number) => value,
    withTiming: (value: number) => value,
  };
});

describe('DuelMissionsSection', () => {
  it('announces its loading skeleton as busy', async () => {
    const screen = await render(
      <DuelMissionsSection
        data={EMPTY_FRIEND_MISSIONS_FIXTURE}
        error={null}
        loading
        onOpen={jest.fn()}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByRole('progressbar').props.accessibilityState).toEqual({ busy: true });
    expect(screen.getByLabelText('Chargement de la mission contextuelle')).toBeTruthy();
  });

  it('shows one contextual mission and opens the complete mission surface', async () => {
    const onOpen = jest.fn();
    const screen = await render(
      <DuelMissionsSection
        data={FRIEND_MISSIONS_FIXTURE}
        error={null}
        loading={false}
        onOpen={onOpen}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText('DOUBLE CALL')).toBeTruthy();
    expect(screen.getByText('2 / 4')).toBeTruthy();
    expect(screen.getByText(/\+100 XP · \+25 VOLTS/)).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 4, now: 2 });

    fireEvent.press(screen.getByTestId('duel-missions-entry'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('keeps the empty state compact and still exposes mission history', async () => {
    const onOpen = jest.fn();
    const screen = await render(
      <DuelMissionsSection
        data={EMPTY_FRIEND_MISSIONS_FIXTURE}
        error={null}
        loading={false}
        onOpen={onOpen}
        onRetry={jest.fn()}
      />,
    );

    expect(screen.getByText('Aucune mission active')).toBeTruthy();
    expect(screen.queryByText('QUELQU’UN COMPTE SUR TOI.')).toBeNull();
    fireEvent.press(screen.getByTestId('duel-missions-entry'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('keeps a loaded mission visible when a refresh fails', async () => {
    const onRetry = jest.fn();
    const screen = await render(
      <DuelMissionsSection
        data={FRIEND_MISSIONS_FIXTURE}
        error="Réseau indisponible"
        loading={false}
        onOpen={jest.fn()}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByText('DOUBLE CALL')).toBeTruthy();
    expect(screen.getByText('ACTUALISATION IMPOSSIBLE')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'RÉESSAYER' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
