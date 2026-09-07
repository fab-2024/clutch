import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPandaScoreRequests,
  fetchPandaScoreFeed,
  fetchPandaScoreHistory,
  fetchPandaScorePending,
  gamesNeedingHistory,
  normalizePandaScoreFeed,
  normalizePandaScoreMatch,
} from './pandascore.js';

const finishedRocketLeagueMatch = {
  id: 701001,
  status: 'finished',
  begin_at: '2026-08-30T14:00:00Z',
  end_at: '2026-08-30T15:10:00Z',
  modified_at: '2026-08-30T15:12:00Z',
  number_of_games: 7,
  league: { id: 51, name: 'RLCS' },
  tournament: { id: 61, name: 'World Championship' },
  opponents: [
    {
      opponent: {
        id: 101,
        name: 'Karmine Corp',
        acronym: 'KC',
        image_url: 'https://cdn.example/kc.png',
      },
    },
    {
      opponent: {
        id: 202,
        name: 'Team Vitality',
        acronym: 'VIT',
        image_url: 'https://cdn.example/vit.png',
      },
    },
  ],
  results: [
    { team_id: 202, score: 2 },
    { team_id: 101, score: 4 },
  ],
};

test('builds the nine free fixture requests without leaking the token', () => {
  const requests = buildPandaScoreRequests(undefined, 500);
  assert.equal(requests.length, 9);
  assert.ok(requests.some(({ url }) => url.includes('/rl/matches/past')));
  assert.ok(requests.every(({ url }) => url.includes('page%5Bsize%5D=100')));
  assert.ok(requests.every(({ url }) => !url.includes('token=')));
});

test('sends the private token only through the bearer header', async () => {
  const calls = [];
  const feed = await fetchPandaScoreFeed('private-test-token', {
    games: ['lol'],
    fetchImpl: async (url, init) => {
      calls.push({ url, authorization: init.headers.Authorization });
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'x-rate-limit-remaining': '0' },
      });
    },
  });

  assert.equal(feed.requests, 3);
  assert.equal(feed.rateLimitRemaining, 0);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(({ url }) => !url.includes('private-test-token')));
  assert.ok(calls.every(({ authorization }) => authorization === 'Bearer private-test-token'));
});

test('reconciles unresolved provider matches by ID in bounded batches, excluding demo data', async () => {
  const calls = [];
  const pending = Array.from({ length: 101 }, (_, i) => ({ id: `ps-match-${1000 + i}`, jeu: 'lol' }));
  pending.push({ id: 'm-6', jeu: 'lol' }, { id: 'ps-match-9000', jeu: 'rocket_league' }, pending[0]);
  const result = await fetchPandaScorePending('test-token', pending, {
    fetchImpl: async (url, init) => {
      calls.push(new URL(url));
      assert.equal(init.headers.Authorization, 'Bearer test-token');
      return new Response('[]', { status: 200 });
    },
  });
  assert.equal(result.requests, 3);
  assert.deepEqual(calls.map((url) => url.searchParams.get('filter[id]').split(',').length), [100, 1, 1]);
  assert.ok(calls.every((url) => !url.toString().includes('m-6')));
  assert.equal(calls[2].pathname, '/rl/matches');
});

test('reconciliation failures are explicit and never invent a finished status', async () => {
  const result = await fetchPandaScorePending('test-token', [{ id: 'ps-match-123', jeu: 'lol' }], {
    fetchImpl: async () => new Response('{}', { status: 503 }),
  });
  assert.equal(result.errors.length, 1);
  assert.equal(result.responses.length, 0);
});

test('a final result wins over a stale running copy even with a newer modified timestamp', () => {
  const running = { ...finishedRocketLeagueMatch, status: 'running', modified_at: '2026-09-07T12:00:00Z', results: [] };
  for (const matches of [[running, finishedRocketLeagueMatch], [finishedRocketLeagueMatch, running]]) {
    const result = normalizePandaScoreFeed({ responses: [{ game: 'rocket_league', matches }] });
    assert.equal(result.matches[0].status, 'finished');
    assert.equal(result.matches[0].score_a, 4);
  }
});

test('normalizes a BO7 Rocket League result in opponent order', () => {
  const result = normalizePandaScoreMatch(finishedRocketLeagueMatch, 'rocket_league');
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    external_match_id: '701001',
    game: 'rocket_league',
    status: 'finished',
    begin_at: '2026-08-30T14:00:00.000Z',
    forfeit: false,
    format: 7,
    event_external_id: 'tournament:61',
    event_name: 'RLCS · World Championship',
    team_a_external_id: '101',
    team_a_name: 'Karmine Corp',
    team_a_tag: 'KC',
    team_a_logo: 'https://cdn.example/kc.png',
    team_b_external_id: '202',
    team_b_name: 'Team Vitality',
    team_b_tag: 'VIT',
    team_b_logo: 'https://cdn.example/vit.png',
    score_a: 4,
    score_b: 2,
    received_at: '2026-08-30T15:12:00.000Z',
  });
});

