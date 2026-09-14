/// <reference types="jest" />

import { saveOnboarding } from '../api';
import { EMPTY_ONBOARDING_DRAFT } from '../draft';

jest.mock('@/src/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));

const { supabase } = jest.requireMock('@/src/lib/supabase') as {
  supabase: { rpc: jest.Mock };
};

describe('onboarding API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    supabase.rpc.mockResolvedValue({ data: { onboarding: true }, error: null });
  });

  it('completes a catalog selection through the v2 RPC', async () => {
    await saveOnboarding({
      ...EMPTY_ONBOARDING_DRAFT,
      favoriteGame: 'lol',
      favoriteTeamId: 'fnc-lol',
      favoriteTeamKey: 'fnatic',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('clutch_terminer_onboarding_v2', {
      p_jeu: 'lol',
      p_equipe_id: 'fnc-lol',
      p_jeu_demande: null,
      p_equipe_demandee: null,
    });
  });

  it('forwards missing game and team names for future cataloging', async () => {
    await saveOnboarding({
      ...EMPTY_ONBOARDING_DRAFT,
      missingGame: '  Counter-Strike 2 ',
      missingTeam: '  Team Liquid  ',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('clutch_terminer_onboarding_v2', {
      p_jeu: null,
      p_equipe_id: null,
      p_jeu_demande: 'Counter-Strike 2',
      p_equipe_demandee: 'Team Liquid',
    });
  });

  it('keeps supported catalog choices working before the v2 migration is deployed', async () => {
    supabase.rpc
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } })
      .mockResolvedValueOnce({ data: { onboarding: true }, error: null });

    await saveOnboarding({
      ...EMPTY_ONBOARDING_DRAFT,
      favoriteGame: 'rocket_league',
      favoriteTeamId: 'kc-rl',
    });

    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'clutch_terminer_onboarding_v1', {
      p_jeux: ['rocket_league'],
      p_equipe_id: 'kc-rl',
    });
  });
});
