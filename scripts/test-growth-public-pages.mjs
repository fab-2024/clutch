import assert from 'node:assert/strict';
import { after, beforeEach, test } from 'node:test';

import growthPage from '../api/growth-page.mjs';
import { loadGrowthPresentation, publicGrowthOrigin } from '../server/growth-public-data.mjs';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };
const calls = [];
const code = '0123456789abcdef0123456789abcdef';
beforeEach(() => {
  process.env.CLUTCH_APP_ORIGIN = 'https://clutch.example';
  process.env.SUPABASE_URL = 'https://growth-fixture.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'sb_publishable_fixture';
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.CLUTCH_IOS_STORE_URL;
  delete process.env.CLUTCH_ANDROID_STORE_URL;
  calls.length = 0;
  respond(null);
});
after(() => { globalThis.fetch = originalFetch; process.env = originalEnv; });

function respond(body, status = 200) {
  globalThis.fetch = async (url, options) => {
    // Satori loads its bundled Yoga WASM from a data URL. Only mock our RPCs,
    // not the local renderer runtime (and never allow incidental network IO).
    if (String(url).startsWith('data:')) return originalFetch(url, options);
    assert.ok(String(url).startsWith('https://growth-fixture.supabase.co/rest/v1/rpc/'), 'Unexpected network request');
    calls.push({ url, ...options });
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  };
}
function recorder() {
  return { statusCode: 200, headers: {}, body: '', setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; }, end(value = '') { this.body = String(value); return this; } };
}
async function page(url, method = 'GET') {
  const response = recorder();
  await growthPage({ url, method, headers: { host: 'attacker.invalid' } }, response);
  return response;
}

test('invitation landing reads only public data, escapes content and preserves recoverable code', async () => {
  respond({ valide: true, parrain: '<script>alert(1)</script>' });
  const result = await page(`/?kind=invite&id=${code}`);
  assert.equal(result.statusCode, 200);
  assert.ok(result.body.includes(`clutch://i/${code}`));
  assert.ok(result.body.includes('ne conserve pas automatiquement'));
  assert.ok(result.body.includes(code));
  assert.ok(!result.body.includes('<script>'));
  assert.ok(!result.body.includes('attacker.invalid'));
  assert.ok(result.body.includes('https://clutch.example/api/growth-og'));
  assert.match(calls[0].url, /clutch_invitation_publique_v1$/);
  assert.equal(calls[0].cache, 'no-store');
  assert.equal(result.headers['cache-control'], 'private, no-store, max-age=0');
  assert.equal(result.headers['referrer-policy'], 'no-referrer');
});

test('unavailable private invite identity is not invented or exposed', async () => {
  respond({ valide: true, parrain: null });
  const result = await page(`/?kind=invite&id=${code}`);
  assert.ok(result.body.includes('Un supporter'));
  assert.ok(!result.body.includes('Télécharger sur iPhone'));
  process.env.CLUTCH_IOS_STORE_URL = 'https://apps.apple.com/app/id123';
  assert.ok((await page(`/?kind=invite&id=${code}`)).body.includes('/api/download?platform=ios'));
});

test('invalid routes and unsupported milestones make no RPC', async () => {
  for (const url of ['/?kind=invite&id=guess', '/?kind=showcase&id=..', '/?kind=showcase&id=a%2Fb',
    '/?kind=milestone&id=Nova&milestone=999', '/?kind=milestone&id=Nova&milestone=3.0', '/?kind=unknown&id=Nova']) {
    assert.equal((await page(url)).statusCode, 404);
  }
  assert.equal(calls.length, 0);
});

test('showcase projection never includes private view analytics or unfiltered cosmetics', async () => {
  respond({ pseudo: 'Nova', profil_public: true, visibilite: 'publique', likes: 4, vues: 123456,
    cosmetiques: { secret: 'not-public-metadata' } });
  const card = await loadGrowthPresentation('showcase', 'Nova');
  assert.equal(card.likes, 4);
  assert.equal(card.views, undefined);
  assert.ok(!JSON.stringify(card).includes('123456'));
  assert.ok(!JSON.stringify(card).includes('not-public-metadata'));
  assert.match(calls[0].url, /clutch_vitrine_v1$/);
});

