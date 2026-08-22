import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.112.3";

import {
  applyFounderStoreProof,
  fetchFounderStoreProof,
  isUuid,
  normalizePlatform,
} from "../_shared/founder-pack.ts";

type SyncAction = "status" | "purchase" | "restore";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
    ?? Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY")
    ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !publishableKey || !secretKey) {
    return Response.json({ error: "missing_runtime_configuration" }, { status: 500 });
  }
  if (!authorization) {
    return Response.json({ error: "authentication_required" }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !isUuid(authData.user?.id)) {
    return Response.json({ error: "invalid_session" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const platform = normalizePlatform(body.platform);
  const action = normalizeAction(body.action);
  if (!platform || !action) {
    return Response.json({ error: "invalid_sync_request" }, { status: 400 });
  }

  const serviceClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const proof = await fetchFounderStoreProof(authData.user.id, platform);
    const transaction = proof.transactionId ?? "none";
    const state = proof.active ? "active" : "inactive";
    const status = await applyFounderStoreProof(serviceClient, {
      userId: authData.user.id,
      eventId: `sync:${action}:${authData.user.id}:${transaction}:${state}`,
      eventType: `SYNC_${action.toUpperCase()}`,
      source: "sync",
      proof,
    });
    return Response.json({ ok: true, status });
  } catch (error) {
    console.error("clutch-founder-sync", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "founder_pack_sync_failed" },
      { status: 502 },
    );
  }
});

function normalizeAction(value: unknown): SyncAction | null {
  if (value === "status" || value === "purchase" || value === "restore") return value;
  return null;
}
