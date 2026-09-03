import { OWNER, OTHER_OWNER, payload, state } from '../__fixtures__/streak';
import { CallStreakError, parseCallStreakState, remainingStreakLabel, remainingStreakMs, streakDayMessage } from '../model';

describe('call-day streak contract', () => {
  it('keeps current/best, validated days, stock and real call counts separate', () => {
    expect(parseCallStreakState(payload, OWNER)).toMatchObject({ current: 6, best: 14, totalValidatedDays: 28,
      protectors: 1, protectorPrice: 90, selectedMilestone: 14, history: [
        { day: '2026-09-01', status: 'valide', calls: 3 },
        { day: '2026-09-02', status: 'valide', calls: 1 },
        { day: '2026-09-03', status: 'a_faire', calls: 0 },
      ] });
  });

  it.each([
    { user_id: OTHER_OWNER }, { version: 2 }, { jour: '2026-02-30' }, { serie_actuelle: 15 },
    { meilleure_serie: 29 }, { serie_actuelle: 1.5 }, { jours_valides: '28' }, { jour_valide: true },
    { solde_volts: -90 }, { prix_protecteur: 70 }, { stock_protecteurs: 3 }, { stock_max: 3 },
    { fin_journee: payload.heure_serveur }, { heure_serveur: 'not a date' }, { operation_achat: 'untrusted' },
    { jalon_selectionne: 30 }, { jalons: [{ palier: 15, obtenu_le: payload.heure_serveur }] },
    { jalons: [payload.jalons[0], payload.jalons[0]] },
    { historique: [payload.historique[0], payload.historique[0]] },
    { historique: [{ jour: '2026-09-04', etat: 'a_faire', calls: 0 }] },
    { historique: [{ jour: '2026-09-02', etat: 'protege', calls: 1 }] },
    { historique: [{ jour: '2026-09-02', etat: 'valide', calls: 0 }] },
    { protecteurs_historique: [{ ...payload.protecteurs_historique[0], type: 'utilisation' }] },
  ])('rejects an inconsistent server state: %j', (override) => {
    expect(() => parseCallStreakState({ ...payload, ...override }, OWNER)).toThrow(CallStreakError);
  });

  it('uses elapsed time, not the phone civil clock, including 23/25-hour days', () => {
    for (const hours of [23, 25]) {
      const dayEndsAt = new Date(Date.parse(state.serverNow) + hours * 3_600_000).toISOString();
      expect(remainingStreakMs({ ...state, dayEndsAt }, 100)).toBe(hours * 3_600_000 - 100);
    }
    expect(remainingStreakMs(state, -1)).toBe(14 * 3_600_000);
    expect(remainingStreakMs(state, 86_400_000)).toBe(0);
    expect(remainingStreakLabel(60_001)).toBe('2 min');
  });

  it('distinguishes a validated day, no opportunities and an expired opportunity', () => {
    expect(streakDayMessage(state)).toBe('Effectue un call aujourd’hui');
    expect(streakDayMessage({ ...state, todayValidated: true })).toBe('Journée validée');
    expect(streakDayMessage({ ...state, eligibleMatchId: null, hadOpportunityToday: false })).toContain('Sans call disponible');
    expect(streakDayMessage({ ...state, eligibleMatchId: null })).toContain('évaluée à minuit');
  });
});
