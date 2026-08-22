export const FOUNDER_PRODUCT_ID = 'clutch_founder_pack_v1';
export const FOUNDER_ENTITLEMENT_ID = 'founder_pack';
export const FOUNDER_OFFERING_ID = 'founder_launch';

export type FounderPlatform = 'ios' | 'android';
export type FounderPackState = 'available' | 'active' | 'refunded' | 'revoked' | 'transferred' | 'legacy';

export type FounderPackItem = {
  id: string;
  slot: 'cadre_profil' | 'titre_profil' | 'effet_faction' | 'carte_profil';
  name: string;
  description: string;
  styleKey: string;
  accent: string;
  owned: boolean;
  equipped: boolean;
};

export type FounderPackStatus = {
  version: number;
  productId: string;
  entitlementId: string;
  offeringId: string;
  type: 'non_consumable';
  indicativePrice: string;
  storePriceRequired: boolean;
  voltsIncluded: number;
  packActive: boolean;
  legacyFounder: boolean;
  isFounder: boolean;
  state: FounderPackState;
  store: string | null;
  environment: 'sandbox' | 'production' | null;
  purchasedAt: string | null;
  restorable: boolean;
  items: FounderPackItem[];
};

export type FounderStoreAvailability =
  | 'ready'
  | 'owned'
  | 'mobile_only'
  | 'configuration_required'
  | 'product_unavailable';

export type FounderStoreSnapshot = {
  availability: FounderStoreAvailability;
  localizedPrice: string | null;
  platform: FounderPlatform | null;
  entitlementActive: boolean;
};

export type FounderPurchaseOutcome =
  | { kind: 'purchased'; entitlementActive: boolean }
  | { kind: 'already_owned'; entitlementActive: true }
  | { kind: 'cancelled'; entitlementActive: false }
  | { kind: 'pending'; entitlementActive: false };

export type FounderSyncAction = 'status' | 'purchase' | 'restore';
