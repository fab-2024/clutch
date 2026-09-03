import { acceptInvitation, createInvitation, loadInvitation, recordInvitationShare } from '../api';

const code = '0123456789abcdef0123456789abcdef';
const device = '11111111-1111-4111-8111-111111111111';
const mockInstallation = jest.fn().mockResolvedValue(device);
const mockSession = jest.fn();
const mockRpc = jest.fn();
jest.mock('@/src/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args), auth: { getSession: () => mockSession() } } }));
jest.mock('../installation', () => ({ installationId: () => mockInstallation() }));

function respond(data: unknown) {
  const header = jest.fn();
  const execute = jest.fn((resolve: (value: unknown) => void) => resolve({ data, error: null }));
  const query = { abortSignal: jest.fn(), setHeader: header, then: execute };
  query.abortSignal.mockReturnValue(query); header.mockReturnValue(query); mockRpc.mockReturnValue(query);
  return { header, execute };
}

describe('account-bound referral transport', () => {
  beforeEach(() => { jest.clearAllMocks(); mockSession.mockResolvedValue({ data: { session: { user: { id: 'owner' }, access_token: 'fixture-token' } } }); });
  it('pins the initiating account and never sends a reward, beneficiary or date', async () => {
    const query = respond({ code });
    await expect(createInvitation('owner')).resolves.toBe(code);
    expect(mockRpc).toHaveBeenCalledWith('clutch_creer_invitation_v1', { p_installation: device });
    expect(query.header).toHaveBeenCalledWith('Authorization', 'Bearer fixture-token');
    respond({ acceptee: true, nouvelle: false });
    await expect(acceptInvitation(code, 'owner')).resolves.toEqual({ newReferral: false });
    expect(mockRpc).toHaveBeenLastCalledWith('clutch_accepter_invitation_v1', { p_code: code, p_installation: device });
  });
  it('does not dispatch a mutation if the account changed during local storage I/O', async () => {
    const query = respond({ acceptee: true, nouvelle: true });
    mockSession.mockResolvedValue({ data: { session: { user: { id: 'new-account' }, access_token: 'another-token' } } });
    await expect(acceptInvitation(code, 'owner')).rejects.toMatchObject({ reason: 'authentication_required' });
    expect(query.execute).not.toHaveBeenCalled();
  });
  it('uses only the public read RPC for an incoming anonymous invitation', async () => {
    respond({ valide: true, parrain: null, recompense_volts: 30, plafond_jour: 5, plafond_mois: 20 });
    await loadInvitation(code);
    expect(mockSession).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledWith('clutch_invitation_publique_v1', { p_code: code });
  });
  it('records share operations idempotently and keeps definitive rejection messages', async () => {
    respond(true);
    await expect(recordInvitationShare(device, 'owner')).resolves.toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('clutch_partager_invitation_v1', { p_operation: device });
    respond({ erreur: 'invite_self' });
    await expect(acceptInvitation(code, 'owner')).rejects.toMatchObject({ reason: 'invite_self' });
  });
});
