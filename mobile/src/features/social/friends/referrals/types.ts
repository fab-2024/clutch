export type ReferralReward = 'en_attente' | 'attribuee' | 'plafonnee' | 'verification';
export type InvitationInfo = { inviter: string | null; reward: number; dailyCap: number; monthlyCap: number };
export type ReferralDashboard = {
  code: string | null; shares: number; registered: number; active: number; volts: number;
  rewardedToday: number; rewardedThisMonth: number; reward: number; dailyCap: number; monthlyCap: number;
  alreadyReferred: boolean;
  history: { id: string; registeredAt: string; activatedAt: string | null; reward: ReferralReward }[];
};
