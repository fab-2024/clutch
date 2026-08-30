const API_ORIGIN = 'https://api.pandascore.co';

export const SUPPORTED_GAMES = Object.freeze(['lol', 'valorant', 'rocket_league']);

const GAME_PATHS = Object.freeze({
  lol: 'lol',
  valorant: 'valorant',
  rocket_league: 'rl',
});

const FEED_STATES = Object.freeze(['upcoming', 'running', 'past']);
const SUPPORTED_FORMATS = new Set([1, 3, 5, 7]);
const STATUS_PRIORITY = Object.freeze({
  postponed: 0,
  not_started: 1,
  running: 2,
  canceled: 3,
  finished: 4,
});

export function buildPandaScoreRequests(games = SUPPORTED_GAMES, perPage = 100) {
  const pageSize = Math.max(1, Math.min(Number(perPage) || 100, 100));
  return games.flatMap((game) => {
    const gamePath = GAME_PATHS[game];
    if (!gamePath) throw new Error(`unsupported_game:${game}`);

    return FEED_STATES.map((state) => {
      const url = new URL(`${API_ORIGIN}/${gamePath}/matches/${state}`);
      url.searchParams.set('page[size]', String(pageSize));
      url.searchParams.set('sort', state === 'past' ? '-begin_at' : 'begin_at');
      return { game, state, url: url.toString() };
    });
  });
}

export async function fetchPandaScoreFeed(token, options = {}) {
  if (!token) throw new Error('missing_pandascore_token');

  const fetchImpl = options.fetchImpl ?? fetch;
  const requests = buildPandaScoreRequests(options.games, options.perPage);
  const timeoutMs = Math.max(1_000, Math.min(Number(options.timeoutMs) || 12_000, 30_000));
  const responses = await Promise.all(requests.map(async (request) => {
    try {
      const response = await fetchImpl(request.url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = isObject(payload) && typeof payload.message === 'string'
          ? payload.message.slice(0, 180)
          : `HTTP ${response.status}`;
        throw new Error(`pandascore_${response.status}:${detail}`);
      }
      if (!Array.isArray(payload)) throw new Error('pandascore_invalid_payload');

      return {
        ok: true,
        game: request.game,
        state: request.state,
        matches: payload,
        rateLimitRemaining: nonNegativeInteger(response.headers.get('x-rate-limit-remaining')),
      };
    } catch (error) {
      return {
        ok: false,
        game: request.game,
        state: request.state,
        error: error instanceof Error ? error.message : 'pandascore_request_failed',
      };
    }
  }));

  const successful = responses.filter((response) => response.ok);
  const remainingValues = successful
    .map((response) => response.rateLimitRemaining)
    .filter((value) => Number.isInteger(value));

  return {
    requests: responses.length,
    responses: successful,
    errors: responses
      .filter((response) => !response.ok)
      .map(({ game, state, error }) => ({ game, state, error })),
    rateLimitRemaining: remainingValues.length ? Math.min(...remainingValues) : null,
  };
}

export function normalizePandaScoreFeed(feed, options = {}) {
  const normalized = [];
  const skipped = [];

  for (const response of feed.responses ?? []) {
    for (const rawMatch of response.matches ?? []) {
      const result = normalizePandaScoreMatch(rawMatch, response.game, options);
      if (result.ok) normalized.push(result.value);
      else skipped.push(result);
    }
  }

  const byExternalId = new Map();
  for (const match of normalized) {
    const previous = byExternalId.get(match.external_match_id);
    if (!previous || shouldReplace(previous, match)) {
      byExternalId.set(match.external_match_id, match);
    }
  }

  return {
    matches: [...byExternalId.values()].sort((a, b) => a.begin_at.localeCompare(b.begin_at)),
    skipped,
  };
}

