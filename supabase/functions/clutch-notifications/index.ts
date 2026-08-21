import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2";

type PendingDelivery = {
  livraison_id: string;
  jeton: string;
  titre: string;
  corps: string;
  donnees: Record<string, unknown>;
  type: string;
};

type PendingReceipt = {
  livraison_id: string;
  ticket_id: string;
  jeton: string;
};

type ExpoTicket = {
  status?: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

type ExpoReceipt = {
  status?: "ok" | "error";
  message?: string;
  details?: { error?: string };
};

const PUSH_URL = "https://exp.host/--/api/v2/push/send";
const RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  const cronSecret = request.headers.get("X-Clutch-Cron-Secret");

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "missing_runtime_configuration" }, { status: 500 });
  }
  if (!authorization || !cronSecret) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data: cronAuthorized, error: cronAuthError } = await supabase.rpc(
      "clutch_verifier_secret_notification_v1",
      { p_secret: cronSecret },
    );
    if (cronAuthError || cronAuthorized !== true) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const sent = await deliverPendingNotifications(supabase);
    const receipts = await checkPendingReceipts(supabase);
    return Response.json({ ok: true, sent, receipts });
  } catch (error) {
    console.error("clutch-notifications", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "notification_cycle_failed" },
      { status: 500 },
    );
  }
});

async function deliverPendingNotifications(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.rpc(
    "clutch_reclamer_livraisons_notification_v1",
    { p_limite: 100 },
  );
  if (error) throw error;

  const deliveries = Array.isArray(data) ? data as PendingDelivery[] : [];
  if (!deliveries.length) return 0;

  const messages = deliveries.map((delivery) => ({
    to: delivery.jeton,
    title: delivery.titre,
    body: delivery.corps,
    data: delivery.donnees,
    sound: "default",
    priority: "high",
    channelId: "clutch-events",
  }));

  let results: Array<Record<string, unknown>>;
  try {
    const response = await fetch(PUSH_URL, {
      method: "POST",
      headers: expoHeaders(),
      body: JSON.stringify(messages),
    });
    const payload = await response.json() as { data?: ExpoTicket[]; errors?: Array<{ message?: string }> };
    if (!response.ok) {
      throw new Error(payload.errors?.[0]?.message || `expo_push_${response.status}`);
    }

    const tickets = Array.isArray(payload.data) ? payload.data : [];
    results = deliveries.map((delivery, index) => {
      const ticket = tickets[index];
      return {
        livraison_id: delivery.livraison_id,
        jeton: delivery.jeton,
        statut: ticket?.status === "ok" && ticket.id ? "ok" : "error",
        ticket_id: ticket?.id ?? null,
        message: ticket?.message ?? (ticket ? null : "ticket Expo absent"),
        code_erreur: ticket?.details?.error ?? (ticket ? null : "MissingTicket"),
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "expo_push_unavailable";
    results = deliveries.map((delivery) => ({
      livraison_id: delivery.livraison_id,
      jeton: delivery.jeton,
      statut: "error",
      message,
      code_erreur: "TemporaryDeliveryError",
    }));
  }

  const { error: finalizeError } = await supabase.rpc(
    "clutch_enregistrer_tickets_notification_v1",
    { p_resultats: results },
  );
  if (finalizeError) throw finalizeError;
  return deliveries.length;
}

async function checkPendingReceipts(supabase: ReturnType<typeof createClient>) {
  const { data, error } = await supabase.rpc(
    "clutch_reclamer_recus_notification_v1",
    { p_limite: 1000 },
  );
  if (error) throw error;

  const pending = Array.isArray(data) ? data as PendingReceipt[] : [];
  if (!pending.length) return 0;

  let results: Array<Record<string, unknown>>;
  try {
    const response = await fetch(RECEIPTS_URL, {
      method: "POST",
      headers: expoHeaders(),
      body: JSON.stringify({ ids: pending.map((item) => item.ticket_id) }),
    });
    const payload = await response.json() as {
      data?: Record<string, ExpoReceipt>;
      errors?: Array<{ message?: string }>;
    };
    if (!response.ok) {
      throw new Error(payload.errors?.[0]?.message || `expo_receipts_${response.status}`);
    }

    results = pending.map((item) => {
      const receipt = payload.data?.[item.ticket_id];
      if (!receipt) {
        return {
          livraison_id: item.livraison_id,
          jeton: item.jeton,
          statut: "attente",
        };
      }
      return {
        livraison_id: item.livraison_id,
        jeton: item.jeton,
        statut: receipt.status === "ok" ? "ok" : "error",
        message: receipt.message ?? null,
        code_erreur: receipt.details?.error ?? null,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "expo_receipts_unavailable";
    results = pending.map((item) => ({
      livraison_id: item.livraison_id,
      jeton: item.jeton,
      statut: "attente",
      message,
    }));
  }

  const { error: finalizeError } = await supabase.rpc(
    "clutch_enregistrer_recus_notification_v1",
    { p_resultats: results },
  );
  if (finalizeError) throw finalizeError;
  return pending.length;
}

function expoHeaders() {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
  };
  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}
