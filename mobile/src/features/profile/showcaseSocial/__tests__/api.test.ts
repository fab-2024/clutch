import { EMPTY_EQUIPPED_COSMETICS } from '@/src/features/shop/types';

import { loadPublicMilestone, loadPublicShowcase, prepareMilestoneShare, saveShowcasePreferences, setShowcaseLike } from '../api';

const mockSession = jest.fn();
const mockRpc = jest.fn();
jest.mock('@/src/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args), auth: { getSession: () => mockSession() } } }));
jest.mock('@/src/config/release', () => ({ publicAppOrigin: 'https://clutch.example' }));
jest.mock('@/src/features/shop/api', () => ({ normalizeEquipped: () => jest.requireActual('@/src/features/shop/types').EMPTY_EQUIPPED_COSMETICS }));

const rawShowcase = {
  pseudo: 'Nova', avatar_id: null, titre: null, equipe: null, classement: null, serie: null,
  proprietaire: false, profil_public: true, visibilite: 'publique', montrer_rang: true, montrer_serie: true, montrer_jalons: true,
  notifications_likes: null, likes: 2, aime: false, peut_aimer: true, vues: null, vues_semaine: null,
};
const rawMilestone = { pseudo: 'Nova', palier: 7, obtenu_le: '2026-09-03T09:00:00Z' };

function respond(data: unknown, error: unknown = null) {
  const header = jest.fn();
  const execute = jest.fn((resolve: (value: unknown) => void) => resolve({ data, error }));
  const query = { abortSignal: jest.fn(), setHeader: header, then: execute };
  query.abortSignal.mockReturnValue(query); header.mockReturnValue(query); mockRpc.mockReturnValue(query);
  return { header, execute };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockResolvedValue({ data: { session: { user: { id: 'viewer' }, access_token: 'fixture-token' } } });
});

describe('account-bound showcase transport', () => {
  it('keeps anonymous or unconfirmed reads separate from counted visits', async () => {
    respond(rawShowcase);
    const showcase = await loadPublicShowcase('Nova');
    expect(showcase?.cosmetics).toEqual(EMPTY_EQUIPPED_COSMETICS);
    expect(mockRpc).toHaveBeenLastCalledWith('clutch_vitrine_v1', { p_pseudo: 'Nova' });
    expect(mockSession).not.toHaveBeenCalled();
    await loadPublicShowcase('Nova', 'viewer', false);
    expect(mockRpc).toHaveBeenLastCalledWith('clutch_vitrine_v1', { p_pseudo: 'Nova' });
    await loadPublicShowcase('Nova', 'viewer', true);
    expect(mockRpc).toHaveBeenLastCalledWith('clutch_visiter_vitrine_v1', { p_pseudo: 'Nova' });
  });
  it('pins the initiating identity, sending only the intended like state', async () => {
    const query = respond(rawShowcase);
    await setShowcaseLike('Nova', true, 'viewer');
    expect(mockRpc).toHaveBeenLastCalledWith('clutch_aimer_vitrine_v1', { p_pseudo: 'Nova', p_aime: true });
    expect(query.header).toHaveBeenCalledWith('Authorization', 'Bearer fixture-token');
  });
  it('refuses to dispatch preferences, likes or shares after an account switch', async () => {
    const query = respond(rawShowcase);
    mockSession.mockResolvedValue({ data: { session: { user: { id: 'another-account' }, access_token: 'other-token' } } });
    for (const request of [
      () => setShowcaseLike('Nova', true, 'viewer'),
      () => saveShowcasePreferences({ visibility: 'privee', showRank: false, showStreak: false, showMilestones: false, likeNotifications: false }, 'viewer'),
      () => prepareMilestoneShare(7, 'viewer'),
    ]) await expect(request()).rejects.toMatchObject({ reason: 'authentication_required' });
    expect(query.execute).not.toHaveBeenCalled();
  });
  it('returns no old projection when access is revoked and retains rate limit errors', async () => {
    respond(null);
    await expect(setShowcaseLike('Nova', false, 'viewer')).resolves.toBeNull();
    respond({ erreur: 'rate_limited' });
    await expect(setShowcaseLike('Nova', true, 'viewer')).rejects.toMatchObject({ reason: 'rate_limited' });
  });
  it('requires a server-verified milestone before publishing and never supplies an achievement date', async () => {
    respond(rawMilestone);
    await expect(prepareMilestoneShare(7, 'viewer')).resolves.toEqual({ pseudo: 'Nova', milestone: 7, earnedAt: rawMilestone.obtenu_le });
    expect(mockRpc).toHaveBeenLastCalledWith('clutch_partage_jalon_v1', { p_palier: 7 });
    respond(null);
    await expect(prepareMilestoneShare(100, 'viewer')).rejects.toMatchObject({ reason: 'milestone_not_public' });
  });
  it('does not dispatch malformed profile links, and uses only a read RPC for public milestones', async () => {
    await expect(loadPublicShowcase('../settings')).resolves.toBeNull();
    await expect(loadPublicMilestone('../settings', 7)).resolves.toBeNull();
    expect(mockRpc).not.toHaveBeenCalled();
    respond(rawMilestone);
    await loadPublicMilestone('Nova', 7);
    expect(mockRpc).toHaveBeenCalledWith('clutch_jalon_public_v1', { p_pseudo: 'Nova', p_palier: 7 });
    expect(mockSession).not.toHaveBeenCalled();
  });
});
