import { loadPublicObject, publicPresentation } from '../server/public-data.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method Not Allowed');
  }
  const requestUrl = new URL(req.url || '/', 'https://clutch.invalid');
  const kind = normalizeKind(requestUrl.searchParams.get('kind'));
  const ref = requestUrl.searchParams.get('id') || '';
  const origin = requestOrigin(req);
  let data = null;
  try { data = kind ? await loadPublicObject(kind, ref) : null; }
  catch (error) { console.error('[public] page data error', error?.message || error); }

  const card = kind && data ? publicPresentation(kind, data) : null;
  const canonical = canonicalUrl(origin, kind, ref);
  const version = card ? ogVersion(card) : 'missing';
  const ogImage = `${origin}/api/og?kind=${encodeURIComponent(kind || 'generic')}&id=${encodeURIComponent(ref)}&v=${encodeURIComponent(version)}`;
  res.statusCode = card ? 200 : 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', card ? 'public, s-maxage=30, stale-while-revalidate=120' : 'public, s-maxage=15');
  res.setHeader('X-Robots-Tag', card ? 'index, follow' : 'noindex, nofollow');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  const html = card ? renderCardPage({ card, canonical, ogImage }) : renderNotFound({ canonical, ogImage });
  if (req.method === 'HEAD') return res.end();
  return res.end(html);
}

function renderCardPage({ card, canonical, ogImage }) {
  const date = formatDate(card.date);
  const separator = card.separator || 'VS';
  const score = card.status === 'termine' && card.scoreA != null && card.scoreB != null
    ? `<div class="score"><span>${escapeHtml(card.tagA)}</span><strong>${escapeHtml(String(card.scoreA))} — ${escapeHtml(String(card.scoreB))}</strong><span>${escapeHtml(card.tagB)}</span></div>`
    : `<div class="versus"><div><b>${escapeHtml(card.tagA)}</b><span>${escapeHtml(card.equipeA)}</span></div><i>${escapeHtml(separator)}</i><div><b>${escapeHtml(card.tagB)}</b><span>${escapeHtml(card.equipeB)}</span></div></div>`;
  const detail = card.kind === 'challenge' && card.chosenTag
    ? `<div class="call"><small>LE CALL</small><strong>${escapeHtml(card.creator)} → ${escapeHtml(card.chosenTag)}</strong><span>${escapeHtml(card.conviction || 'Normal')}</span></div>`
    : card.kind === 'league'
      ? `<div class="call"><small>LEADER ACTUEL</small><strong>${escapeHtml(card.leader || 'À prendre')}</strong><span>${escapeHtml(`${Number(card.leaderFrags || 1000).toLocaleString('fr-FR')} Frags`)}</span></div>`
      : '';
  const alt = card.kind === 'league' ? `Invitation à rejoindre ${card.leagueName} sur GRIFF` : `${card.tagA} vs ${card.tagB} sur GRIFF`;

  return `<!doctype html><html lang="fr"><head>
<meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>${escapeHtml(card.title)}</title><meta name="description" content="${escapeAttr(card.description)}" /><link rel="canonical" href="${escapeAttr(canonical)}" /><meta name="theme-color" content="#06080b" />
<meta property="og:type" content="website" /><meta property="og:site_name" content="GRIFF" /><meta property="og:locale" content="fr_FR" /><meta property="og:url" content="${escapeAttr(canonical)}" /><meta property="og:title" content="${escapeAttr(card.title)}" /><meta property="og:description" content="${escapeAttr(card.description)}" /><meta property="og:image" content="${escapeAttr(ogImage)}" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta property="og:image:alt" content="${escapeAttr(alt)}" />
<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${escapeAttr(card.title)}" /><meta name="twitter:description" content="${escapeAttr(card.description)}" /><meta name="twitter:image" content="${escapeAttr(ogImage)}" /><style>${pageCss()}</style></head>
<body><div class="ambient" aria-hidden="true"><i></i><i></i></div><header><a class="brand" href="/">GRIFF<span>.</span></a><span class="public">PUBLIC LINK</span></header><main><article class="card"><div class="eyebrow">${escapeHtml(card.eyebrow)}</div><h1>${escapeHtml(card.headline)}</h1><p>${escapeHtml(card.description)}</p><div class="meta"><span>${escapeHtml(card.event || 'E-sport')}</span>${card.format ? `<b>${escapeHtml(card.format)}</b>` : ''}${date ? `<b>${escapeHtml(date)}</b>` : ''}</div>${score}${detail}${storeLinks()}<small class="foot">Calls gratuits · Frags = classement · aucun argent réel en jeu.</small></article></main><footer><a href="/">Découvrir GRIFF</a><span>GRIFF // ESPORT CALLS</span></footer></body></html>`;
}

