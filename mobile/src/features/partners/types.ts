export type PartnerCampaignTaskType = 'match_follow' | 'calls' | 'faction_mission';

export type PartnerCampaign = {
  key: string;
  name: string;
  partner: string;
  fictionalPartner: boolean;
  description: string;
  startsAt: string;
  endsAt: string;
  status: string;
  accent: string;
  collectionKey: string;
};

export type PartnerCampaignTask = {
  key: string;
  type: PartnerCampaignTaskType;
  title: string;
  description: string;
  goal: number;
  progress: number;
  completed: boolean;
  order: number;
};

export type PartnerCampaignReward = {
  id: string;
  slot: 'cadre_profil' | 'titre_profil' | 'effet_faction';
  family: string;
  name: string;
  description: string;
  rarity: string;
  styleKey: string;
  accent: string;
  owned: boolean;
  equipped: boolean;
};

export type PartnerCampaignMatch = {
  id: string;
  startsAt: string;
  status: 'a_venir' | 'en_cours';
  game: string;
  event: string;
  teamA: string;
  tagA: string;
  teamB: string;
  tagB: string;
  followed: boolean;
};

export type PartnerCampaignData = {
  campaign: PartnerCampaign;
  eligible: boolean;
  joined: boolean;
  joinedAt: string | null;
  completed: boolean;
  completedAt: string | null;
  rewardClaimed: boolean;
  rewardClaimedAt: string | null;
  progress: { current: number; goal: number };
  tasks: PartnerCampaignTask[];
  rewards: PartnerCampaignReward[];
  matches: PartnerCampaignMatch[];
  rewardRule: 'participation_uniquement';
  callAccuracyRewarded: false;
  newParticipation?: boolean;
};

export type RetentionMetric = {
  cohort: number;
  retained: number;
  rate: number | null;
};

export type PartnerCampaignMetrics = {
  source: string;
  eligibleUsers: number;
  uniqueImpressions: number;
  participants: number;
  completions: number;
  rewardsClaimed: number;
  equippedItems: number;
  usersWithEquippedItem: number;
  participationRate: number;
  completionRate: number;
  claimRate: number;
  retention7: RetentionMetric;
  retention30: RetentionMetric;
};

export type PartnerCampaignDemoMetrics = Omit<PartnerCampaignMetrics, 'retention7' | 'retention30'> & {
  label: string;
  retention7: RetentionMetric;
  retention30: RetentionMetric;
};

export type PartnerCampaignReport = {
  campaign: Pick<PartnerCampaign, 'key' | 'name' | 'partner' | 'fictionalPartner' | 'startsAt' | 'endsAt' | 'accent'>;
  live: PartnerCampaignMetrics;
  demonstration: PartnerCampaignDemoMetrics;
  partnerExport: {
    publishable: boolean;
    privacyThreshold: number;
    blockedReason: string | null;
  };
  privacy: {
    personalData: boolean;
    userIdentifiers: boolean;
    aggregatesOnly: boolean;
    smallCohortsMasked: boolean;
  };
};
