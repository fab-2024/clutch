export const COSMETIC_SLOTS = [
  'cadre_profil',
  'titre_profil',
  'apparence_core',
  'effet_faction',
  'carte_profil',
] as const;

export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];
export type CosmeticRarity = 'commun' | 'rare' | 'epique' | 'legendaire';

export const COSMETIC_FAMILIES = [
  'cadre_avatar',
  'banniere',
  'titre_supporter',
  'signature_relique',
  'core_clutch',
] as const;

export type CosmeticFamily = (typeof COSMETIC_FAMILIES)[number];

export const COSMETIC_SOURCES = [
  'gratuit',
  'mission',
  'partenaire',
  'achat',
  'founder_pack',
] as const;

export type CosmeticSource = (typeof COSMETIC_SOURCES)[number];
export type CosmeticPublicationStatus = 'brouillon' | 'publie' | 'retire';

export const COSMETIC_FAMILY_BY_SLOT: Record<CosmeticSlot, CosmeticFamily> = {
  cadre_profil: 'cadre_avatar',
  titre_profil: 'titre_supporter',
  apparence_core: 'core_clutch',
  effet_faction: 'signature_relique',
  carte_profil: 'banniere',
};

export type CosmeticTeam = {
  id: string;
  name: string;
  tag: string;
  logo: string | null;
};

export type CosmeticLicense = {
  type: string;
  holder: string;
};

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
    schemaVersion: number;
    allowedSlots: CosmeticSlot[];
    initialFamilies: CosmeticFamily[];
    extensionFamilies: CosmeticFamily[];
    sources: CosmeticSource[];
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
  family: CosmeticFamily;
  level: number;
  name: string;
  description: string;
  rarity: CosmeticRarity;
  styleKey: string;
  accent: string;
  price: number;
  collectionKey: string;
  source: CosmeticSource;
  team: CosmeticTeam | null;
  brandKey: string | null;
  campaignKey: string | null;
  seasonId: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  publicationStatus: CosmeticPublicationStatus;
  license: CosmeticLicense;
  included: boolean;
  available: boolean;
  acquirable: boolean;
  owned: boolean;
  equipped: boolean;
};

export type EquippedCosmetic = Pick<
  CosmeticItem,
  'id' | 'slot' | 'level' | 'name' | 'description' | 'rarity' | 'styleKey' | 'accent'
>;

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
    schemaVersion: 2,
    allowedSlots: [...COSMETIC_SLOTS],
    initialFamilies: ['cadre_avatar', 'banniere', 'titre_supporter', 'signature_relique'],
    extensionFamilies: ['core_clutch'],
    sources: [...COSMETIC_SOURCES],
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
