/// <reference types="jest" />

import { loadMatchCenter } from '../api';
import {
  clearMatchCenterCache,
  loadCachedMatchCenter,
  peekMatchCenterData,
  prefetchMatchCenterData,
} from '../matchCenterCache';
import type { MatchCenterData } from '../types';

jest.mock('../api', () => ({
  loadMatchCenter: jest.fn(),
}));

const load = loadMatchCenter as jest.MockedFunction<typeof loadMatchCenter>;

function matchData(id: string) {
  return { match: { id } } as MatchCenterData;
}

describe('matchCenterCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearMatchCenterCache();
  });

  it('shares an in-flight prefetch with the screen load', async () => {
    let resolveRequest!: (data: MatchCenterData) => void;
    load.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    const key = { matchId: 'match-1', userId: 'user-a' };

    const prefetch = prefetchMatchCenterData(key);
    const screenLoad = loadCachedMatchCenter(key);
    resolveRequest(matchData('match-1'));

    await expect(screenLoad).resolves.toEqual(matchData('match-1'));
    await expect(prefetch).resolves.toBeUndefined();
    expect(load).toHaveBeenCalledTimes(1);
    expect(peekMatchCenterData(key)).toEqual(matchData('match-1'));
  });

  it('isolates cached prediction data by user', async () => {
    load
      .mockResolvedValueOnce(matchData('match-user-a'))
      .mockResolvedValueOnce(matchData('match-user-b'));

    await loadCachedMatchCenter({ matchId: 'match-1', userId: 'user-a' });
    await loadCachedMatchCenter({ matchId: 'match-1', userId: 'user-b' });

    expect(load).toHaveBeenCalledTimes(2);
  });

  it('bypasses the cache for an explicit refresh', async () => {
    load
      .mockResolvedValueOnce(matchData('before-refresh'))
      .mockResolvedValueOnce(matchData('after-refresh'));
    const key = { matchId: 'match-1', userId: 'user-a' };

    await expect(loadCachedMatchCenter(key)).resolves.toEqual(matchData('before-refresh'));
    await expect(loadCachedMatchCenter(key, { force: true })).resolves.toEqual(matchData('after-refresh'));

    expect(load).toHaveBeenCalledTimes(2);
    expect(peekMatchCenterData(key)).toEqual(matchData('after-refresh'));
  });

  it('removes a failed prefetch so retry can recover', async () => {
    load
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(matchData('recovered'));
    const key = { matchId: 'match-1', userId: 'user-a' };

    await expect(prefetchMatchCenterData(key)).rejects.toThrow('offline');
    await expect(loadCachedMatchCenter(key)).resolves.toEqual(matchData('recovered'));

    expect(load).toHaveBeenCalledTimes(2);
  });
});
