import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.112.3";

import {
  fetchPandaScoreFeed,
  normalizePandaScoreFeed,
  SUPPORTED_GAMES,
} from "./pandascore.js";

const IMPORT_CHUNK_SIZE = 75;

type PandaScoreFeed = {
  requests: number;
  responses: Array<{ matches: unknown[] }>;
  errors: Array<{ game: string; state: string; error: string }>;
  rateLimitRemaining: number | null;
};

type NormalizedFeed = {
  matches: Array<Record<string, unknown>>;
  skipped: Array<{ reason?: string }>;
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const pandaScoreToken = Deno.env.get("PANDASCORE_API_TOKEN");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "missing_supabase_runtime_configuration" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (!await isAuthorized(request, supabase, serviceRoleKey)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!pandaScoreToken) {
    return Response.json({ error: "missing_pandascore_api_token" }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const games = requestedGames(body.games);
    const dryRun = body.dry_run === true;
    const feed = await fetchPandaScoreFeed(
      pandaScoreToken,
      { games, perPage: 100 },
    ) as PandaScoreFeed;

    if (!feed.responses.length) {
      return Response.json({
        error: "pandascore_unavailable",
        requests: feed.requests,
        fetch_errors: feed.errors,
      }, { status: 502 });
    }

    const normalized = normalizePandaScoreFeed(feed) as NormalizedFeed;
    const basePayload = {
      games,
      dry_run: dryRun,
      panda_requests: feed.requests,
      panda_request_errors: feed.errors,
      rate_limit_remaining: feed.rateLimitRemaining,
      fetched: feed.responses.reduce(
        (sum: number, response: { matches: unknown[] }) => sum + response.matches.length,
        0,
      ),
      normalized: normalized.matches.length,
      normalization_skips: summarizeSkips(normalized.skipped),
    };

    if (dryRun) {
      return Response.json({
        ok: feed.errors.length === 0,
        ...basePayload,
        sample: normalized.matches.slice(0, 12).map(compactMatch),
      });
    }

    const imported = emptyImportSummary();
    for (let index = 0; index < normalized.matches.length; index += IMPORT_CHUNK_SIZE) {
      const chunk = normalized.matches.slice(index, index + IMPORT_CHUNK_SIZE);
      const { data, error } = await supabase.rpc("clutch_pandascore_importer_lot_v1", {
        p_matchs: chunk,
      });
      if (error) throw error;
      mergeImportSummary(imported, data);
    }

    const payload = {
      ok: feed.errors.length === 0 && imported.erreurs === 0,
      ...basePayload,
      imported,
    };
    console.info("clutch-pandascore-sync", JSON.stringify(payload));
    return Response.json(payload);
  } catch (error) {
    console.error("clutch-pandascore-sync", error);
    return Response.json({
      error: error instanceof Error ? error.message : "pandascore_sync_failed",
    }, { status: 500 });
  }
});

async function isAuthorized(
  request: Request,
  supabase: ReturnType<typeof createClient>,
  serviceRoleKey: string,
): Promise<boolean> {
  const authorization = request.headers.get("Authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
  const cronSecret = request.headers.get("X-Clutch-Cron-Secret");

  if (cronSecret) {
    const { data, error } = await supabase.rpc("clutch_verifier_secret_pandascore_v1", {
      p_secret: cronSecret,
    });
    return !error && data === true;
  }

  if (!bearer) return false;
  if (await secretsMatch(bearer, serviceRoleKey)) return true;

  const { data: userData, error: userError } = await supabase.auth.getUser(bearer);
  if (userError || !userData.user) return false;
  const { data: profile, error: profileError } = await supabase
    .from("profils")
    .select("est_admin")
    .eq("id", userData.user.id)
    .maybeSingle();
  return !profileError && profile?.est_admin === true;
}

async function secretsMatch(actual: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(actualHash);
  const right = new Uint8Array(expectedHash);
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

function requestedGames(value: unknown): string[] {
  if (value === undefined) return [...SUPPORTED_GAMES];
  if (!Array.isArray(value) || !value.length) throw new Error("invalid_games_selection");
  const games = [...new Set(value.map((game) => String(game)))];
  if (games.some((game) => !SUPPORTED_GAMES.includes(game))) {
    throw new Error("unsupported_game_selection");
  }
  return games;
}

function summarizeSkips(skips: Array<{ reason?: string }>): Record<string, number> {
  return skips.reduce<Record<string, number>>((summary, skip) => {
    const reason = skip.reason ?? "unknown";
    summary[reason] = (summary[reason] ?? 0) + 1;
    return summary;
  }, {});
}

function compactMatch(match: Record<string, unknown>): Record<string, unknown> {
  return {
    external_match_id: match.external_match_id,
    game: match.game,
    status: match.status,
    begin_at: match.begin_at,
    format: match.format,
    event_name: match.event_name,
    team_a: match.team_a_name,
    team_b: match.team_b_name,
    score_a: match.score_a,
    score_b: match.score_b,
  };
}

function emptyImportSummary() {
  return {
    recus: 0,
    crees: 0,
    mis_a_jour: 0,
    demarres: 0,
    regles: 0,
    corriges: 0,
    annules: 0,
    inchanges: 0,
    ignores: 0,
    erreurs: 0,
    details: [] as Array<Record<string, unknown>>,
  };
}

function mergeImportSummary(
  target: ReturnType<typeof emptyImportSummary>,
  source: unknown,
): void {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error("invalid_import_summary");
  }
  const summary = source as Record<string, unknown>;
  for (const key of [
    "recus",
    "crees",
    "mis_a_jour",
    "demarres",
    "regles",
    "corriges",
    "annules",
    "inchanges",
    "ignores",
    "erreurs",
  ] as const) {
    target[key] += Number(summary[key]) || 0;
  }
  if (Array.isArray(summary.details)) {
    target.details.push(...summary.details.filter((detail) => detail && typeof detail === "object"));
    target.details = target.details.slice(0, 25);
  }
}
