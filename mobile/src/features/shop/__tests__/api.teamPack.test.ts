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

  it('forwards the Karmine Corp pack id to the existing atomic RPCs', async () => {
    supabase.rpc
      .mockResolvedValueOnce({
        data: {
          pack: 'kc-blue-wall',
          solde: 80,
          achete: true,
          equipe: true,
          nombre_objets: 12,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          pack_id: 'kc-blue-wall',
          solde: 80,
          achete: false,
          equipe: true,
          objets: new Array(12).fill('objet'),
        },
        error: null,
      });

    await expect(purchaseCosmeticPack('kc-blue-wall')).resolves.toMatchObject({
      packId: 'kc-blue-wall',
      purchased: true,
      equipped: true,
      itemCount: 12,
    });
    await expect(equipCosmeticPack('kc-blue-wall')).resolves.toMatchObject({
      packId: 'kc-blue-wall',
      purchased: false,
      equipped: true,
      itemCount: 12,
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'clutch_acheter_pack_cosmetique_v1', {
      p_pack_id: 'kc-blue-wall',
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'clutch_equiper_pack_cosmetique_v1', {
      p_pack_id: 'kc-blue-wall',
    });
  });

  it('surfaces an RPC error without mutating the response', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: new Error('network') });

    await expect(purchaseCosmeticPack('fnatic-black-orange')).rejects.toThrow('network');
  });
});
