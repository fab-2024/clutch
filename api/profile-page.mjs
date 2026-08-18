import { loadPublicProfile, profilePresentation } from '../server/public-profile-data.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method Not Allowed');
  }

  const url = new URL(req.url || '/', 'https://clutch.invalid');
  const pseudo = url.searchParams.get('pseudo') || '';
  const origin = requestOrigin(req);
  let profile = null;
  try {
    const data = await loadPublicProfile(pseudo);
    profile = data ? profilePresentation(data) : null;
  } catch (error) {
    console.error('[public-profile] page data error', error?.message || error);
  }

  const canonical = `${origin}/u/${encodeURIComponent(profile?.pseudo || pseudo)}`;
  const version = profile ? profileVersion(profile) : 'missing';
  const ogImage = `${origin}/api/profile-og?pseudo=${encodeURIComponent(profile?.pseudo || pseudo)}&v=${encodeURIComponent(version)}`;
  res.statusCode = profile ? 200 : 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', profile ? 'public, s-maxage=30, stale-while-revalidate=120' : 'public, s-maxage=15');
  res.setHeader('X-Robots-Tag', profile ? 'index, follow' : 'noindex, nofollow');
  res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  const html = profile ? renderProfile({ profile, canonical, ogImage }) : renderMissing({ canonical, ogImage });
  if (req.method === 'HEAD') return res.end();
  return res.end(html);
}

function renderProfile({ profile, canonical, ogImage }) {
  const rank = profile.rang ? `#${Number(profile.rang).toLocaleString('fr-FR')}` : 'Placement';
  const serie = profile.serie ? `🔥 Série ${profile.serie}` : 'Signature active';
  return `<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(profile.title)}</title><meta name="description" content="${attr(profile.description)}"><link rel="canonical" href="${attr(canonical)}"><meta name="theme-color" content="#06080b">
<meta property="og:type" content="profile"><meta property="og:site_name" content="Clutch"><meta property="og:locale" content="fr_FR"><meta property="og:url" content="${attr(canonical)}"><meta property="og:title" content="${attr(profile.title)}"><meta property="og:description" content="${attr(profile.description)}"><meta property="og:image" content="${attr(ogImage)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Profil Clutch de ${attr(profile.pseudo)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${attr(profile.title)}"><meta name="twitter:description" content="${attr(profile.description)}"><meta name="twitter:image" content="${attr(ogImage)}"><style>${css()}</style></head>
<body><div class="glow"></div><header><a href="/" class="brand">CLUTCH<span>.</span></a><b>PUBLIC PROFILE</b></header><main><article class="card"><div class="sig"><span>${esc(profile.styleSymbol)}</span><strong>${esc(profile.style)}</strong></div><h1>${esc(profile.pseudo)}</h1><p>${esc(profile.styleText)}</p><div class="line">${esc(profile.short)}</div><div class="stats"><div><small>FRAGS</small><strong>${Number(profile.frags).toLocaleString('fr-FR')}</strong></div><div><small>RANG</small><strong>${esc(rank)}</strong></div><div><small>PRÉCISION</small><strong>${Number(profile.precision)} %</strong></div><div><small>FORME</small><strong>${esc(serie)}</strong></div></div>${profile.faction ? `<div class="faction"><small>FACTION</small><strong>${esc(profile.faction)}</strong><span>${esc(profile.factionName || '')}</span></div>` : ''}<a class="cta" href="${attr(profile.spaPath)}">VOIR LE PROFIL COMPLET <span>›</span></a><small class="foot">Frags = classement compétitif · aucun argent réel en jeu.</small></article></main><footer><span>CLUTCH // PLAYER IDENTITY</span><a href="/#/accueil">Découvrir Clutch</a></footer></body></html>`;
}

