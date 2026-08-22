export type PlayerEconomy = {
  frags: number | null;
  volts: number | null;
  seasonId: string | null;
};

export type VoltMovementSource =
  | 'onboarding'
  | 'progression'
  | 'mission'
  | 'activation'
  | 'exceptionnelle'
  | 'achat_cosmetique'
  | 'ajustement';

export type VoltMovementObject = {
  id: string;
  name: string;
  slot: string;
};

export type VoltMovement = {
  id: string;
  amount: number;
  source: VoltMovementSource;
  origin: string;
  reference: string;
  object: VoltMovementObject | null;
  campaignKey: string | null;
  createdAt: string;
  idempotencyKey: string;
  balanceAfter: number;
};

export type VoltLedger = {
  balance: number;
  movements: VoltMovement[];
  hasMore: boolean;
  integrity: {
    convertsToFrags: false;
    affectsRanking: false;
  };
};