function renderNotFound({ canonical, ogImage }) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lien introuvable | GRIFF</title><meta name="robots" content="noindex,nofollow"><meta property="og:title" content="GRIFF"><meta property="og:description" content="Le compagnon compétitif esport."><meta property="og:image" content="${escapeAttr(ogImage)}"><link rel="canonical" href="${escapeAttr(canonical)}"><style>${pageCss()}</style></head><body><header><a class="brand" href="/">GRIFF<span>.</span></a></header><main><article class="card"><div class="eyebrow">LIEN PUBLIC</div><h1>CE LIEN N’EST PLUS DISPONIBLE.</h1><p>Le match, le défi ou la ligue a peut-être été supprimé ou mal copié.</p><a class="cta" href="/">Découvrir GRIFF <span>›</span></a></article></main></body></html>`;
}

function storeLinks() {
  return '<div class="store-actions"><a class="cta" href="/api/download?platform=ios">OUVRIR SUR IPHONE <span>›</span></a><a class="cta secondary" href="/api/download?platform=android">OUVRIR SUR ANDROID <span>›</span></a></div>';
}

function pageCss() {
  return `:root{color-scheme:dark;--bg:#06080b;--ink:#f5f7f2;--line:rgba(255,255,255,.1);--volt:#e8ff3d}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto;overflow-x:hidden;background:radial-gradient(circle at 50% 28%,rgba(232,255,61,.07),transparent 24rem),linear-gradient(#06080b,#050608)}.ambient{position:fixed;inset:0;pointer-events:none;overflow:hidden}.ambient i{position:absolute;width:34rem;height:34rem;border-radius:50%;filter:blur(80px);opacity:.08;background:var(--volt)}.ambient i:first-child{left:-20rem;top:20%}.ambient i:last-child{right:-22rem;bottom:-15rem}header,footer{width:min(1120px,calc(100% - 32px));margin:auto;display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}header{height:72px;border-bottom:1px solid rgba(255,255,255,.055)}footer{min-height:64px;color:#5f665d;font-size:11px;letter-spacing:.08em}footer a{color:#9ca396;text-decoration:none}.brand{color:#fff;text-decoration:none;font-size:21px;font-weight:950;letter-spacing:-.05em}.brand span{color:var(--volt)}.public{font-size:10px;letter-spacing:.18em;font-weight:900;color:#687064}main{width:min(760px,calc(100% - 28px));margin:auto;padding:34px 0 44px;position:relative;z-index:1}.card{position:relative;overflow:hidden;padding:clamp(26px,6vw,52px);border:1px solid rgba(232,255,61,.18);border-radius:32px;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.012));box-shadow:0 32px 90px rgba(0,0,0,.45),inset 0 1px rgba(255,255,255,.05)}.card:before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 10%,rgba(232,255,61,.03) 42%,transparent 60%);pointer-events:none}.eyebrow{position:relative;color:var(--volt);font-size:11px;font-weight:950;letter-spacing:.2em}h1{position:relative;margin:12px 0 12px;font-family:"Arial Narrow",Impact,ui-sans-serif,sans-serif;font-size:clamp(44px,9vw,78px);line-height:.88;letter-spacing:-.055em;text-transform:uppercase;text-wrap:balance}p{position:relative;margin:0;max-width:610px;color:#adb4aa;font-size:15px;line-height:1.55}.meta{position:relative;margin:24px 0 14px;padding-top:14px;border-top:1px solid var(--line);display:flex;flex-wrap:wrap;gap:8px;align-items:center;color:#b9c0b5;font-size:11px;font-weight:850;text-transform:uppercase;letter-spacing:.08em}.meta b{padding:5px 8px;border-radius:999px;background:rgba(255,255,255,.045);color:#7f887a}.versus,.score{position:relative;margin:20px 0;display:grid;grid-template-columns:1fr auto 1fr;gap:14px;align-items:center}.versus>div{min-width:0;padding:20px;border:1px solid var(--line);border-radius:18px;background:rgba(0,0,0,.16)}.versus>div:last-child{text-align:right}.versus b{display:block;color:var(--volt);font-family:"Arial Narrow",Impact,sans-serif;font-size:clamp(38px,8vw,58px);line-height:.85}.versus span{display:block;margin-top:8px;color:#8f978a;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.versus i{color:var(--volt);font-style:normal;font-size:11px;font-weight:950;letter-spacing:.14em}.score{text-align:center}.score span{font-size:clamp(18px,5vw,28px);font-weight:900}.score strong{color:var(--volt);font-family:"Arial Narrow",Impact,sans-serif;font-size:clamp(42px,9vw,72px)}.call{position:relative;margin:16px 0;padding:14px 16px;border:1px solid rgba(232,255,61,.12);border-radius:14px;background:rgba(232,255,61,.025);display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center}.call small{color:var(--volt);font-size:9px;font-weight:950;letter-spacing:.16em}.call strong{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.call span{color:#a7afa2;font-size:11px}.cta{position:relative;margin-top:22px;min-height:54px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;border-radius:15px;background:var(--volt);color:#10120c;text-decoration:none;font-size:14px;font-weight:950;box-shadow:0 15px 45px rgba(232,255,61,.08)}.cta span{font-size:26px}.foot{position:relative;display:block;margin-top:12px;color:#626a5f;font-size:10px;text-align:center}@media(max-width:560px){header{height:60px}.card{border-radius:23px;padding:25px 17px}.public{display:none}.versus>div{padding:16px 12px}.versus{gap:8px}.call{grid-template-columns:1fr}.call span{justify-self:start}footer{padding-bottom:max(12px,env(safe-area-inset-bottom));flex-direction:column;justify-content:center;gap:5px}}`;
}

