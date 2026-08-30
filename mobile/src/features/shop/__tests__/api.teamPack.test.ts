/// <reference types="jest" />

import { equipCosmeticPack, purchaseCosmeticPack } from '../api';

jest.mock('@/src/lib/supabase', () => ({
  supabase: { rpc: jest.fn() },
}));

const { supabase } = jest.requireMock('@/src/lib/supabase') as {
  supabase: { rpc: jest.Mock };
};

describe('team pack shop API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('purchases a complete cosmetic pack through the atomic RPC', async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        pack: 'fnatic-black-orange',
        solde: 80,
        achete: true,
        equipe: true,
        nombre_objets: 12,
      },
      error: null,
    });

    await expect(purchaseCosmeticPack('fnatic-black-orange')).resolves.toEqual({
      packId: 'fnatic-black-orange',
      balance: 80,
      purchased: true,
      equipped: true,
      itemCount: 12,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('clutch_acheter_pack_cosmetique_v1', {
      p_pack_id: 'fnatic-black-orange',
    });
  });

  it('equips an owned pack through the dedicated RPC', async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        pack_id: 'fnatic-black-orange',
        solde: 80,
        achete: false,
        equipe: true,
        objets: new Array(12).fill('objet'),
      },
      error: null,
    });

    await expect(equipCosmeticPack('fnatic-black-orange')).resolves.toMatchObject({
      packId: 'fnatic-black-orange',
      balance: 80,
      purchased: false,
      equipped: true,
      itemCount: 12,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('clutch_equiper_pack_cosmetique_v1', {
      p_pack_id: 'fnatic-black-orange',
    });
  });

  it('surfaces an RPC error without mutating the response', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: new Error('network') });

    await expect(purchaseCosmeticPack('fnatic-black-orange')).rejects.toThrow('network');
  });
});
