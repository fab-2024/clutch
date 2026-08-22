const PAGES = {
  privacy: {
    eyebrow: 'CLUTCH // DONNÉES',
    title: 'Politique de confidentialité',
    intro: 'Clutch limite la collecte aux données utiles au compte, à la compétition, aux fonctions sociales, aux notifications, aux achats et à la mesure de fiabilité du produit.',
    sections: [
      ['Données traitées', 'Adresse e-mail, pseudo, préférences, calls, verdicts, progression, relations sociales, inventaire, références d’achat validées et événements produit prédéfinis. Aucun identifiant publicitaire ou suivi inter-applications.'],
      ['Prestataires', 'Supabase héberge le compte et les données, Expo livre les notifications push et RevenueCat vérifie les achats intégrés. Ils ne reçoivent que les informations nécessaires à leur mission.'],
      ['Conservation', 'Les données du compte sont supprimées avec celui-ci. Les événements bruts de mesure d’usage sont automatiquement purgés au plus tard après 13 mois, sauf obligation légale contraire.'],
      ['Tes droits', 'Tu peux demander l’accès ou la rectification de tes données et supprimer ton compte depuis l’application ou depuis la ressource de suppression publique.'],
    ],
  },
  terms: {
    eyebrow: 'CLUTCH // RÈGLES',
    title: 'Conditions d’utilisation',
    intro: 'Clutch est un jeu social de prédiction e-sport, sans mise d’argent réel. Frags, XP et Volts n’ont aucune valeur monétaire et ne sont pas retirables.',
    sections: [
      ['Compte', 'Tu dois protéger ton mot de passe, utiliser des informations exactes et respecter les autres joueurs. Les abus, fraudes, contenus illicites ou atteintes aux droits d’autrui sont interdits.'],
      ['Compétition', 'Les verdicts sont réglés à partir des sources indiquées dans le Match Center. Une erreur manifeste ou un match annulé peut entraîner une correction traçable.'],
      ['Achats', 'Les achats sont facturés et remboursés selon les règles d’Apple ou Google. Le Founder Pack est un achat unique de contenus visuels sans avantage compétitif.'],
      ['Disponibilité', 'Le service peut évoluer ou être interrompu pour maintenance, sécurité ou conformité.'],
    ],
  },
  support: {
    eyebrow: 'CLUTCH // SUPPORT',
    title: 'Besoin d’aide ?',
    intro: 'Compte, verdict, achat ou sécurité : indique ton pseudo, ton appareil et l’heure du problème. Ne communique jamais ton mot de passe.',
    sections: [],
  },
  deletion: {
    eyebrow: 'CLUTCH // COMPTE',
    title: 'Supprimer ton compte',
    intro: 'Tu peux supprimer ton compte directement dans Moi → Paramètres → Compte et données. Si tu n’as plus accès à l’application, utilise la demande ci-dessous.',
    sections: [
      ['Ce qui est supprimé', 'Le profil, les calls, la progression, les relations sociales, les tokens push, l’inventaire et les données RevenueCat associées au compte.'],
      ['Vérification', 'Pour protéger le compte, le support peut demander une confirmation depuis l’adresse e-mail déjà associée. Ne transmets jamais ton mot de passe.'],
      ['Délai', 'La suppression intégrée à l’application est immédiate. Une demande manuelle est traitée dans un délai raisonnable et confirmée par e-mail.'],
    ],
  },
};

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method Not Allowed');
  }
  const url = new URL(req.url || '/', 'https://clutch.invalid');
  const key = url.searchParams.get('page') || '';
  const page = PAGES[key];
  if (!page) return res.status(404).send('Not Found');

  const supportEmail = validEmail(process.env.CLUTCH_SUPPORT_EMAIL) ? process.env.CLUTCH_SUPPORT_EMAIL.trim() : null;
  const subject = key === 'deletion' ? 'Demande de suppression de compte Clutch' : 'Support Clutch';
  const mail = supportEmail ? `mailto:${encodeURIComponent(supportEmail)}?subject=${encodeURIComponent(subject)}` : null;
  const contact = mail
    ? `<a class="cta" href="${escapeAttr(mail)}">${key === 'deletion' ? 'DEMANDER LA SUPPRESSION' : 'CONTACTER LE SUPPORT'} <span>›</span></a>`
    : '<div class="warning">Le contact public est en cours de configuration. La publication Store reste bloquée tant qu’il manque.</div>';
  const canonical = `${requestOrigin(req)}${canonicalPath(key)}`;
  const sections = page.sections.map(([title, copy], index) => `<section><b>${String(index + 1).padStart(2, '0')}</b><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(copy)}</p></div></section>`).join('');
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escapeHtml(page.title)} | Clutch</title><meta name="description" content="${escapeAttr(page.intro)}"><link rel="canonical" href="${escapeAttr(canonical)}"><meta name="theme-color" content="#06080b"><style>${css()}</style></head><body><header><a href="/" class="brand">CLUTCH<span>.</span></a><nav><a href="/privacy">Confidentialité</a><a href="/terms">Conditions</a><a href="/support">Support</a></nav></header><main><div class="eyebrow">${escapeHtml(page.eyebrow)}</div><h1>${escapeHtml(page.title)}</h1><p class="lead">${escapeHtml(page.intro)}</p>${sections}${contact}<small>Dernière mise à jour : 22 août 2026</small></main><footer>Prédictions e-sport gratuites · Aucun argent réel en jeu.</footer></body></html>`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
  if (req.method === 'HEAD') return res.end();
  return res.end(html);
}

function canonicalPath(key) { return key === 'deletion' ? '/account-deletion' : `/${key}`; }
function requestOrigin(req) { const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim()==='http'?'http':'https'; const raw=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim(); const host=/^[a-zA-Z0-9.:-]+$/.test(raw)?raw:'clutch.invalid'; return `${proto}://${host}`; }
function validEmail(value) { return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char])); }
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
function css() { return `:root{color-scheme:dark;--bg:#06080b;--ink:#f5f7f2;--muted:#a4ada1;--volt:#e8ff3d}*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg);color:var(--ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif}body{min-height:100dvh;background:radial-gradient(circle at 50% 15%,rgba(232,255,61,.07),transparent 27rem),#06080b}header,footer,main{width:min(800px,calc(100% - 32px));margin:auto}header{min-height:72px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.07)}.brand{color:#fff;text-decoration:none;font-size:21px;font-weight:950;letter-spacing:-.05em}.brand span,.eyebrow{color:var(--volt)}nav{display:flex;gap:16px}nav a{color:#8d968a;text-decoration:none;font-size:12px}main{padding:54px 0 72px}.eyebrow{font-size:10px;font-weight:950;letter-spacing:.2em}h1{margin:12px 0;font-family:"Arial Narrow",Impact,sans-serif;font-size:clamp(50px,10vw,86px);line-height:.9;letter-spacing:-.055em;text-transform:uppercase}.lead{max-width:690px;margin:0 0 34px;color:var(--muted);font-size:16px;line-height:1.6}section{display:grid;grid-template-columns:32px 1fr;gap:14px;padding:22px 0;border-top:1px solid rgba(255,255,255,.08)}section>b{color:var(--volt);font-size:11px}h2{margin:0;color:#f4f6f1;font-size:16px;text-transform:uppercase}section p{margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.6}.cta{min-height:56px;margin-top:28px;padding:0 19px;display:flex;align-items:center;justify-content:space-between;border-radius:15px;background:var(--volt);color:#0d1009;text-decoration:none;font-weight:950}.cta span{font-size:24px}.warning{margin-top:28px;padding:16px;border:1px solid #6b3440;border-radius:15px;background:#1b0d11;color:#ffadb8;font-size:13px}main>small{display:block;margin-top:18px;color:#60695e}footer{min-height:64px;border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;color:#616a5f;font-size:11px}@media(max-width:580px){header{min-height:62px}nav{gap:9px}nav a{font-size:10px}main{padding-top:38px}h1{font-size:52px}}`; }
