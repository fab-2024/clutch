/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { EMPTY_FRIEND_MISSIONS_FIXTURE, FRIEND_MISSIONS_FIXTURE } from '../../testing/fixtures';
import { MissionsSheet } from '../MissionsSheet';

jest.mock('lucide-react-native/icons/circle-alert', () => ({ __esModule: true, default: 'CircleAlert' }));
jest.mock('lucide-react-native/icons/circle-check', () => ({ __esModule: true, default: 'CircleCheck' }));
jest.mock('lucide-react-native/icons/flame', () => ({ __esModule: true, default: 'Flame' }));
jest.mock('lucide-react-native/icons/inbox', () => ({ __esModule: true, default: 'Inbox' }));
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
    withTiming: (value: number, _config: object, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return value;
    },
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

describe('MissionsSheet', () => {
  it('groups active missions, duo streaks and history in one modal surface', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <MissionsSheet
        data={FRIEND_MISSIONS_FIXTURE}
        error={null}
        loading={false}
        onClose={onClose}
        onRetry={jest.fn()}
        visible
      />,
    );

    expect(screen.getByTestId('missions-sheet').props.accessibilityViewIsModal).toBe(true);
    expect(screen.getByRole('header')).toHaveTextContent('Missions de duo');
    expect(screen.getByText('SÉRIES DE DUO')).toBeTruthy();
    expect(screen.getByText('DERNIÈRES MISSIONS')).toBeTruthy();
    expect(screen.getAllByText('DOUBLE CALL')).not.toHaveLength(0);

    fireEvent.press(screen.getByRole('button', { name: 'Fermer Missions de duo' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses a contained empty state instead of recreating the old full screen', async () => {
    const screen = await render(
      <MissionsSheet
        data={EMPTY_FRIEND_MISSIONS_FIXTURE}
        error={null}
        loading={false}
        onClose={jest.fn()}
        onRetry={jest.fn()}
        visible
      />,
    );

    expect(screen.getByText('Aucune mission pour le moment')).toBeTruthy();
    expect(screen.queryByText('QUELQU’UN COMPTE SUR TOI.')).toBeNull();
  });
});
