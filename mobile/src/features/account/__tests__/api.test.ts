/// <reference types="jest" />

import { deleteCurrentAccount } from '../api';

jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: { signOut: jest.fn() },
    functions: { invoke: jest.fn() },
  },
}));

const { supabase } = jest.requireMock('@/src/lib/supabase') as {
  supabase: {
    auth: { signOut: jest.Mock };
    functions: { invoke: jest.Mock };
  };
};

const mockInvoke = supabase.functions.invoke;
const mockSignOut = supabase.auth.signOut;

describe('account deletion API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears the local session only after coordinated server success', async () => {
    mockInvoke.mockResolvedValue({
      data: { deleted: true, provider_cleanup: 'already_deleted' },
      error: null,
    });
    mockSignOut.mockResolvedValue({ error: null });

    await expect(deleteCurrentAccount()).resolves.toEqual({
      deleted: true,
      providerCleanup: 'already_deleted',
    });
    expect(mockInvoke).toHaveBeenCalledWith('clutch-account-delete', {
      body: { confirmation: 'DELETE' },
    });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('keeps the local session when the server does not confirm deletion', async () => {
    mockInvoke.mockResolvedValue({ data: { deleted: false }, error: null });

    await expect(deleteCurrentAccount()).rejects.toThrow('account_deletion_incomplete');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('propagates a provider failure without pretending deletion succeeded', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error('revenuecat_cleanup_failed') });

    await expect(deleteCurrentAccount()).rejects.toThrow('revenuecat_cleanup_failed');
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