function normalizeKind(value) { return ['challenge','match','league'].includes(value) ? value : null; }
function requestOrigin(req) { const protoRaw=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim(); const proto=protoRaw==='http'?'http':'https'; const rawHost=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim(); const host=/^[a-zA-Z0-9.:-]+$/.test(rawHost)?rawHost:'clutch-git-main-clutch17.vercel.app'; return `${proto}://${host}`; }
function canonicalUrl(origin,kind,ref){ if(kind==='challenge')return `${origin}/c/${encodeURIComponent(String(ref||''))}`; if(kind==='match')return `${origin}/m/${encodeURIComponent(String(ref||''))}`; if(kind==='league')return `${origin}/l/${encodeURIComponent(String(ref||'').toUpperCase())}`; return origin; }
function ogVersion(card){ const raw=[card.kind,card.status,card.scoreA??'-',card.scoreB??'-',card.chosenTag??'-',card.conviction??'-',card.members??'-',card.leader??'-',card.leaderFrags??'-'].join('|'); let hash=2166136261; for(let i=0;i<raw.length;i+=1){hash^=raw.charCodeAt(i);hash=Math.imul(hash,16777619);} return (hash>>>0).toString(36); }
function formatDate(value){ if(!value)return ''; const d=new Date(value); if(Number.isNaN(d.getTime()))return ''; return new Intl.DateTimeFormat('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Paris'}).format(d).replace(',',' ·'); }
function escapeHtml(value){ return String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(value){ return escapeHtml(value).replace(/`/g,'&#96;'); }
