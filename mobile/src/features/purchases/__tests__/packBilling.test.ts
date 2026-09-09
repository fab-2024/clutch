import { isCosmeticPackBillingReady } from '../api';

jest.mock('@/src/lib/supabase', () => ({ supabase: { rpc: jest.fn(), functions: { invoke: jest.fn() } } }));
const { supabase } = jest.requireMock('@/src/lib/supabase');
const rpc = supabase.rpc as jest.Mock;
const invoke = supabase.functions.invoke as jest.Mock;

afterEach(() => jest.resetAllMocks());

it('keeps payments closed before the migration is applied', async () => {
  rpc.mockResolvedValue({ data: { prix_volts: 1200 }, error: null } as never);
  expect(await isCosmeticPackBillingReady('sang-des-titans')).toBe(false);
  expect(invoke).not.toHaveBeenCalled();
});

it.each([false, true])('requires the authenticated server readiness response: %s', async (ready) => {
  rpc.mockResolvedValue({ data: { achat_store_requis: true, produit_store_id: 'clutch_pack_sang_des_titans_v1' }, error: null } as never);
  invoke.mockResolvedValue({ data: { ok: true, ready }, error: null } as never);
  expect(await isCosmeticPackBillingReady('sang-des-titans')).toBe(ready);
  expect(invoke).toHaveBeenCalledWith('clutch-pack-sync', { body: { action: 'availability' } });
});

it('fails closed if server configuration cannot be checked', async () => {
  rpc.mockResolvedValue({ data: { achat_store_requis: true, produit_store_id: 'clutch_pack_sang_des_titans_v1' }, error: null } as never);
  invoke.mockResolvedValue({ data: null, error: new Error('offline') } as never);
  expect(await isCosmeticPackBillingReady('sang-des-titans')).toBe(false);
});
