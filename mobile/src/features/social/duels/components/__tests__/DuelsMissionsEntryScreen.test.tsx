/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import DuelsMissionsEntryScreen from '../DuelsMissionsEntryScreen';
import { router } from 'expo-router';

let mockParams: { missions?: string | string[] } = {};

jest.mock('expo-router', () => ({
  router: { setParams: jest.fn() },
  useLocalSearchParams: () => mockParams,
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
    mockParams = { missions: '1' };
  });

  it('opens missions from the query parameter and clears it after close without replacing the screen', async () => {
    const screen = await render(<DuelsMissionsEntryScreen />);

    expect(screen.getByText('OPEN')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('finish-sheet-close'));
    expect(router.setParams).toHaveBeenCalledWith({ missions: undefined });
  });

  it('keeps the canonical route closed by default', async () => {
    mockParams = {};
    const screen = await render(<DuelsMissionsEntryScreen />);

    expect(screen.getByText('CLOSED')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('finish-sheet-close'));
    expect(router.setParams).not.toHaveBeenCalled();
  });

  it('can open missions again on an already mounted Défis screen', async () => {
    mockParams = {};
    const screen = await render(<DuelsMissionsEntryScreen />);
    expect(screen.getByText('CLOSED')).toBeTruthy();

    mockParams = { missions: '1' };
    await screen.rerender(<DuelsMissionsEntryScreen />);
    expect(screen.getByText('OPEN')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('finish-sheet-close'));
    mockParams = {};
    await screen.rerender(<DuelsMissionsEntryScreen />);
    expect(screen.getByText('CLOSED')).toBeTruthy();
  });

  it.each(['0', 'false', 'unexpected'])('ignores the unsupported missions value %s', async (missions) => {
    mockParams = { missions };
    const screen = await render(<DuelsMissionsEntryScreen />);
    expect(screen.getByText('CLOSED')).toBeTruthy();
  });
});
