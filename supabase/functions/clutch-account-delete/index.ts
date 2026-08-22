import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};
const RECENT_AUTH_WINDOW_MS = 5 * 60 * 1000;

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
    ?? Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY")
    ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!supabaseUrl || !publishableKey || !secretKey) return json({ error: "missing_runtime_configuration" }, 500);
  if (!authorization?.startsWith("Bearer ")) return json({ error: "authentication_required" }, 401);

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "invalid_session" }, 401);

  const body = await safeJson(request);
  if (body?.confirmation !== "DELETE") return json({ error: "invalid_confirmation" }, 400);
  const lastSignIn = Date.parse(authData.user.last_sign_in_at ?? "");
  if (!Number.isFinite(lastSignIn) || Date.now() - lastSignIn > RECENT_AUTH_WINDOW_MS) {
    return json({ error: "recent_authentication_required" }, 403);
  }

  const revenueCatKey = Deno.env.get("REVENUECAT_SECRET_API_KEY")?.trim();
  if (!revenueCatKey) return json({ error: "revenuecat_cleanup_not_configured" }, 503);

  const providerCleanup = await deleteRevenueCatCustomer(authData.user.id, revenueCatKey);
  if (!providerCleanup) return json({ error: "revenuecat_cleanup_failed" }, 502);

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authorization.slice("Bearer ".length);
  const { error: signOutError } = await admin.auth.admin.signOut(token, "global");
  if (signOutError) console.error("account_delete_session_revocation", signOutError.message);

  const { error: deletionError } = await admin.auth.admin.deleteUser(authData.user.id, false);
  if (deletionError) {
    console.error("account_delete_auth", deletionError.message);
    return json({ error: "supabase_account_deletion_failed" }, 500);
  }

  return json({ deleted: true, provider_cleanup: providerCleanup }, 200);
});

async function deleteRevenueCatCustomer(userId: string, secret: string) {
  try {
    const response = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      { method: "DELETE", headers: { Accept: "application/json", Authorization: `Bearer ${secret}` } },
    );
    if (response.ok) return "deleted";
    if (response.status === 404) return "already_deleted";
    console.error("account_delete_revenuecat", response.status, (await response.text()).slice(0, 200));
    return null;
  } catch (error) {
    console.error("account_delete_revenuecat_network", error);
    return null;
  }
}

async function safeJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();
    return value && typeof value === "object" ? value as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function json(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}
