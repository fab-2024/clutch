import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { clearPendingRoute, consumePendingRoute, readPendingRoute, rememberPendingRoute, safePendingRoute } from '../pendingRoute';

describe('pending auth route', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
  });

  it('accepts only bounded product destinations', () => {
    expect(safePendingRoute('/duel/invitation_123')).toBe('/duel/invitation_123');
    expect(safePendingRoute('//evil.example')).toBeNull();
    expect(safePendingRoute('/settings/account')).toBeNull();
    expect(safePendingRoute('/duel/x')).toBeNull();
  });

  it('stores a valid destination once and consumes it once', async () => {
    await expect(rememberPendingRoute('/duel/invitation_123')).resolves.toBe(true);
    await expect(consumePendingRoute()).resolves.toBe('/duel/invitation_123');
    await expect(consumePendingRoute()).resolves.toBeNull();
  });

  it('drops expired destinations', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    await rememberPendingRoute('/duel/invitation_123');
    jest.spyOn(Date, 'now').mockReturnValue(1_000 + 24 * 60 * 60 * 1000 + 1);
    await expect(consumePendingRoute()).resolves.toBeNull();
  });

  it('does not persist an unsafe destination', async () => {
    await expect(rememberPendingRoute('https://evil.example')).resolves.toBe(false);
    await expect(consumePendingRoute()).resolves.toBeNull();
  });

  it('preserves an invitation for signup and onboarding until navigation is acknowledged', async () => {
    const path = '/i/0123456789abcdef0123456789abcdef';
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    await rememberPendingRoute(path);
    jest.spyOn(Date, 'now').mockReturnValue(1_000 + 2 * 24 * 60 * 60 * 1000);
    await expect(readPendingRoute()).resolves.toBe(path);
    await expect(readPendingRoute()).resolves.toBe(path);
    await clearPendingRoute('/duel/another_request');
    await expect(readPendingRoute()).resolves.toBe(path);
    await clearPendingRoute(path);
    await expect(readPendingRoute()).resolves.toBeNull();
  });

  it('accepts encoded showcase names but rejects traversal, queries and malformed invites', () => {
    expect(safePendingRoute('/v/Nova')).toBe('/v/Nova');
    expect(safePendingRoute('/v/%C3%89toile')).toBe('/v/%C3%89toile');
    for (const path of ['/v/%2e%2e', '/v/%252e%252e', '/v/name%2Fother', '/v/Nova?owner=1', '/i/guess', '/v/%00', '/v/%']) {
      expect(safePendingRoute(path)).toBeNull();
    }
  });

  it('never erases a new invitation arriving during an older navigation acknowledgement', async () => {
    const previous = '/i/0123456789abcdef0123456789abcdef';
    const next = '/i/abcdef0123456789abcdef0123456789';
    await rememberPendingRoute(previous);
    const raw = await AsyncStorage.getItem('@clutch/pending-route');
    let release!: () => void;
    let reading!: () => void;
    const readStarted = new Promise<void>((resolve) => { reading = resolve; });
    jest.spyOn(AsyncStorage, 'getItem').mockImplementationOnce(() => new Promise<string | null>((resolve) => {
      release = () => resolve(raw);
      reading();
    }));
    const clearing = clearPendingRoute(previous);
    await readStarted;
    const replacing = rememberPendingRoute(next);
    release();
    await Promise.all([clearing, replacing]);
    await expect(readPendingRoute()).resolves.toBe(next);
  });
});
