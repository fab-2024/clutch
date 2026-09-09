import type { CallStreakState } from './types';

export const PREVIEW_STREAK: CallStreakState = {
  userId: 'preview-streak', day: '2026-09-07', timeZone: 'Europe/Paris',
  serverNow: '2026-09-07T12:33:00+02:00', dayEndsAt: '2026-09-08T00:00:00+02:00',
  current: 7, best: 12, totalValidatedDays: 28, lastValidatedDay: '2026-09-07',
  todayValidated: true, eligibleMatchId: 'preview-only', hadOpportunityToday: true,
  protectors: 1, maxProtectors: 2, protectorPrice: 90, protectionUsed: false,
  purchaseOperationId: '00000000-0000-4000-8000-000000000090', volts: 310, selectedMilestone: null,
  rewards: [{ days: 7, volts: 50, rewardedAt: '2026-09-07T11:00:00+02:00' }, { days: 14, volts: 100, rewardedAt: null }],
  milestones: [3, 7].map((days) => ({ days: days as 3 | 7, earnedAt: '2026-09-07T11:00:00+02:00' })),
  history: Array.from({ length: 14 }, (_, index) => ({
    day: new Date(Date.UTC(2026, 7, 25 + index)).toISOString().slice(0, 10),
    status: index === 10 ? 'protege' : [1, 5, 9, 12].includes(index) ? 'neutre' : 'valide',
    calls: [1, 5, 9, 10, 12].includes(index) ? 0 : 1,
  })),
  protectorHistory: [{ id: '00000000-0000-4000-8000-000000000001', kind: 'bienvenue', quantity: 1, stockAfter: 1, createdAt: '2026-09-03T10:00:00+02:00' }],
};

/** Reference layout: five completed call days, with today's sixth still pending. */
export const PREVIEW_STREAK_FIVE: CallStreakState = {
  ...PREVIEW_STREAK, current: 5, best: 5, totalValidatedDays: 5,
  todayValidated: false, lastValidatedDay: '2026-09-06',
  milestones: [{ days: 3, earnedAt: '2026-09-04T11:00:00+02:00' }],
  rewards: [{ days: 7, volts: 50, rewardedAt: null }, { days: 14, volts: 100, rewardedAt: null }],
  history: Array.from({ length: 6 }, (_, index) => ({
    day: `2026-09-${String(index + 2).padStart(2, '0')}`,
    status: index === 5 ? 'a_faire' : 'valide', calls: index === 5 ? 0 : 1,
  })),
};
