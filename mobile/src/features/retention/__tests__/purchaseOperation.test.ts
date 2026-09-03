import AsyncStorage from '@react-native-async-storage/async-storage';

import { OPERATION, OTHER_OPERATION, OTHER_OWNER, OWNER } from '../__fixtures__/streak';
import { forgetProtectorPurchase, loadPendingProtectorPurchase, rememberProtectorPurchase } from '../purchaseOperation';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(),
}));

describe('durable protector purchase operation', () => {
  const records = new Map<string, string>();
  beforeEach(() => {
    jest.clearAllMocks(); records.clear();
    jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => records.get(key) ?? null);
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { records.set(key, value); });
    jest.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => { records.delete(key); });
  });

  it('persists the uncertain operation across remounts without crossing accounts', async () => {
    await rememberProtectorPurchase(OWNER, OPERATION);
    expect(await loadPendingProtectorPurchase(OWNER)).toBe(OPERATION);
    expect(await loadPendingProtectorPurchase(OTHER_OWNER)).toBeNull();
  });

  it('only clears the exact operation acknowledged by the server', async () => {
    await rememberProtectorPurchase(OWNER, OTHER_OPERATION);
    await forgetProtectorPurchase(OWNER, OPERATION);
    expect(await loadPendingProtectorPurchase(OWNER)).toBe(OTHER_OPERATION);
    await forgetProtectorPurchase(OWNER, OTHER_OPERATION);
    expect(await loadPendingProtectorPurchase(OWNER)).toBeNull();
  });

  it('propagates storage failures so the caller cannot start an untracked debit', async () => {
    jest.mocked(AsyncStorage.setItem).mockRejectedValue(new Error('storage full'));
    await expect(rememberProtectorPurchase(OWNER, OPERATION)).rejects.toThrow('storage full');
    expect(await loadPendingProtectorPurchase(OWNER)).toBeNull();
  });
});
