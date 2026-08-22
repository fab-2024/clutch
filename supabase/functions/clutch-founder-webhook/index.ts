import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.112.3";

import {
  applyFounderStoreProof,
  fetchFounderStoreProof,
  isUuid,
  normalizeEventId,
  normalizeEventType,
  platformFromStore,
  secretsMatch,
} from "../_shared/founder-pack.ts";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const expectedAuthorization = Deno.env.get("REVENUECAT_WEBHOOK_AUTH")?.trim() ?? "";
  if (!supabaseUrl || !serviceRoleKey || !expectedAuthorization) {
    return Response.json({ error: "missing_runtime_configuration" }, { status: 500 });
  }

  if (!await secretsMatch(request.headers.get("Authorization"), expectedAuthorization)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    const parsed = await request.json();
    payload = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const event = asRecord(payload.event);
  const eventType = normalizeEventType(event.type);
  const eventId = normalizeEventId(event.id);
  if (eventType === "TEST") {
    return Response.json({ ok: true, test: true });
  }

  const userIds = collectUserIds(event, eventType);
  if (!userIds.length) {
    console.warn("clutch-founder-webhook ignored event without identified UUID", eventType, eventId);
    return Response.json({ ok: true, ignored: "unattributed_customer" });
  }

  const platform = platformFromStore(event.store);
  if (!platform) {
    return Response.json({ error: "unsupported_or_missing_store" }, { status: 400 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const reconciled = [];
    for (const userId of userIds) {
      const proof = await fetchFounderStoreProof(userId, platform);
      const status = await applyFounderStoreProof(serviceClient, {
        userId,
        eventId: `${eventId}:${userId}`,
        eventType,
        source: "webhook",
        proof,
      });
      reconciled.push({ userId, status });
    }
    return Response.json({ ok: true, reconciled: reconciled.length });
  } catch (error) {
    console.error("clutch-founder-webhook", eventType, eventId, error);
    return Response.json(
      { error: error instanceof Error ? error.message : "founder_pack_webhook_failed" },
      { status: 502 },
    );
  }
});

function collectUserIds(event: Record<string, unknown>, eventType: string): string[] {
  if (eventType === "TRANSFER") {
    const transferred = uniqueUuids([
      ...arrayValues(event.transferred_from),
      ...arrayValues(event.transferred_to),
    ]);
    if (transferred.length) return transferred;
  }

  // A RevenueCat customer can contain several aliases. Granting every UUID in
  // that list would duplicate one store purchase across old Clutch accounts.
  // Outside an explicit transfer, reconcile one canonical identified account.
  const canonical = [
    event.app_user_id,
    event.original_app_user_id,
    ...arrayValues(event.aliases),
  ].find(isUuid);
  return canonical ? [canonical] : [];
}

function uniqueUuids(values: unknown[]): string[] {
  return Array.from(new Set(values.filter(isUuid)));
}

function arrayValues(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
