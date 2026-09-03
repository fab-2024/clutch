/// <reference types="jest" />

import { loadArenaMatches, loadMatchCenter } from '../api';

jest.mock('@/src/lib/supabase', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

const { supabase } = jest.requireMock('@/src/lib/supabase') as {
  supabase: { from: jest.Mock; rpc: jest.Mock };
};

const MATCH = {
  id: 'match-1',
  saison_id: 'season-1',
  debut: '2026-09-03T08:00:00.000Z',
  jeu: 'lol',
  equipe_a: 'BNK FEARX',
  tag_a: 'BFX',
  equipe_b: 'Dplus KIA',
  tag_b: 'DK',
  evenement: 'LCK · Playoffs',
  format: 5,
  statut: 'en_cours',
  score_a: 0,
  score_b: 0,
  team_a: { logo: 'https://example.com/fearx.png' },
  team_b: { logo: 'https://example.com/dplus.png' },
};

function query(data: unknown) {
  const result = Promise.resolve({ data, error: null });
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    overrideTypes: jest.fn().mockReturnThis(),
    then: result.then.bind(result),
  };
}

describe('match team logos', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    supabase.rpc.mockImplementation((name: string) => Promise.resolve({
      data: name === 'clutch_mes_calls_v1'
        ? { compteurs: { ouverts: 0, verrouilles: 0, reussis: 0, manques: 0 } }
        : name === 'clutch_call_context_v1'
          ? { participants: 0, revision_resultat: 0 }
          : null,
      error: null,
    }));
  });

  it('carries both team logos into live, upcoming and finished matches while preserving predictions', async () => {
    const prediction = { match_id: MATCH.id, choix: 'b', statut: 'en_attente', delta_frags: null };
    supabase.from
      .mockReturnValueOnce(query([MATCH]))
      .mockReturnValueOnce(query([]))
      .mockReturnValueOnce(query([{ ...MATCH, id: 'upcoming', statut: 'a_venir' }]))
      .mockReturnValueOnce(query([{ ...MATCH, id: 'finished', statut: 'termine' }]))
      .mockReturnValueOnce(query([prediction]));

    const result = await loadArenaMatches('user-1');

    expect(result.upcoming).toHaveLength(2);
    expect(result.finished).toHaveLength(1);
    for (const match of [...result.upcoming, ...result.finished]) {
      expect(match.logo_a).toBe(MATCH.team_a.logo);
      expect(match.logo_b).toBe(MATCH.team_b.logo);
      expect(match.equipe_a).toBe(MATCH.equipe_a);
      expect(match).not.toHaveProperty('team_a');
      expect(match).not.toHaveProperty('team_b');
    }
    expect(result.upcoming[0].prediction).toEqual(prediction);
    expect(result.upcoming[1].prediction).toBeNull();
  });

  it('keeps logos when opening a match directly and tolerates a missing related-team logo', async () => {
    supabase.from
      .mockReturnValueOnce(query(MATCH))
      .mockReturnValueOnce(query([{ ...MATCH, id: 'related', team_a: null, team_b: { logo: null } }]));

    const result = await loadMatchCenter(MATCH.id);

    expect(result.match.logo_a).toBe(MATCH.team_a.logo);
    expect(result.match.logo_b).toBe(MATCH.team_b.logo);
    expect(result.related[0].logo_a).toBeNull();
    expect(result.related[0].logo_b).toBeNull();
    expect(result.related[0].equipe_a).toBe(MATCH.equipe_a);
  });
});
