const STORES = {
  ios: { env: 'CLUTCH_IOS_STORE_URL', host: 'apps.apple.com' },
  android: { env: 'CLUTCH_ANDROID_STORE_URL', host: 'play.google.com' },
};

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method Not Allowed');
  }

  const requestUrl = new URL(req.url || '/', 'https://clutch.invalid');
  const store = STORES[requestUrl.searchParams.get('platform')];
  const destination = store ? validStoreUrl(process.env[store.env], store.host) : null;

  if (!destination) {
    res.statusCode = 503;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>GRIFF bientôt disponible</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#06080b;color:#f5f7f2;font:16px system-ui"><main style="max-width:32rem;padding:2rem"><b style="color:#e8ff3d">GRIFF.</b><h1>LIEN STORE EN COURS DE CONFIGURATION.</h1><p>Reviens bientôt ou contacte le support depuis GRIFF.</p><a style="color:#e8ff3d" href="/">Retour à l’accueil</a></main></body></html>');
  }

  res.statusCode = 302;
  res.setHeader('Cache-Control', 'public, s-maxage=300');
  res.setHeader('Location', destination);
  return res.end();
}

function validStoreUrl(value, expectedHost) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || url.hostname !== expectedHost) return null;
    return url.toString();
  } catch {
    return null;
  }
}
