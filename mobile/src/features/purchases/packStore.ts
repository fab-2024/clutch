import type { PurchasesError } from 'react-native-purchases';

import { packEntitlementId, packStoreProductId } from './cosmeticPacks';
import { configurePurchases, currentStorePlatform } from './store';

export type PackStoreSnapshot = {
  availability: 'ready' | 'owned' | 'unavailable' | 'mobile_only';
  localizedPrice: string | null;
};
export type PackPurchaseOutcome = 'purchased' | 'already_owned' | 'cancelled' | 'pending';

async function packStore(userId: string, packId: string) {
  const platform = currentStorePlatform();
  const productId = packStoreProductId(packId);
  if (!platform || !productId) throw new Error('Cet achat est disponible dans l’application iPhone ou Android.');
  try {
    return { Purchases: await configurePurchases(userId, platform), productId };
  } catch {
    throw new Error('Les achats et leur restauration ne sont pas encore disponibles. Réessaie plus tard.');
  }
}

export async function loadPackStore(userId: string, packId: string): Promise<PackStoreSnapshot> {
  if (!currentStorePlatform()) return { availability: 'mobile_only', localizedPrice: null };
  const { Purchases, productId } = await packStore(userId, packId);
  const [products, customer] = await Promise.all([
    Purchases.getProducts([productId], Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION),
    Purchases.getCustomerInfo(),
  ]);
  const product = products.find((item) => item.identifier === productId);
  return {
    availability: customer.entitlements.active[packEntitlementId(packId)]?.isActive
      ? 'owned' : product ? 'ready' : 'unavailable',
    localizedPrice: product?.priceString ?? null,
  };
}

export async function purchasePackFromStore(userId: string, packId: string): Promise<PackPurchaseOutcome> {
  const { Purchases, productId } = await packStore(userId, packId);
  const customer = await Purchases.getCustomerInfo();
  if (customer.entitlements.active[packEntitlementId(packId)]?.isActive) return 'already_owned';
  const products = await Purchases.getProducts([productId], Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
  const product = products.find((item) => item.identifier === productId);
  if (!product) throw new Error('Ce pack n’est pas encore disponible à l’achat.');
  try {
    await Purchases.purchaseStoreProduct(product);
    return 'purchased';
  } catch (error) {
    const failure = error as Partial<PurchasesError>;
    if (failure.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    if (failure.code === Purchases.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
    if (failure.code === Purchases.PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) return 'already_owned';
    throw new Error(failure.message || 'L’achat n’a pas pu être effectué.');
  }
}

export async function restorePackPurchases(userId: string, packId: string) {
  const { Purchases } = await packStore(userId, packId);
  await Purchases.restorePurchases();
}
