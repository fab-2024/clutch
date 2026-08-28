/// <reference types="jest" />

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { loadFriendQuests } from '../api';
import { useFriendMissions } from '../hooks/useFriendMissions';
import { FRIEND_MISSIONS_FIXTURE } from '../testing/fixtures';

jest.mock('../api', () => ({
  loadFriendQuests: jest.fn(),
}));

const loadMissions = jest.mocked(loadFriendQuests);

describe('useFriendMissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadMissions.mockResolvedValue(FRIEND_MISSIONS_FIXTURE);
  });

  it('loads mission data through the missions API module', async () => {
    const { result } = await renderHook(() => useFriendMissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data.actives[0]?.id).toBe('active-duo-calls');
    });
    expect(loadMissions).toHaveBeenCalledTimes(1);
  });

  it('keeps existing content while a refresh fails', async () => {
    const { result } = await renderHook(() => useFriendMissions());
    await waitFor(() => expect(result.current.loading).toBe(false));
    loadMissions.mockRejectedValueOnce(new Error('Réseau indisponible'));

    await act(async () => {
      await result.current.reload(true);
    });

    expect(result.current.data).toBe(FRIEND_MISSIONS_FIXTURE);
    expect(result.current.error).toBe('Réseau indisponible');
    expect(result.current.refreshing).toBe(false);
  });
});
