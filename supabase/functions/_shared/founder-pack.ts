export const FOUNDER_PRODUCT_ID = "clutch_founder_pack_v1";
export const FOUNDER_ENTITLEMENT_ID = "founder_pack";

export type FounderPlatform = "ios" | "android";

type RevenueCatTransaction = {
  id?: unknown;
  is_sandbox?: unknown;
  purchase_date?: unknown;
  store?: unknown;
};

type RevenueCatEntitlement = {
  expires_date?: unknown;
  product_identifier?: unknown;
  purchase_date?: unknown;
};

export type FounderStoreProof = {
  active: boolean;
  transactionId: string | null;
  originalTransactionId: string | null;
  store: "app_store" | "play_store" | "test_store";
  environment: "sandbox" | "production";
  purchasedAt: string | null;
};

type RpcClient = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
};

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function normalizePlatform(value: unknown): FounderPlatform | null {
  if (value === "ios" || value === "android") return value;
  return null;
}

export function platformFromStore(value: unknown): FounderPlatform | null {
  const store = stringValue(value).toLowerCase();
  if (store === "app_store" || store === "mac_app_store") return "ios";
  if (store === "play_store") return "android";
  return null;
}

export function revenueCatServerKey(): string | null {
  return stringValue(Deno.env.get("REVENUECAT_SECRET_API_KEY")) || null;
}

export async function fetchFounderStoreProof(
  appUserId: string,
  platform: FounderPlatform,
): Promise<FounderStoreProof> {
  const apiKey = revenueCatServerKey();
  if (!apiKey) throw new Error("missing_revenuecat_secret_api_key");

  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    console.error("revenuecat_customer_lookup_failed", response.status, detail);
    throw new Error(`revenuecat_customer_${response.status}`);
  }

  const raw = asRecord(await response.json());
  const payload = Object.keys(asRecord(raw.value)).length ? asRecord(raw.value) : raw;
  const subscriber = asRecord(payload.subscriber);
  const entitlement = asRecord(asRecord(subscriber.entitlements)[FOUNDER_ENTITLEMENT_ID]) as RevenueCatEntitlement;
  const entitlementProduct = stringValue(entitlement.product_identifier);
  const expiresAt = nullableDate(entitlement.expires_date);
  const active = entitlementProduct === FOUNDER_PRODUCT_ID &&
    (expiresAt === null || Date.parse(expiresAt) > Date.now());

  const nonSubscriptions = asRecord(subscriber.non_subscriptions);
  const transactions = Array.isArray(nonSubscriptions[FOUNDER_PRODUCT_ID])
    ? nonSubscriptions[FOUNDER_PRODUCT_ID] as RevenueCatTransaction[]
    : [];
  const latest = [...transactions].sort((left, right) =>
    dateMillis(right.purchase_date) - dateMillis(left.purchase_date)
  )[0];

  if (active && !latest) throw new Error("revenuecat_active_entitlement_without_transaction");

  const transactionId = latest ? stringValue(latest.id) || null : null;
  const store = latest
    ? normalizeStore(latest.store, platform)
    : platform === "ios" ? "app_store" : "play_store";
  const purchasedAt = latest
    ? nullableDate(latest.purchase_date)
    : nullableDate(entitlement.purchase_date);

  if (active && (!transactionId || !purchasedAt)) {
    throw new Error("revenuecat_incomplete_founder_transaction");
  }

  return {
    active,
    transactionId,
    originalTransactionId: transactionId,
    store,
    environment: latest?.is_sandbox === true ? "sandbox" : "production",
    purchasedAt,
  };
}

export async function applyFounderStoreProof(
  supabase: RpcClient,
  input: {
    userId: string;
    eventId: string;
    eventType: string;
    source: "sync" | "webhook";
    proof: FounderStoreProof;
  },
): Promise<unknown> {
  const { data, error } = await supabase.rpc(
    "clutch_appliquer_statut_founder_pack_v1",
    {
      p_user: input.userId,
      p_evenement_id: normalizeEventId(input.eventId),
      p_type_evenement: normalizeEventType(input.eventType),
      p_actif: input.proof.active,
      p_transaction_id: input.proof.transactionId,
      p_transaction_originale_id: input.proof.originalTransactionId,
      p_store: input.proof.store,
      p_environnement: input.proof.environment,
      p_achete_le: input.proof.purchasedAt,
      p_source: input.source,
    },
  );
  if (error) throw new Error(error.message || "founder_pack_database_reconciliation_failed");
  return data;
}

export function normalizeEventId(value: unknown): string {
  const normalized = stringValue(value).replace(/[^A-Za-z0-9:._-]/g, "_").slice(0, 256);
  return normalized || `event:${crypto.randomUUID()}`;
}

export function normalizeEventType(value: unknown): string {
  const normalized = stringValue(value).toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 64);
  return /^[A-Z]/.test(normalized) ? normalized : "SYNC";
}

export async function secretsMatch(actual: string | null, expected: string): Promise<boolean> {
  if (!actual || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function normalizeStore(
  value: unknown,
  fallback: FounderPlatform,
): FounderStoreProof["store"] {
  const store = stringValue(value).toLowerCase();
  if (store === "app_store" || store === "play_store" || store === "test_store") return store;
  return fallback === "ios" ? "app_store" : "play_store";
}

function nullableDate(value: unknown): string | null {
  const date = stringValue(value);
  return date && Number.isFinite(Date.parse(date)) ? date : null;
}

function dateMillis(value: unknown): number {
  const parsed = Date.parse(stringValue(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