function renderMissing({ canonical, ogImage }) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Profil indisponible | Clutch</title><meta name="robots" content="noindex,nofollow"><link rel="canonical" href="${attr(canonical)}"><meta property="og:title" content="Clutch"><meta property="og:description" content="Ce profil est privé ou introuvable."><meta property="og:image" content="${attr(ogImage)}"><style>${css()}</style></head><body><header><a href="/" class="brand">CLUTCH<span>.</span></a></header><main><article class="card"><div class="sig">PROFIL PUBLIC</div><h1>PROFIL INDISPONIBLE.</h1><p>Ce joueur a peut-être rendu son profil privé ou changé de pseudo.</p><a class="cta" href="/#/accueil">DÉCOUVRIR CLUTCH <span>›</span></a></article></main></body></html>`;
}

function css(){return `:root{color-scheme:dark;--bg:#06080b;--ink:#f7f8f4;--muted:#9ba398;--volt:#e8ff3d}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}body{min-height:100dvh;display:grid;grid-template-rows:auto 1fr auto;overflow-x:hidden;background:radial-gradient(circle at 28% 30%,rgba(232,255,61,.08),transparent 28rem),radial-gradient(circle at 80% 75%,rgba(145,115,255,.07),transparent 25rem),#06080b}.glow{position:fixed;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 15%,rgba(255,255,255,.015),transparent 62%)}header,footer{width:min(1080px,calc(100% - 32px));margin:auto;display:flex;align-items:center;justify-content:space-between}header{height:72px;border-bottom:1px solid rgba(255,255,255,.06)}header>b{font-size:10px;letter-spacing:.18em;color:#697165}.brand{color:#fff;text-decoration:none;font-size:21px;font-weight:950;letter-spacing:-.05em}.brand span{color:var(--volt)}main{width:min(760px,calc(100% - 28px));margin:auto;padding:36px 0 46px}.card{padding:clamp(26px,6vw,54px);border:1px solid rgba(232,255,61,.17);border-radius:32px;background:linear-gradient(145deg,rgba(255,255,255,.048),rgba(255,255,255,.012));box-shadow:0 32px 90px rgba(0,0,0,.44),inset 0 1px rgba(255,255,255,.05)}.sig{width:max-content;display:inline-flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid rgba(232,255,61,.19);border-radius:999px;background:rgba(232,255,61,.04);color:var(--volt);font-size:11px;font-weight:900;letter-spacing:.08em}.sig span{font-size:16px}h1{margin:16px 0 8px;font-family:"Arial Narrow",Impact,ui-sans-serif,sans-serif;font-size:clamp(58px,13vw,100px);line-height:.82;letter-spacing:-.065em;text-transform:uppercase;overflow-wrap:anywhere}p{max-width:590px;margin:0;color:var(--muted);font-size:15px;line-height:1.55}.line{margin-top:17px;color:#dce0d8;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase}.stats{margin-top:27px;padding-top:18px;border-top:1px solid rgba(255,255,255,.08);display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.stats div{padding:13px;border-radius:13px;background:rgba(255,255,255,.022)}.stats small,.stats strong{display:block}.stats small{color:#727b70;font-size:9px;font-weight:900;letter-spacing:.12em}.stats strong{margin-top:3px;font-family:"Arial Narrow",Impact,sans-serif;font-size:25px}.faction{margin-top:9px;padding:13px 15px;border:1px solid rgba(255,255,255,.06);border-radius:13px;background:rgba(0,0,0,.12);display:grid;grid-template-columns:auto auto 1fr;gap:10px;align-items:center}.faction small{color:var(--volt);font-size:9px;font-weight:900;letter-spacing:.14em}.faction strong{font-size:16px}.faction span{color:#798276;font-size:11px}.cta{margin-top:22px;min-height:54px;padding:0 20px;display:flex;align-items:center;justify-content:space-between;border-radius:15px;background:var(--volt);color:#11130d;text-decoration:none;font-size:13px;font-weight:950}.cta span{font-size:25px}.foot{display:block;margin-top:10px;color:#626a5f;font-size:10px;text-align:center}footer{min-height:64px;color:#5f665d;font-size:10px;letter-spacing:.09em}footer a{color:#9ca396;text-decoration:none}@media(max-width:600px){header{height:60px}header>b{display:none}.card{padding:26px 16px;border-radius:23px}.stats{grid-template-columns:repeat(2,1fr)}.faction{grid-template-columns:1fr}.faction span{margin-top:-5px}footer{padding-bottom:max(12px,env(safe-area-inset-bottom));flex-direction:column;justify-content:center;gap:5px}}`;}
function requestOrigin(req){const protoRaw=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();const proto=protoRaw==='http'?'http':'https';const rawHost=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();const host=/^[a-zA-Z0-9.:-]+$/.test(rawHost)?rawHost:'clutch-git-main-clutch17.vercel.app';return `${proto}://${host}`;}
function profileVersion(p){const raw=[p.pseudo,p.style,p.frags,p.rang??'-',p.precision,p.serie,p.faction??'-'].join('|');let hash=2166136261;for(let i=0;i<raw.length;i+=1){hash^=raw.charCodeAt(i);hash=Math.imul(hash,16777619);}return(hash>>>0).toString(36);}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}function attr(v){return esc(v).replace(/`/g,'&#96;');}
