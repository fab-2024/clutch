export const COSMETIC_SLOTS = [
  'cadre_profil',
  'titre_profil',
  'apparence_core',
  'effet_faction',
  'carte_profil',
] as const;

export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];
export type CosmeticRarity = 'commun' | 'rare' | 'epique' | 'legendaire';

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
