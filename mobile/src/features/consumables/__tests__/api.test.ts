import { loadVisualConsumables, runConsumableOperation } from '../api';

const OWNER = '10000000-0000-4000-8000-000000000001';
const OPERATION = '20000000-0000-4000-8000-000000000002';
const MOVEMENT = '30000000-0000-4000-8000-000000000003';
const state = {
  expansion_disponible: true, solde_volts: 240, impact_classement: false, conversion_frags: false,
  consommables: [
    { type: 'showcase_spotlight', stock: 1, stock_max: 3, prix_volts: 60, actif_jusqua: null },
    { type: 'profile_pulse', stock: 0, stock_max: 3, prix_volts: 45, actif_jusqua: null },
  ], historique: [],
};

jest.mock('@/src/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
const { supabase } = jest.requireMock('@/src/lib/supabase') as { supabase: { rpc: jest.Mock } };
function respond(data: unknown, error: unknown = null) {
  supabase.rpc.mockReturnValue({ abortSignal: jest.fn().mockResolvedValue({ data, error }) });
}

describe('P3 consumable account-bound RPCs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('never sends identity, balance, price, duration or stock to the server', async () => {
    respond(state);
    await expect(loadVisualConsumables(OWNER)).resolves.toMatchObject({ ownerId: OWNER, balanceVolts: 240 });
    expect(supabase.rpc).toHaveBeenLastCalledWith('clutch_mes_consommables_visuels_p3', {});
    respond({ operation_id: OPERATION, action: 'purchase', applique: true, mouvement_id: MOVEMENT, etat: state });
    await runConsumableOperation(OWNER, 'showcase_spotlight', 'purchase', OPERATION);
    expect(supabase.rpc).toHaveBeenLastCalledWith('clutch_acheter_consommable_visuel_p3', {
      p_type: 'showcase_spotlight', p_operation: OPERATION,
    });
  });

  it('routes activation separately and accepts an idempotent replay', async () => {
    respond({ operation_id: OPERATION, action: 'activation', applique: false, mouvement_id: null, etat: state });
    await expect(runConsumableOperation(OWNER, 'profile_pulse', 'activation', OPERATION)).resolves.toMatchObject({
      applied: false, movementId: null,
    });
    expect(supabase.rpc).toHaveBeenLastCalledWith('clutch_activer_consommable_visuel_p3', {
      p_type: 'profile_pulse', p_operation: OPERATION,
    });
  });

  it.each(['insufficient_volts', 'consumable_stock_full', 'consumable_stock_empty', 'effect_already_active', 'operation_conflict'])(
    'recognizes an authoritative rejection: %s', async (message) => {
      respond(null, { code: 'P0001', message });
      await expect(runConsumableOperation(OWNER, 'showcase_spotlight', 'purchase', OPERATION))
        .rejects.toMatchObject({ code: message, definitive: true });
    },
  );

  it('keeps missing migration and malformed operation outcomes uncertain', async () => {
    respond(null, { code: 'PGRST202', message: 'missing' });
    await expect(runConsumableOperation(OWNER, 'showcase_spotlight', 'purchase', OPERATION))
      .rejects.toMatchObject({ code: 'PGRST202', definitive: false });
    await expect(runConsumableOperation(OWNER, 'showcase_spotlight', 'purchase', 'invalid'))
      .rejects.toMatchObject({ code: 'invalid_operation', definitive: true });
    await expect(runConsumableOperation(OWNER, 'showcase_spotlight', 'invalid' as never, OPERATION))
      .rejects.toMatchObject({ code: 'invalid_operation', definitive: true });
  });
});
