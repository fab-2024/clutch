/// <reference types="jest" />

import { saveFavoriteTeam, saveProfilePreferences } from '../api';

const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({ single: mockSingle }));
const mockEq = jest.fn((_column: string, _value: string) => ({ select: mockSelect }));
const mockUpdate = jest.fn((_value: Record<string, unknown>) => ({ eq: mockEq }));

jest.mock('@/src/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
jest.mock('@/src/features/shop/api', () => ({
  loadProfileCosmetics: jest.fn(),
}));

const { supabase } = jest.requireMock('@/src/lib/supabase') as {
  supabase: { from: jest.Mock };
};
const mockFrom = supabase.from;

describe('profile settings mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({ update: mockUpdate });
    mockSingle.mockResolvedValue({ data: {}, error: null });
  });

  it('autosaves only reversible profile preferences', async () => {
    await saveProfilePreferences('user-1', ['lol', 'valorant'], false);

    expect(mockFrom).toHaveBeenCalledWith('profils');
    expect(mockUpdate).toHaveBeenCalledWith({
      jeux_suivis: ['lol', 'valorant'],
      profil_public: false,
    });
    expect(mockUpdate.mock.calls[0]?.[0]).not.toHaveProperty('equipe_favorite_id');
  });

  it('isolates the cooldown-bound favorite team mutation', async () => {
    await saveFavoriteTeam('user-1', 'g2-lol');

    expect(mockUpdate).toHaveBeenCalledWith({ equipe_favorite_id: 'g2-lol' });
    expect(mockUpdate.mock.calls[0]?.[0]).not.toHaveProperty('jeux_suivis');
    expect(mockUpdate.mock.calls[0]?.[0]).not.toHaveProperty('profil_public');
  });
});
