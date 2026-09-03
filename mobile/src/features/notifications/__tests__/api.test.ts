/// <reference types="jest" />

import { deactivateAllNotificationTokens, deactivateNotificationDevice, loadNotificationPreferences, recordNotificationOpened, saveNotificationPreferences } from '../api';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../types';

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

describe('P1 notification preferences', () => {
  beforeEach(() => jest.clearAllMocks());

  it('round-trips independent categories and a midnight-crossing quiet range atomically', async () => {
    mockRpc.mockResolvedValue({ error: null, data: { retention_disponible: true, fuseau: 'Europe/Paris',
      serie_en_danger: false, serie_protegee: true, silence_actif: true, silence_debut: 1320, silence_fin: 480,
      verrouillage_imminent: false, verdict: true, appareils_actifs: 2 } });
    const preferences = await loadNotificationPreferences();
    expect(preferences).toMatchObject({ streakRisk: false, streakProtected: true, quietHoursEnabled: true,
      quietHoursStart: 1320, quietHoursEnd: 480, retentionAvailable: true, lockImminent: false, verdict: true });
    await saveNotificationPreferences(preferences);
    expect(mockRpc).toHaveBeenLastCalledWith('clutch_enregistrer_preferences_notification_v2', expect.objectContaining({
      p_fuseau: 'Europe/Paris', p_serie_en_danger: false, p_serie_protegee: true,
      p_silence_actif: true, p_silence_debut: 1320, p_silence_fin: 480,
      p_verrouillage_imminent: false, p_verdict: true,
    }));
  });

  it('keeps legacy settings usable before P1 is deployed without pretending streak preferences are saved', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } })
      .mockResolvedValueOnce({ error: null, data: { fuseau: 'UTC', verdict: false } });
    const preferences = await loadNotificationPreferences();
    expect(preferences.retentionAvailable).toBe(false);
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'clutch_mes_preferences_notification_v1');
    mockRpc.mockResolvedValue({ data: { fuseau: 'UTC', verdict: false }, error: null });
    await saveNotificationPreferences(preferences);
    const [rpc, args] = mockRpc.mock.calls[2];
    expect(rpc).toBe('clutch_enregistrer_preferences_notification_v1');
    expect(args).not.toHaveProperty('p_serie_en_danger');
    expect(args.p_verdict).toBe(false);
  });

  it('does not hide a real save/network failure behind a v1 fallback', async () => {
    mockRpc.mockResolvedValue({ error: new Error('offline'), data: null });
    await expect(loadNotificationPreferences()).rejects.toThrow('offline');
    expect(mockRpc).toHaveBeenCalledTimes(1);
    await expect(saveNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES)).rejects.toThrow('offline');
  });

  it('acknowledges a notification ID through the owner-checked endpoint', async () => {
    mockRpc.mockReturnValue({ abortSignal: jest.fn().mockResolvedValue({ error: null, data: false }) });
    await expect(recordNotificationOpened('an-event')).resolves.toBe(false);
    expect(mockRpc).toHaveBeenCalledWith('clutch_ouvrir_notification_v2', { p_notification_id: 'an-event' });
  });

  it('aborts a stalled opening acknowledgement so offline navigation can recover', async () => {
    jest.useFakeTimers();
    try {
      let requestSignal: AbortSignal | undefined;
      mockRpc.mockReturnValue({ abortSignal: (signal: AbortSignal) => {
        requestSignal = signal;
        return new Promise((resolve) => {
          signal.addEventListener('abort', () => resolve({ data: null, error: new Error('request aborted') }), { once: true });
        });
      } });
      const opening = recordNotificationOpened('an-event');
      const rejected = expect(opening).rejects.toThrow('request aborted');
      await jest.advanceTimersByTimeAsync(3_000);
      await rejected;
      expect(requestSignal?.aborted).toBe(true);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
