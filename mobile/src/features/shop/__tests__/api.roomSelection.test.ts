import { equipCosmetic, purchaseCosmetic } from '../api';

jest.mock('@/src/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
const { supabase } = jest.requireMock('@/src/lib/supabase') as { supabase: { rpc: jest.Mock } };
const collection = {
  vitrine_eclairage: { id: 'circuit-zero-room', style_key: 'circuit-zero-room', emplacement: 'vitrine_eclairage' },
};
const success = (slot: string) => ({ data: { emplacement: slot, equipe: true, solde: 500 }, error: null });

beforeEach(() => supabase.rpc.mockReset());

it.each([equipCosmetic, purchaseCosmetic])('clears the conflicting collection room before saving a standard room', async (mutate) => {
  supabase.rpc.mockResolvedValueOnce({ data: collection, error: null })
    .mockResolvedValueOnce(success('vitrine_eclairage'))
    .mockResolvedValueOnce(success('vitrine_supports'));
  await mutate('supports_halo');
  expect(supabase.rpc.mock.calls).toEqual([
    ['clutch_mes_cosmetiques_v1'],
    ['clutch_equiper_cosmetique_v1', { p_objet_id: 'lighting_cyan' }],
    [mutate === equipCosmetic ? 'clutch_equiper_cosmetique_v1' : 'clutch_acheter_cosmetique_v1', { p_objet_id: 'supports_halo' }],
  ]);
});

it('restores the collection room if equipping the replacement fails', async () => {
  const error = new Error('network');
  supabase.rpc.mockResolvedValueOnce({ data: collection, error: null })
    .mockResolvedValueOnce(success('vitrine_eclairage'))
    .mockResolvedValueOnce({ data: null, error })
    .mockResolvedValueOnce(success('vitrine_eclairage'));
  await expect(equipCosmetic('supports_halo')).rejects.toBe(error);
  expect(supabase.rpc).toHaveBeenLastCalledWith('clutch_equiper_cosmetique_v1', { p_objet_id: 'circuit-zero-room' });
});

it('preserves ordinary lighting when changing standard rooms', async () => {
  supabase.rpc.mockResolvedValueOnce({ data: { vitrine_eclairage: {
    id: 'lighting_amber', style_key: 'amber', emplacement: 'vitrine_eclairage',
  } }, error: null }).mockResolvedValueOnce(success('vitrine_supports'));
  await equipCosmetic('supports_halo');
  expect(supabase.rpc).toHaveBeenCalledTimes(2);
  expect(supabase.rpc).toHaveBeenLastCalledWith('clutch_equiper_cosmetique_v1', { p_objet_id: 'supports_halo' });
});
