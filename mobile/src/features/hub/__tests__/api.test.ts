/// <reference types="jest" />

import { loadHubData } from '../api';

jest.mock('@/src/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

const { supabase } = jest.requireMock('@/src/lib/supabase') as {
  supabase: { from: jest.Mock; rpc: jest.Mock };
};

function query(data: unknown) {
  const result = Promise.resolve({ data, error: null });
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    overrideTypes: jest.fn().mockReturnThis(),
    then: result.then.bind(result),
  };
}

it('uses the selected feed for every Hub discovery query while respecting followed games', async () => {
  const live = query(null);
  const upcoming = query([{ id: 'selected-match', equipe_a: 'T1', equipe_b: 'Unknown' }]);
  supabase.from
    .mockReturnValueOnce(query(null))
    .mockReturnValueOnce(live)
    .mockReturnValueOnce(upcoming);
  supabase.rpc.mockResolvedValue({ data: null, error: null });

  const result = await loadHubData('user-1', ['lol']);

  expect(supabase.from.mock.calls.map(([table]) => table)).toEqual([
    'v_saisons', 'v_matchs_selectionnes', 'v_matchs_selectionnes',
  ]);
  for (const request of [live, upcoming]) {
    expect(request.in).toHaveBeenCalledWith('jeu', ['lol']);
  }
  expect(result.nextMatch?.id).toBe('selected-match');
});