test('a privacy change immediately removes origin metadata and milestone details', async () => {
  respond({ pseudo: 'Nova', profil_public: true, visibilite: 'cercle', likes: 9 });
  const hidden = await page('/?kind=showcase&id=Nova');
  assert.equal(hidden.statusCode, 404);
  assert.ok(!hidden.body.includes('Nova'));
  assert.ok(!hidden.body.includes('og:image'));
  respond(null);
  const milestone = await page('/?kind=milestone&id=Nova&milestone=7');
  assert.equal(milestone.statusCode, 404);
  assert.ok(!milestone.body.includes('JALON VÉRIFIÉ'));
});

test('milestones are verified through their earned proof, not a client-provided score', async () => {
  respond({ pseudo: 'Nova', palier: 7, obtenu_le: '2026-09-03T09:00:00Z' });
  const result = await page('/?kind=milestone&id=Nova&milestone=7');
  assert.equal(result.statusCode, 200);
  assert.ok(result.body.includes('JALON VÉRIFIÉ'));
  assert.ok(result.body.includes('clutch://s/Nova/7'));
  assert.match(calls[0].url, /clutch_jalon_public_v1$/);
  assert.deepEqual(JSON.parse(calls[0].body), { p_pseudo: 'Nova', p_palier: 7 });
  respond({ pseudo: 'Nova', palier: 100, obtenu_le: '2026-09-03T09:00:00Z' });
  assert.equal((await page('/?kind=milestone&id=Nova&milestone=7')).statusCode, 404);
});

test('public previews reject elevated credentials and invalid configured origins', async () => {
  process.env.SUPABASE_ANON_KEY = `header.${Buffer.from('{"role":"service_role"}').toString('base64url')}.signature`;
  assert.equal((await page('/?kind=showcase&id=Nova')).statusCode, 503);
  assert.equal(calls.length, 0);
  process.env.CLUTCH_APP_ORIGIN = 'https://safe.example@evil.test/path';
  assert.equal(publicGrowthOrigin(), null);
  assert.equal((await page('/?kind=showcase&id=Nova')).statusCode, 503);
});

test('public previews also accept the publishable key used by the Expo configuration', async () => {
  delete process.env.SUPABASE_ANON_KEY;
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fixture';
  respond({ valide: true, parrain: null });
  assert.equal((await page(`/?kind=invite&id=${code}`)).statusCode, 200);
  assert.equal(calls[0].headers.apikey, 'sb_publishable_fixture');
  assert.equal(calls[0].headers.Authorization, undefined);
});

test('HEAD, mutation methods and backend failures are bounded and do not leak internals', async () => {
  assert.equal((await page(`/?kind=invite&id=${code}`, 'POST')).statusCode, 405);
  respond({ valide: true, parrain: 'Nova' });
  assert.equal((await page(`/?kind=invite&id=${code}`, 'HEAD')).body, '');
  respond({ error: 'database-secret' }, 500);
  const result = await page(`/?kind=invite&id=${code}`);
  assert.equal(result.statusCode, 503);
  assert.ok(!result.body.includes('database-secret'));
});

test('OG renderer produces a real 1200x630 PNG with no cache or fabricated achievement', async () => {
  const { GET: growthOg } = await import('../api/growth-og.mjs');
  respond({ pseudo: 'Nova', palier: 7, obtenu_le: '2026-09-03T09:00:00Z' });
  const image = await growthOg(new Request('https://clutch.example/api/growth-og?kind=milestone&id=Nova&milestone=7'));
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type'), /image\/png/);
  assert.match(image.headers.get('cache-control'), /no-store/);
  const png = Buffer.from(await image.arrayBuffer());
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  respond(null);
  const hidden = await growthOg(new Request('https://clutch.example/api/growth-og?kind=milestone&id=Nova&milestone=7'));
  assert.equal(hidden.status, 404);
  await hidden.arrayBuffer();
});
