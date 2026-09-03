/// <reference types="jest" />

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { loadProfileData } from '../../api';
import { levelFromXp } from '../../progression';
import type { ProfileData } from '../../types';
import { useProfileLevel } from '../useProfileLevel';

jest.mock('../../api', () => ({ loadProfileData: jest.fn() }));
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const React = jest.requireActual('react');
    React.useEffect(effect, [effect]);
  },
}));

const loadProfile = jest.mocked(loadProfileData);
const profileWithXp = (xp: number) => ({ level: levelFromXp(xp) }) as ProfileData;

describe('useProfileLevel', () => {
  beforeEach(() => {
    loadProfile.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('refreshes the confirmed progression on foreground and retains it while offline', async () => {
    const appState = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
    loadProfile
      .mockResolvedValueOnce(profileWithXp(200))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(profileWithXp(300));
    const { result } = await renderHook(() => useProfileLevel('user-1', 'Alice'));

    await waitFor(() => expect(result.current).toEqual(levelFromXp(200)));
    const handleState = appState.mock.calls[0]?.[1];
    await act(async () => handleState?.('active'));
    expect(result.current).toEqual(levelFromXp(200));

    await act(async () => handleState?.('active'));
    await waitFor(() => expect(result.current).toEqual(levelFromXp(300)));
  });

  it('ignores an earlier account response after the connected player changes', async () => {
    let resolveFirst!: (data: ProfileData) => void;
    const first = new Promise<ProfileData>((resolve) => { resolveFirst = resolve; });
    loadProfile
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce(profileWithXp(200));
    const { rerender, result } = await renderHook(
      ({ userId, pseudo }: { userId: string; pseudo: string }) => useProfileLevel(userId, pseudo),
      { initialProps: { userId: 'user-1', pseudo: 'Alice' } },
    );
    await waitFor(() => expect(loadProfile).toHaveBeenCalledWith('Alice'));

    await rerender({ userId: 'user-2', pseudo: 'Bob' });
    await waitFor(() => expect(result.current).toEqual(levelFromXp(200)));
    await act(async () => resolveFirst(profileWithXp(5_000)));

    expect(result.current).toEqual(levelFromXp(200));
    expect(loadProfile).toHaveBeenLastCalledWith('Bob');
  });

  it('does not fetch progression without a connected player', async () => {
    const { result } = await renderHook(() => useProfileLevel(undefined, 'Alice'));

    expect(loadProfile).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });
});
