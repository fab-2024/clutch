import type { CallStreakState } from './types';

export const PREVIEW_STREAK: CallStreakState = {
  userId: 'preview-streak', day: '2026-09-03', timeZone: 'Europe/Paris',
  serverNow: '2026-09-03T20:45:00+02:00', dayEndsAt: '2026-09-04T00:00:00+02:00',
  current: 6, best: 14, totalValidatedDays: 28, lastValidatedDay: '2026-09-02',
  todayValidated: false, eligibleMatchId: 'preview-only', hadOpportunityToday: true,
  protectors: 1, maxProtectors: 2, protectorPrice: 90, protectionUsed: false,
  purchaseOperationId: '00000000-0000-4000-8000-000000000090', volts: 310, selectedMilestone: 14,
  milestones: [3, 7, 14].map((days) => ({ days: days as 3 | 7 | 14, earnedAt: '2026-08-25T17:00:00+02:00' })),
  history: Array.from({ length: 14 }, (_, index) => ({
    day: new Date(Date.UTC(2026, 7, 21 + index)).toISOString().slice(0, 10),
    status: index === 13 ? 'a_faire' : index === 6 ? 'manque' : index === 2 ? 'protege' : index === 4 ? 'neutre' : 'valide',
    calls: [2, 4, 6, 13].includes(index) ? 0 : 1,
  })),
  protectorHistory: [{ id: '00000000-0000-4000-8000-000000000001', kind: 'bienvenue', quantity: 1, stockAfter: 1, createdAt: '2026-09-03T10:00:00+02:00' }],
};
