/// <reference types="jest" />

import { equipCosmeticPack, loadCosmeticShop, purchaseCosmeticPack } from '../api';

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
        pack: 'sang-des-titans',
        solde: 80,
        achete: true,
        equipe: true,
        nombre_objets: 8,
      },
      error: null,
    });

    await expect(purchaseCosmeticPack('sang-des-titans')).resolves.toEqual({
      packId: 'sang-des-titans',
      balance: 80,
      purchased: true,
      equipped: true,
      itemCount: 8,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('clutch_acheter_pack_cosmetique_v1', {
      p_pack_id: 'sang-des-titans',
    });
  });

  it('equips an owned pack through the dedicated RPC', async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        pack_id: 'sang-des-titans',
        solde: 80,
        achete: false,
        equipe: true,
        objets: new Array(8).fill('objet'),
      },
      error: null,
    });

    await expect(equipCosmeticPack('sang-des-titans')).resolves.toMatchObject({
      packId: 'sang-des-titans',
      balance: 80,
      purchased: false,
      equipped: true,
      itemCount: 8,
    });
    expect(supabase.rpc).toHaveBeenCalledWith('clutch_equiper_pack_cosmetique_v1', {
      p_pack_id: 'sang-des-titans',
    });
  });

  it.each(['chute-libre', 'serment-du-givre'])(
    'forwards the %s pack id to the existing atomic RPCs',
    async (packId) => {
      supabase.rpc
        .mockResolvedValueOnce({
          data: {
            pack: packId,
            solde: 80,
            achete: true,
            equipe: true,
            nombre_objets: 8,
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            pack_id: packId,
            solde: 80,
            achete: false,
            equipe: true,
            objets: new Array(8).fill('objet'),
          },
          error: null,
        });

      await expect(purchaseCosmeticPack(packId)).resolves.toMatchObject({
        packId,
        purchased: true,
        equipped: true,
        itemCount: 8,
      });
      await expect(equipCosmeticPack(packId)).resolves.toMatchObject({
        packId,
        purchased: false,
        equipped: true,
        itemCount: 8,
      });
      expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'clutch_acheter_pack_cosmetique_v1', {
        p_pack_id: packId,
      });
      expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'clutch_equiper_pack_cosmetique_v1', {
        p_pack_id: packId,
      });
    },
  );

  it('surfaces an RPC error without mutating the response', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: new Error('network') });

    await expect(purchaseCosmeticPack('sang-des-titans')).rejects.toThrow('network');
  });

  it('removes retired collections from shop inventory and equipped cosmetics', async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        solde: 0,
        objets: [
          { id: 'current-item', emplacement: 'apparence_core', style_key: 'current-item', collection_key: 'atelier' },
          { id: 'founder-frame-v1', emplacement: 'cadre_profil', style_key: 'founder-frame', collection_key: 'founder-origin', source: 'founder_pack' },
          { id: 'fnatic-logo-3d', emplacement: 'apparence_core', style_key: 'fnatic-logo-3d', collection_key: 'fnatic-black-orange' },
        ],
        equipes: {
          effet_faction: { id: 'kc-blue-wall-effect', emplacement: 'effet_faction', style_key: 'kc-blue-wall-effect' },
        },
        contrat: {},
      },
      error: null,
    });

    await expect(loadCosmeticShop()).resolves.toMatchObject({
      items: [expect.objectContaining({ id: 'current-item' })],
      equipped: { factionEffect: null },
    });
  });
});
