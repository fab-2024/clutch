import { isUuid, revenueCatServerKey } from './founder-pack.ts';

export const PACK_IDS = ['sang-des-titans','chute-libre','serment-du-givre','conclave-arcanique','turbo-arena','dernier-round'] as const;
export const productId = (id: string) => `clutch_pack_${id.replace(/-/g, '_')}_v1`;
export const entitlementId = (id: string) => `pack_${id.replace(/-/g, '_')}`;
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const date = (value: unknown): string | null => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;

export function parsePackProofs(payload: unknown, now = Date.now()) {
  const subscriber = record(record(payload).subscriber);
  if (!subscriber.entitlements || !subscriber.non_subscriptions) throw new Error('invalid_revenuecat_snapshot');
  return PACK_IDS.map((pack_id) => {
    const product_id = productId(pack_id);
    const right = record(record(subscriber.entitlements)[entitlementId(pack_id)]);
    if (right.expires_date != null && !date(right.expires_date)) throw new Error('invalid_entitlement_expiry');
    const active = right.product_identifier === product_id && (right.expires_date == null || Date.parse(String(right.expires_date)) > now);
    if (!active) return { pack_id, product_id, active: false };
    const rows = record(subscriber.non_subscriptions)[product_id];
    if (!Array.isArray(rows)) throw new Error('missing_pack_transaction');
    const transaction = rows.map(record).filter((row) => date(row.purchase_date))
      .sort((a,b) => Date.parse(String(b.purchase_date))-Date.parse(String(a.purchase_date)))[0];
    if (!transaction || typeof transaction.id !== 'string' || !transaction.id.trim()
      || !['app_store','play_store','test_store'].includes(String(transaction.store))
      || typeof transaction.is_sandbox !== 'boolean') throw new Error('invalid_pack_transaction');
    return { pack_id, product_id, active: true, transaction_id: transaction.id,
      store: transaction.store, environment: transaction.is_sandbox ? 'sandbox' : 'production',
      purchased_at: transaction.purchase_date };
  });
}

export async function fetchPackProofs(userId: string) {
  if (!isUuid(userId)) throw new Error('invalid_user');
  const secret = revenueCatServerKey();
  if (!secret) throw new Error('missing_revenuecat_configuration');
  const verifiedAt = new Date().toISOString();
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`revenuecat_lookup_${response.status}`);
  return { verifiedAt, proofs: parsePackProofs(await response.json()) };
}

type Client = { rpc(name: string,args: Record<string,unknown>): PromiseLike<{ error: {message?:string}|null }> };
export async function reconcilePacks(client: Client, userId: string) {
  const { verifiedAt, proofs } = await fetchPackProofs(userId);
  const { error } = await client.rpc('clutch_synchroniser_packs_store_v1', {
    p_user: userId, p_verifie_le: verifiedAt, p_preuves: proofs,
  });
  if (error) throw new Error(error.message || 'pack_reconciliation_failed');
}

export function packWebhookUsers(event: Record<string,unknown>) {
  const arr = (value: unknown) => Array.isArray(value) ? value.filter(isUuid) : [];
  if (event.type === 'TRANSFER') return [...new Set([...arr(event.transferred_from), ...arr(event.transferred_to)])];
  const user = [event.app_user_id,event.original_app_user_id,...arr(event.aliases)].find(isUuid);
  return user ? [user] : [];
}
