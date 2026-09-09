/** Deferred to a future release. Keep catalog IDs, ownership and lab assets intact. */
export const SHOP_EFFECTS_ENABLED: boolean = false;

export function isShopItemAvailable(item: { slot: string }) {
  return SHOP_EFFECTS_ENABLED || item.slot !== 'effet_faction';
}
