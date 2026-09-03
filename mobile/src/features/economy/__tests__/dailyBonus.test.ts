import { claimDailyVoltBonus, loadVoltLedger } from '../api';
import { DailyBonusError, nextBonusDelay, parseDailyBonusReceipt } from '../dailyBonus';

jest.mock('@/src/lib/supabase', () => ({ supabase: { rpc: jest.fn() } }));
const { supabase } = jest.requireMock('@/src/lib/supabase') as { supabase: { rpc: jest.Mock } };

const payload = {
  user_id: 'player-a', attribue: true, montant: 10, montant_quotidien: 10, solde: 310,
  mouvement_id: 'movement-1', jour: '2026-09-03', fuseau: 'Europe/Paris',
  attribue_le: '2026-09-03T08:00:00Z', heure_serveur: '2026-09-03T08:00:00Z',
  prochain_bonus_le: '2026-09-03T22:00:00Z',
};

describe('daily bonus contract', () => {
  beforeEach(() => { jest.clearAllMocks(); jest.useFakeTimers(); });
  afterEach(() => jest.useRealTimers());

  it('accepts exactly ten Volts and a zero-value replay', () => {
    expect(parseDailyBonusReceipt(payload, 'player-a')).toMatchObject({ awarded: true, amount: 10, balance: 310 });
    expect(parseDailyBonusReceipt({ ...payload, attribue: false, montant: 0 }, 'player-a'))
      .toMatchObject({ awarded: false, amount: 0, balance: 310 });
  });

  it.each([
    { user_id: 'player-b' }, { montant: 20 }, { montant: '10' }, { montant_quotidien: 20 },
    { attribue: false }, { solde: -1 }, { solde: 1.5 }, { mouvement_id: '' },
    { heure_serveur: 'invalid' }, { jour: 'today' }, { prochain_bonus_le: payload.heure_serveur },
  ])('rejects an inconsistent receipt: %j', (override) => {
    expect(() => parseDailyBonusReceipt({ ...payload, ...override }, 'player-a')).toThrow(DailyBonusError);
  });

  it('sends only the timezone and validates the response owner', async () => {
    const abortSignal = jest.fn().mockResolvedValue({ data: payload, error: null });
    supabase.rpc.mockReturnValue({ abortSignal });
    await expect(claimDailyVoltBonus('player-a', 'Europe/Paris')).resolves.toMatchObject({ amount: 10 });
    expect(supabase.rpc).toHaveBeenCalledWith('clutch_reclamer_bonus_quotidien_v1', { p_fuseau: 'Europe/Paris' });
    expect(abortSignal).toHaveBeenCalledWith(expect.objectContaining({ aborted: false }));
    expect(jest.getTimerCount()).toBe(0);
    await expect(claimDailyVoltBonus('player-b', 'Europe/Paris')).rejects.toMatchObject({ retryable: false });
  });

  it.each(['28000', '42501', '22023', 'PGRST202', '42883'])('does not loop on permanent error %s', async (code) => {
    supabase.rpc.mockReturnValue({ abortSignal: jest.fn().mockResolvedValue({ data: null, error: { code } }) });
    await expect(claimDailyVoltBonus('player-a', 'UTC')).rejects.toMatchObject({ code, retryable: false });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('bounds a network request and lets the session retry safely', async () => {
    supabase.rpc.mockReturnValue({
      abortSignal: (signal: AbortSignal) => new Promise((_, reject) => {
        signal.addEventListener('abort', () => reject(new Error('timeout')), { once: true });
      }),
    });
    const outcome = claimDailyVoltBonus('player-a', 'UTC').catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(15_000);
    expect(await outcome).toMatchObject({ code: 'network', retryable: true });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('uses the server interval even when the phone clock is wrong', () => {
    jest.setSystemTime(new Date('2099-01-01'));
    const receipt = parseDailyBonusReceipt(payload, 'player-a');
    expect(nextBonusDelay(receipt, 250)).toBe(14 * 3_600_000 - 250);
    for (const hours of [23, 25]) {
      const nextAvailableAt = new Date(Date.parse(receipt.serverNow) + hours * 3_600_000).toISOString();
      expect(nextBonusDelay({ ...receipt, nextAvailableAt })).toBe(hours * 3_600_000);
    }
    expect(nextBonusDelay(receipt, 100_000_000)).toBe(1_000);
  });

  it('preserves the daily source and dated balance in the existing ledger', async () => {
    supabase.rpc.mockResolvedValue({ error: null, data: {
      solde: 310, has_more: false,
      integrite: { conversion_volts_vers_frags: false, impact_classement: false },
      mouvements: [{ id: 'bonus-1', montant: 10, source_economique: 'bonus_quotidien', origine: 'bonus_quotidien',
        reference: payload.jour, date: payload.attribue_le, cle_idempotence: `bonus_quotidien:${payload.jour}`, solde_apres: 310 }],
    } });
    expect(await loadVoltLedger()).toMatchObject({ balance: 310, movements: [
      { source: 'bonus_quotidien', amount: 10, createdAt: payload.attribue_le, balanceAfter: 310 },
    ] });
  });
});
