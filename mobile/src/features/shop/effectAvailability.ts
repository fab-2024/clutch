/** Deferred to a future release. Keep catalog IDs, ownership and lab assets intact. */
export const SHOP_EFFECTS_ENABLED: boolean = false;

const CURRENT_CABINET_IDS = new Set(['supports_gallery', 'cabinet_galerie', 'cabinet_midnight']);
const RETIRED_SHOWCASE_SLOTS = new Set([
  'vitrine_materiau', 'vitrine_eclairage', 'vitrine_supports', 'vitrine_rang', 'vitrine_maillot',
]);

/** Hide retired fittings from sale without removing them from player inventories. */
export function isShopItemAvailable(item: { id?: string; slot: string }) {
  if (RETIRED_SHOWCASE_SLOTS.has(item.slot)) return CURRENT_CABINET_IDS.has(item.id ?? '');
  return SHOP_EFFECTS_ENABLED || item.slot !== 'effet_faction';
}