test('deduplicates an upcoming fixture in favour of its newer final result', () => {
  const upcoming = {
    ...finishedRocketLeagueMatch,
    status: 'not_started',
    modified_at: '2026-08-29T09:00:00Z',
    results: [],
  };
  const feed = {
    responses: [
      { game: 'rocket_league', matches: [upcoming] },
      { game: 'rocket_league', matches: [finishedRocketLeagueMatch] },
    ],
  };
  const normalized = normalizePandaScoreFeed(feed);
  assert.equal(normalized.matches.length, 1);
  assert.equal(normalized.matches[0].status, 'finished');
  assert.equal(normalized.matches[0].score_a, 4);
});

test('skips undecidable fixtures and unsupported even formats', () => {
  const missingOpponent = normalizePandaScoreMatch({
    ...finishedRocketLeagueMatch,
    id: 701002,
    opponents: finishedRocketLeagueMatch.opponents.slice(0, 1),
  }, 'rocket_league');
  const bestOfTwo = normalizePandaScoreMatch({
    ...finishedRocketLeagueMatch,
    id: 701003,
    number_of_games: 2,
  }, 'rocket_league');

  assert.equal(missingOpponent.ok, false);
  assert.equal(missingOpponent.reason, 'missing_opponents');
  assert.equal(bestOfTwo.ok, false);
  assert.equal(bestOfTwo.reason, 'unsupported_format');
});

test('derives a stable tag and rejects non-HTTPS logos', () => {
  const result = normalizePandaScoreMatch({
    ...finishedRocketLeagueMatch,
    id: 701004,
    opponents: [
      {
        opponent: {
          id: 303,
          name: 'Gentle Mates Alpine',
          acronym: null,
          image_url: 'http://cdn.example/m8.png',
        },
      },
      finishedRocketLeagueMatch.opponents[1],
    ],
    results: [
      { team_id: 303, score: 4 },
      { team_id: 202, score: 1 },
    ],
  }, 'rocket_league');

  assert.equal(result.ok, true);
  assert.equal(result.value.team_a_tag, 'GMA');
  assert.equal(result.value.team_a_logo, null);
});


test('history paginates until the 90-day boundary and never feeds settlement fixtures', async () => {
  const calls = [];
  const history = await fetchPandaScoreHistory('test-token', {
    games: ['lol'], now: new Date('2026-09-07T12:00:00Z'),
    fetchImpl: async (url) => {
      calls.push(new URL(url));
      const page = Number(new URL(url).searchParams.get('page[number]'));
      return new Response(JSON.stringify(Array.from({ length: 100 }, (_, i) => ({
        ...finishedRocketLeagueMatch, id: page * 100 + i,
        begin_at: page === 1 ? '2026-08-30T14:00:00Z' : '2026-01-01T14:00:00Z',
      }))));
    },
  });
  assert.equal(history.requests, 2);
  assert.equal(history.responses[0].matches.length, 100);
  assert.equal(history.coverage.lol, '2026-06-09T12:00:00.000Z');
  assert.equal(calls[1].searchParams.get('page[number]'), '2');
  assert.equal(calls[0].pathname, '/lol/matches/past');
});

test('a truncated or failed history cannot mark the model ready', async () => {
  const truncated = await fetchPandaScoreHistory('test', {
    games: ['lol'], maxPages: 1, now: new Date('2026-09-07'),
    fetchImpl: async () => new Response(JSON.stringify(Array(100).fill(finishedRocketLeagueMatch))),
  });
  assert.deepEqual(truncated.coverage, {});
  assert.deepEqual(truncated.responses, []);
  assert.equal(truncated.errors[0].error, 'history_page_limit');
  const failed = await fetchPandaScoreHistory('test', { games: ['lol'], fetchImpl: async () => new Response('', { status: 429 }) });
  assert.deepEqual(failed.coverage, {});
  assert.equal(failed.errors[0].error, 'history_http_429');
});

test('recent history is reused and an aging model refreshes before expiry', () => {
  const now = new Date('2026-09-07T12:00:00Z');
  assert.deepEqual(gamesNeedingHistory({ lol: { synced_at: '2026-09-07T10:00:00Z' }, valorant: { synced_at: '2026-09-06T12:00:00Z' } }, ['lol','valorant','rocket_league'], now), ['valorant','rocket_league']);
});

test('forfeits remain identifiable and are excluded by the history importer', () => {
  assert.equal(normalizePandaScoreMatch({ ...finishedRocketLeagueMatch, forfeit: true }, 'rocket_league').value.forfeit, true);
});