export function normalizePandaScoreMatch(rawMatch, game, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  if (!isObject(rawMatch)) return rejected('invalid_match_payload');
  if (!GAME_PATHS[game]) return rejected('unsupported_game', rawMatch.id);

  const externalMatchId = numericId(rawMatch.id);
  if (!externalMatchId) return rejected('missing_match_id', rawMatch.id);

  const status = normalizeStatus(rawMatch.status);
  if (!status) return rejected('unsupported_status', externalMatchId);

  const beginAt = isoDate(rawMatch.begin_at ?? rawMatch.original_scheduled_at);
  if (!beginAt) return rejected('missing_begin_at', externalMatchId);

  const format = positiveInteger(rawMatch.number_of_games);
  if (!SUPPORTED_FORMATS.has(format)) return rejected('unsupported_format', externalMatchId);

  const opponents = Array.isArray(rawMatch.opponents)
    ? rawMatch.opponents.map((entry) => isObject(entry) ? entry.opponent : null).filter(isObject)
    : [];
  if (opponents.length !== 2) return rejected('missing_opponents', externalMatchId);

  const teamA = normalizeTeam(opponents[0]);
  const teamB = normalizeTeam(opponents[1]);
  if (!teamA || !teamB || teamA.id === teamB.id) {
    return rejected('invalid_opponents', externalMatchId);
  }

  const tournament = isObject(rawMatch.tournament) ? rawMatch.tournament : null;
  const league = isObject(rawMatch.league) ? rawMatch.league : null;
  const tournamentId = numericId(tournament?.id);
  const leagueId = numericId(league?.id);
  const eventExternalId = tournamentId
    ? `tournament:${tournamentId}`
    : leagueId
      ? `league:${leagueId}`
      : null;
  const eventName = buildEventName(league?.name, tournament?.name);
  if (!eventExternalId || !eventName) return rejected('missing_event', externalMatchId);

  const scoresByTeam = new Map();
  if (Array.isArray(rawMatch.results)) {
    for (const result of rawMatch.results) {
      if (!isObject(result)) continue;
      const teamId = numericId(result.team_id);
      const score = nonNegativeInteger(result.score);
      if (teamId && score !== null) scoresByTeam.set(teamId, score);
    }
  }

  const receivedAt = isoDate(rawMatch.modified_at ?? rawMatch.end_at) ?? now.toISOString();
  return {
    ok: true,
    value: {
      external_match_id: externalMatchId,
      game,
      status,
      begin_at: beginAt,
      format,
      event_external_id: eventExternalId,
      event_name: eventName,
      team_a_external_id: teamA.id,
      team_a_name: teamA.name,
      team_a_tag: teamA.tag,
      team_a_logo: teamA.logo,
      team_b_external_id: teamB.id,
      team_b_name: teamB.name,
      team_b_tag: teamB.tag,
      team_b_logo: teamB.logo,
      score_a: scoresByTeam.get(teamA.id) ?? null,
      score_b: scoresByTeam.get(teamB.id) ?? null,
      received_at: receivedAt,
    },
  };
}

function normalizeTeam(team) {
  const id = numericId(team.id);
  const name = cleanText(team.name, 80);
  if (!id || !name) return null;

  return {
    id,
    name,
    tag: buildTeamTag(team.acronym, name, id),
    logo: httpsUrl(team.image_url),
  };
}

function buildTeamTag(acronym, name, id) {
  let candidate = asciiAlphaNumeric(acronym);
  if (candidate.length < 2) {
    candidate = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }
  if (candidate.length < 2) candidate = `T${id}`;
  return candidate.slice(0, 8);
}

function buildEventName(leagueName, tournamentName) {
  const league = cleanText(leagueName, 70);
  const tournament = cleanText(tournamentName, 70);
  if (!league) return tournament;
  if (!tournament || league.toLowerCase() === tournament.toLowerCase()) return league;
  return cleanText(`${league} · ${tournament}`, 100);
}

function normalizeStatus(value) {
  const status = String(value ?? '').trim().toLowerCase();
  if (status === 'cancelled') return 'canceled';
  return Object.hasOwn(STATUS_PRIORITY, status) ? status : null;
}

function shouldReplace(previous, next) {
  const previousTime = Date.parse(previous.received_at);
  const nextTime = Date.parse(next.received_at);
  if (Number.isFinite(previousTime) && Number.isFinite(nextTime) && nextTime !== previousTime) {
    return nextTime > previousTime;
  }
  return STATUS_PRIORITY[next.status] > STATUS_PRIORITY[previous.status];
}

function rejected(reason, externalMatchId = null) {
  return {
    ok: false,
    reason,
    external_match_id: numericId(externalMatchId),
  };
}

function numericId(value) {
  const text = String(value ?? '').trim();
  return /^\d{1,30}$/.test(text) ? text : null;
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function isoDate(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function asciiAlphaNumeric(value) {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
}

function httpsUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString().slice(0, 500) : null;
  } catch {
    return null;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
