import AsyncStorage from '@react-native-async-storage/async-storage';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { consumePendingRoute, rememberPendingRoute, safePendingRoute } from '../pendingRoute';

describe('pending auth route', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await AsyncStorage.clear();
  });

  it('accepts only a bounded duel destination', () => {
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
});
