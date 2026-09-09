export const COSMETIC_PACK_PRICE = '2,99 €';
export const STORE_PACK_IDS = [
  'sang-des-titans', 'chute-libre', 'serment-du-givre', 'conclave-arcanique',
  'turbo-arena', 'dernier-round',
] as const;

export function packStoreProductId(packId: string): string | null {
  return STORE_PACK_IDS.some((id) => id === packId)
    ? `clutch_pack_${packId.replace(/-/g, '_')}_v1` : null;
}
export function packEntitlementId(packId: string) {
  return `pack_${packId.replace(/-/g, '_')}`;
}
