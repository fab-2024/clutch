/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import DuelsMissionsEntryScreen, { isMissionsAliasPath } from '../DuelsMissionsEntryScreen';
import { router } from 'expo-router';

let mockPathname = '/social/missions';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  usePathname: () => mockPathname,
}));
jest.mock('../DuelsScreen', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { initialMissionsOpen?: boolean; onMissionsClosed?: () => void }) => {
      return React.createElement(
        ReactNative.Pressable,
        { onPress: props.onMissionsClosed, testID: 'finish-sheet-close' },
        React.createElement(ReactNative.Text, null, props.initialMissionsOpen ? 'OPEN' : 'CLOSED'),
      );
    },
  };
});

describe('DuelsMissionsEntryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = '/social/missions';
  });

  it('recognizes only the missions compatibility route', () => {
    expect(isMissionsAliasPath('/social/missions')).toBe(true);
    expect(isMissionsAliasPath('/social/duels')).toBe(false);
  });

  it('opens missions from the alias and returns to canonical Défis after close', async () => {
    const screen = await render(<DuelsMissionsEntryScreen />);

    expect(screen.getByText('OPEN')).toBeTruthy();
    fireEvent.press(screen.getByTestId('finish-sheet-close'));
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/social/duels');
  });

  it('keeps the canonical route closed by default', async () => {
    mockPathname = '/social/duels';
    const screen = await render(<DuelsMissionsEntryScreen />);

    expect(screen.getByText('CLOSED')).toBeTruthy();
    fireEvent.press(screen.getByTestId('finish-sheet-close'));
    expect(router.replace).not.toHaveBeenCalled();
  });
});
