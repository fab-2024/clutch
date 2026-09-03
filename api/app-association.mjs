const BUNDLE_ID = 'com.fabthetap.clutch';
const ANDROID_PACKAGE = 'com.fabthetap.clutch';

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method Not Allowed');
  }
  const url = new URL(req.url || '/', 'https://clutch.invalid');
  const platform = url.searchParams.get('platform');
  let payload;

  if (platform === 'ios') {
    const teamId = String(process.env.CLUTCH_APPLE_TEAM_ID || '').trim();
    if (!/^[A-Z0-9]{10}$/.test(teamId)) return unavailable(res, 'CLUTCH_APPLE_TEAM_ID');
    payload = {
      applinks: {
        apps: [],
        details: [{ appID: `${teamId}.${BUNDLE_ID}`, paths: ['/c/*', '/u/*', '/i/*', '/v/*', '/s/*'] }],
      },
    };
  } else if (platform === 'android') {
    const fingerprints = String(process.env.CLUTCH_ANDROID_SHA256_CERT_FINGERPRINTS || '')
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter((value) => /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value));
    if (!fingerprints.length) return unavailable(res, 'CLUTCH_ANDROID_SHA256_CERT_FINGERPRINTS');
    payload = [{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: fingerprints,
      },
    }];
  } else {
    return res.status(404).send('Not Found');
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  if (req.method === 'HEAD') return res.end();
  return res.end(JSON.stringify(payload));
}

function unavailable(res, variable) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(503).json({ error: 'app_association_not_configured', missing: variable });
}
