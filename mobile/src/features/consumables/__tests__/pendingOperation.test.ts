import AsyncStorage from '@react-native-async-storage/async-storage';

import { forgetPendingConsumableOperation, loadPendingConsumableOperation, rememberPendingConsumableOperation } from '../pendingOperation';

const OWNER = '10000000-0000-4000-8000-000000000001';
const OPERATION = '20000000-0000-4000-8000-000000000002';

describe('durable P3 consumable operation', () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it('keeps one account-bound action until its exact receipt is confirmed', async () => {
    const operation = { operationId: OPERATION, type: 'profile_pulse' as const, action: 'activation' as const };
    await rememberPendingConsumableOperation(OWNER, operation);
    await expect(loadPendingConsumableOperation(OWNER)).resolves.toEqual(operation);
    await forgetPendingConsumableOperation(OWNER, '30000000-0000-4000-8000-000000000003');
    await expect(loadPendingConsumableOperation(OWNER)).resolves.toEqual(operation);
    await forgetPendingConsumableOperation(OWNER, OPERATION);
    await expect(loadPendingConsumableOperation(OWNER)).resolves.toBeNull();
  });

  it('rejects malformed storage instead of replaying arbitrary input', async () => {
    await AsyncStorage.setItem(`@clutch/visual-consumable-operation/p3/${OWNER}`, '{"operationId":"bad"}');
    await expect(loadPendingConsumableOperation(OWNER)).resolves.toBeNull();
  });
});
