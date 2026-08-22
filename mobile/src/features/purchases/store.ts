import { Platform } from 'react-native';
import type {
  CustomerInfo,
  PurchasesError,
  PurchasesPackage,
} from 'react-native-purchases';

import {
  FOUNDER_ENTITLEMENT_ID,
  FOUNDER_OFFERING_ID,
  FOUNDER_PRODUCT_ID,
  type FounderPlatform,
  type FounderPurchaseOutcome,
  type FounderStoreSnapshot,
} from './types';

let configuredUserId: string | null = null;

export class FounderStoreError extends Error {
  constructor(
    public readonly code: 'mobile_only' | 'configuration_required' | 'product_unavailable' | 'store_error',
    message: string,
  ) {
    super(message);
    this.name = 'FounderStoreError';
  }
}

export function currentFounderPlatform(): FounderPlatform | null {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return null;
}

export async function loadFounderStoreSnapshot(userId: string): Promise<FounderStoreSnapshot> {
  const platform = currentFounderPlatform();
  if (!platform) {
    return {
      availability: 'mobile_only',
      localizedPrice: null,
      platform: null,
      entitlementActive: false,
    };
  }

  try {
    const { customerInfo, pack } = await loadFounderPackage(userId, platform);
    const entitlementActive = hasFounderEntitlement(customerInfo);
    return {
      availability: entitlementActive ? 'owned' : pack ? 'ready' : 'product_unavailable',
      localizedPrice: pack?.product.priceString ?? null,
      platform,
      entitlementActive,
    };
  } catch (error) {
    if (error instanceof FounderStoreError) {
      return {
        availability: error.code === 'configuration_required'
          ? 'configuration_required'
          : error.code === 'product_unavailable'
            ? 'product_unavailable'
            : 'mobile_only',
        localizedPrice: null,
        platform,
        entitlementActive: false,
      };
    }
    throw error;
  }
}

export async function purchaseFounderPack(userId: string): Promise<FounderPurchaseOutcome> {
  const platform = requireNativePlatform();
  const Purchases = await configurePurchases(userId, platform);
  const customerInfo = await Purchases.getCustomerInfo();
  if (hasFounderEntitlement(customerInfo)) {
    return { kind: 'already_owned', entitlementActive: true };
  }

  const { pack } = await loadFounderPackage(userId, platform);
  if (!pack) {
    throw new FounderStoreError('product_unavailable', 'Le produit Founder Pack est introuvable dans le store.');
  }

  try {
    const result = await Purchases.purchasePackage(pack);
    return {
      kind: 'purchased',
      entitlementActive: hasFounderEntitlement(result.customerInfo),
    };
  } catch (error) {
    const purchaseError = error as Partial<PurchasesError>;
    if (purchaseError.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { kind: 'cancelled', entitlementActive: false };
    }
    if (purchaseError.code === Purchases.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
      return { kind: 'pending', entitlementActive: false };
    }
    if (purchaseError.code === Purchases.PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
      return { kind: 'already_owned', entitlementActive: true };
    }
    throw new FounderStoreError('store_error', purchaseError.message || 'Le store a refusé cet achat.');
  }
}

export async function restoreFounderPack(userId: string): Promise<boolean> {
  const platform = requireNativePlatform();
  const Purchases = await configurePurchases(userId, platform);
  const customerInfo = await Purchases.restorePurchases();
  return hasFounderEntitlement(customerInfo);
}

async function loadFounderPackage(userId: string, platform: FounderPlatform) {
  const Purchases = await configurePurchases(userId, platform);
  const [offerings, customerInfo] = await Promise.all([
    Purchases.getOfferings(),
    Purchases.getCustomerInfo(),
  ]);
  const offering = offerings.all[FOUNDER_OFFERING_ID] ?? offerings.current;
  const pack = offering?.availablePackages.find(
    (candidate) => candidate.product.identifier === FOUNDER_PRODUCT_ID,
  ) ?? null;
  return { customerInfo, pack: pack as PurchasesPackage | null };
}

async function configurePurchases(userId: string, platform: FounderPlatform) {
  const apiKey = platform === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim()
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
  if (!apiKey) {
    throw new FounderStoreError(
      'configuration_required',
      `La clé RevenueCat ${platform === 'ios' ? 'iOS' : 'Android'} manque dans le build.`,
    );
  }

  const { default: Purchases } = await import('react-native-purchases');
  const configured = await Purchases.isConfigured();
  if (!configured) {
    Purchases.configure({
      apiKey,
      appUserID: userId,
      automaticDeviceIdentifierCollectionEnabled: false,
    });
    configuredUserId = userId;
    return Purchases;
  }

  if (configuredUserId !== userId) {
    try {
      await Purchases.logOut();
    } catch {
      // The current RevenueCat identity can already be anonymous after reload.
    }
    await Purchases.logIn(userId);
    configuredUserId = userId;
  }
  return Purchases;
}

function requireNativePlatform(): FounderPlatform {
  const platform = currentFounderPlatform();
  if (!platform) {
    throw new FounderStoreError('mobile_only', 'L’achat du Founder Pack est disponible sur iPhone et Android.');
  }
  return platform;
}

function hasFounderEntitlement(customerInfo: CustomerInfo) {
  return customerInfo.entitlements.active[FOUNDER_ENTITLEMENT_ID]?.isActive === true;
}
