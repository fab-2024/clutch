export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100] as const;
export type StreakMilestone = (typeof STREAK_MILESTONES)[number];
export type StreakDayStatus = 'valide' | 'protege' | 'neutre' | 'manque' | 'a_faire' | 'inactif';

export type CallStreakState = {
  userId: string;
  day: string;
  timeZone: string;
  serverNow: string;
  dayEndsAt: string;
  current: number;
  best: number;
  totalValidatedDays: number;
  lastValidatedDay: string | null;
  todayValidated: boolean;
  eligibleMatchId: string | null;
  hadOpportunityToday: boolean;
  protectors: number;
  maxProtectors: 2;
  protectorPrice: 90;
  purchaseOperationId: string;
  protectionUsed: boolean;
  selectedMilestone: StreakMilestone | null;
  volts: number;
  history: { day: string; status: StreakDayStatus; calls: number }[];
  milestones: { days: StreakMilestone; earnedAt: string }[];
  protectorHistory: { id: string; kind: 'bienvenue' | 'achat' | 'utilisation'; quantity: number; stockAfter: number; createdAt: string }[];
};

export type ProtectorPurchaseReceipt = {
  operationId: string;
  purchased: boolean;
  movementId: string;
  state: CallStreakState;
};
