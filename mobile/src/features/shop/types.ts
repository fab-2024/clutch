export const COSMETIC_SLOTS = [
  'cadre_profil',
  'titre_profil',
  'apparence_core',
  'effet_faction',
  'carte_profil',
] as const;

export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];
export type CosmeticRarity = 'commun' | 'rare' | 'epique' | 'legendaire';

export type MonetizationRule = {
  id: string;
  label: string;
  detail: string;
};

export type MonetizationContract = {
  version: number;
  code: string;
  promise: string;
  currencies: {
    fragsPurchasable: boolean;
    fragsSpendable: boolean;
    voltsCosmeticOnly: boolean;
    voltsCashPurchaseEnabled: boolean;
    voltsExpire: boolean;
    voltsConvertibleToFrags: boolean;
  };
  catalog: {
    allowedSlots: CosmeticSlot[];
    paidRandomItems: boolean;
    ownedItemsExpire: boolean;
    competitiveEffects: boolean;
    idempotentPurchases: boolean;
  };
  partners: {
    rewardBasis: string;
    predictionAccuracyRewards: boolean;
    exposesPersonalData: boolean;
  };
  payments: {
    enabled: boolean;
    nativeStoreRequired: boolean;
  };
  rules: MonetizationRule[];
};

export type CosmeticItem = {
  id: string;
  slot: CosmeticSlot;
  level: number;
  name: string;
  description: string;
  rarity: CosmeticRarity;
  styleKey: string;
  accent: string;
  price: number;
  owned: boolean;
  equipped: boolean;
};

export type EquippedCosmetic = Omit<CosmeticItem, 'price' | 'owned' | 'equipped'>;

export type EquippedCosmetics = {
  frame: EquippedCosmetic | null;
  title: EquippedCosmetic | null;
  core: EquippedCosmetic | null;
  factionEffect: EquippedCosmetic | null;
  profileCard: EquippedCosmetic | null;
};

export type CosmeticShopData = {
  balance: number;
  items: CosmeticItem[];
  equipped: EquippedCosmetics;
  contract: MonetizationContract;
};

export type CosmeticMutation = {
  itemId: string;
  slot: CosmeticSlot;
  balance: number;
  purchased: boolean;
  equipped: boolean;
};

export const EMPTY_EQUIPPED_COSMETICS: EquippedCosmetics = {
  frame: null,
  title: null,
  core: null,
  factionEffect: null,
  profileCard: null,
};

export const DEFAULT_MONETIZATION_CONTRACT: MonetizationContract = {
  version: 1,
  code: 'identity_only_v1',
  promise: 'L’identité du supporter. Jamais ses performances.',
  currencies: {
    fragsPurchasable: false,
    fragsSpendable: false,
    voltsCosmeticOnly: true,
    voltsCashPurchaseEnabled: false,
    voltsExpire: false,
    voltsConvertibleToFrags: false,
  },
  catalog: {
    allowedSlots: [...COSMETIC_SLOTS],
    paidRandomItems: false,
    ownedItemsExpire: false,
    competitiveEffects: false,
    idempotentPurchases: true,
  },
  partners: {
    rewardBasis: 'participation_uniquement',
    predictionAccuracyRewards: false,
    exposesPersonalData: false,
  },
  payments: {
    enabled: false,
    nativeStoreRequired: true,
  },
  rules: [
    {
      id: 'competitive-integrity',
      label: 'FRAGS INACHETABLES',
      detail: 'Le rating, le rang et les résultats de Calls ne s’achètent jamais.',
    },
    {
      id: 'cosmetics-only',
      label: 'VOLTS COSMÉTIQUES',
      detail: 'Les Volts ne débloquent que des éléments d’identité visuelle.',
    },
    {
      id: 'no-randomness',
      label: 'AUCUNE LOOT BOX',
      detail: 'Chaque objet obtenu est connu avant la dépense.',
    },
    {
      id: 'permanent-ownership',
      label: 'OBJETS PERMANENTS',
      detail: 'Un objet possédé ne peut pas expirer.',
    },
    {
      id: 'partner-participation',
      label: 'PARTICIPATION, PAS JUSTESSE',
      detail: 'Une activation partenaire récompense une action, jamais un bon pronostic.',
    },
  ],
};
