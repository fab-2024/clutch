import { loadGrowthPresentation, PRIVATE_CACHE_HEADERS, publicGrowthOrigin } from '../server/growth-public-data.mjs';

export default async function handler(req, res) {
  for (const [key, value] of Object.entries(PRIVATE_CACHE_HEADERS)) res.setHeader(key, value);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).end();
  }
  const url = new URL(req.url || '/', 'https://clutch.invalid');
  const origin = publicGrowthOrigin();
  let card = null;
  let status = origin ? 404 : 503;
  if (origin) {
    try {
      card = await loadGrowthPresentation(url.searchParams.get('kind'), url.searchParams.get('id'), url.searchParams.get('milestone'));
      if (card) status = 200;
    } catch { status = 503; }
  }
  res.statusCode = status;
  if (req.method === 'HEAD') return res.end();
  return res.end(renderPage(card, origin, status));
}

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
function renderPage(card, origin, status) {
  const title = card?.title ?? 'Clutch · Lien indisponible';
  const description = card?.description ?? (status === 503 ? 'Ce lien est temporairement indisponible. Réessaie dans quelques instants.'
    : 'Ce contenu est privé, masqué ou introuvable.');
  const query = card ? new URLSearchParams({ kind: card.kind, id: card.code ?? card.pseudo, ...(card.milestone ? { milestone: String(card.milestone) } : {}) }) : null;
  const metadata = card ? `<meta property="og:url" content="${esc(origin + card.path)}"><meta property="og:image" content="${esc(`${origin}/api/growth-og?${query}`)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">` : '';
  const ios = /^https:\/\/apps\.apple\.com\//.test(process.env.CLUTCH_IOS_STORE_URL ?? '');
  const android = /^https:\/\/play\.google\.com\/store\/apps\//.test(process.env.CLUTCH_ANDROID_STORE_URL ?? '');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:type" content="website">${metadata}<style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;color:#f4f7fa;background:radial-gradient(ellipse at top,#123344,#06101a 70%);font:16px/1.6 system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:24px}main{width:min(100%,600px);border:1px solid #30414e;border-radius:28px;padding:clamp(24px,6vw,48px);background:#111e28e0}small{color:#e8ff3d;letter-spacing:.14em;font-weight:700}h1{font-size:clamp(32px,7vw,52px);line-height:1.06;letter-spacing:-.04em;margin:26px 0}p{color:#a5afb9}a{color:inherit}a:focus-visible,code:focus-visible{outline:3px solid #e8ff3d;outline-offset:5px}.primary{display:block;margin:28px 0 16px;background:#e8ff3d;color:#091117;font-weight:800;text-align:center;text-decoration:none;padding:16px;border-radius:14px}.stores{display:flex;flex-wrap:wrap;gap:16px;margin:20px 0}.code{display:block;overflow-wrap:anywhere;background:#06101a;padding:16px;border:1px solid #30414e;border-radius:12px;user-select:all}.notice{font-size:14px}.number{font-size:100px;line-height:1;color:#e8ff3d;font-weight:800}.rule{border-top:1px solid #30414e;padding-top:20px}</style></head><body><main><small>CLUTCH · ${card?.kind === 'milestone' ? 'JALON VÉRIFIÉ' : 'TA COMMUNAUTÉ'}</small>
  ${card?.kind === 'milestone' ? `<p class="number">${esc(card.milestone)}</p>` : ''}<h1>${esc(card?.headline ?? 'LIEN INDISPONIBLE')}</h1><p>${esc(description)}</p>
  ${card ? `<a class="primary" href="${esc(`clutch://${card.path.slice(1)}`)}">OUVRIR DANS CLUTCH</a>` : ''}
  ${card?.kind === 'invite' ? `<p class="notice rule">Après installation, rouvre ce lien ou colle ce code dans <strong>Inviter des amis</strong>. L’installation seule ne conserve pas automatiquement l’invitation.</p><code class="code" tabindex="0">${esc(card.code)}</code><p class="notice">Accepte un seul parrain dans les 7 jours suivant ton inscription, avant ton premier call. Tu conserves ton protecteur de bienvenue, sans doublon. Le parrain reçoit 30 Volts après ton premier call éligible, dans la limite de 5 récompenses par jour et 20 par mois. Aucun gain à la simple installation.</p>` : ''}
  ${card?.kind === 'milestone' ? `<p class="notice rule">Ce jalon atteste des jours de calls, pas d’une série de victoires. Sa visibilité dépend des réglages du propriétaire.</p>` : ''}
  ${card ? `<div class="stores">${ios ? '<a href="/api/download?platform=ios">Télécharger sur iPhone</a>' : ''}${android ? '<a href="/api/download?platform=android">Télécharger sur Android</a>' : ''}</div>` : ''}
  <p class="notice"><a href="/privacy">Confidentialité</a> · <a href="/support">Aide</a></p></main></body></html>`;
}
