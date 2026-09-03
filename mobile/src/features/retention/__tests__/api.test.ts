import { loadCallStreak, purchaseStreakProtector, selectStreakMilestone } from '../api';
import { MOVEMENT, OPERATION, OTHER_OPERATION, OTHER_OWNER, OWNER, payload } from '../__fixtures__/streak';

jest.mock('@/src/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
const { supabase } = jest.requireMock('@/src/lib/supabase') as { supabase: { rpc: jest.Mock } };
function respond(data: unknown, error: unknown = null) {
  supabase.rpc.mockReturnValue({ abortSignal: jest.fn().mockResolvedValue({ data, error }) });
}
const purchase = { operation_id: OPERATION, achete: true, mouvement_id: MOVEMENT, etat: payload };

describe('retention account-bound RPCs', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
  afterEach(() => jest.useRealTimers());

  it('only sends timezone/operation/milestone, never identity, counts, price or date', async () => {
    respond(payload);
    await loadCallStreak(OWNER, 'Europe/Paris');
    expect(supabase.rpc).toHaveBeenLastCalledWith('clutch_ma_serie_calls_v1', { p_fuseau: 'Europe/Paris' });
    await selectStreakMilestone(OWNER, 14);
    expect(supabase.rpc).toHaveBeenLastCalledWith('clutch_selectionner_jalon_serie_v1', { p_palier: 14 });
    respond(purchase);
    await expect(purchaseStreakProtector(OWNER, OPERATION)).resolves.toMatchObject({ purchased: true, movementId: MOVEMENT });
    expect(supabase.rpc).toHaveBeenLastCalledWith('clutch_acheter_protecteur_serie_v1', { p_operation: OPERATION });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('accepts a replay of the same receipt even when stock is now full', async () => {
    respond({ ...purchase, achete: false, etat: { ...payload, stock_protecteurs: 2 } });
    await expect(purchaseStreakProtector(OWNER, OPERATION)).resolves.toMatchObject({ purchased: false });
  });

  it.each([
    { operation_id: OTHER_OPERATION }, { mouvement_id: null }, { achete: 'true' },
    { etat: { ...payload, user_id: OTHER_OWNER } }, { etat: { ...payload, stock_protecteurs: 3 } },
  ])('keeps the operation pending on an inconsistent receipt: %j', async (override) => {
    respond({ ...purchase, ...override });
    await expect(purchaseStreakProtector(OWNER, OPERATION)).rejects.toMatchObject({ code: 'invalid_response', definitive: false });
  });

  it.each(['protector_stock_full', 'insufficient_volts', 'streak_milestone_locked'])('recognizes an authoritative rejection: %s', async (message) => {
    respond(null, { code: 'P0001', message });
    await expect(purchaseStreakProtector(OWNER, OPERATION)).rejects.toMatchObject({ code: message, definitive: true });
  });

  it('never turns a missing migration/network error into a confirmed debit', async () => {
    respond(null, { code: 'PGRST202', message: 'RPC unavailable' });
    await expect(purchaseStreakProtector(OWNER, OPERATION)).rejects.toMatchObject({ code: 'PGRST202', definitive: false });
    await expect(purchaseStreakProtector(OWNER, 'invalid')).rejects.toMatchObject({ code: 'invalid_operation', definitive: true });
  });

  it('bounds an uncertain network operation without discarding its retry key', async () => {
    supabase.rpc.mockReturnValue({ abortSignal: (signal: AbortSignal) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
    }) });
    const outcome = purchaseStreakProtector(OWNER, OPERATION).catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(15_000);
    expect(await outcome).toMatchObject({ code: 'network', definitive: false });
    expect(jest.getTimerCount()).toBe(0);
  });
});
