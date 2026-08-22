/// <reference types="jest" />

import { deactivateAllNotificationTokens, deactivateNotificationDevice } from '../api';

jest.mock('@/src/lib/supabase', () => ({
  supabase: { rpc: jest.fn() },
}));

const { supabase } = jest.requireMock('@/src/lib/supabase') as {
  supabase: { rpc: jest.Mock };
};

const mockRpc = supabase.rpc;

describe('push destination logout APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deactivates only the stable current device on a normal logout', async () => {
    mockRpc.mockResolvedValue({ data: 1, error: null });

    await expect(deactivateNotificationDevice('clutch-device-123')).resolves.toBe(1);
    expect(mockRpc).toHaveBeenCalledWith('clutch_desactiver_mon_appareil_notification_v1', {
      p_appareil_id: 'clutch-device-123',
    });
  });

  it('keeps an explicit global revocation primitive', async () => {
    mockRpc.mockResolvedValue({ data: 3, error: null });

    await expect(deactivateAllNotificationTokens()).resolves.toBe(3);
    expect(mockRpc).toHaveBeenCalledWith('clutch_desactiver_mes_jetons_notification_v1');
  });

  it('fails closed when Supabase cannot acknowledge revocation', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('network') });

    await expect(deactivateNotificationDevice('clutch-device-123')).rejects.toThrow('network');
  });
});
