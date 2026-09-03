const MILESTONES = new Set([3, 7, 14, 30, 50, 100]);
const CODE = /^[0-9a-f]{32}$/;
export const PRIVATE_CACHE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

export function publicGrowthOrigin() {
  const configured = process.env.CLUTCH_APP_ORIGIN || process.env.EXPO_PUBLIC_APP_ORIGIN;
  try {
    const url = new URL(configured);
    return url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash
      ? url.origin : null;
  } catch { return null; }
}

export function safeGrowthPseudo(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 48 && value === value.trim()
    && !/[\u0000-\u001f\u007f/\\?#%]/.test(value) && value !== '.' && value !== '..' ? value : null;
}

function credentials() {
  const base = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  let url;
  try { url = new URL(base); } catch { throw new Error('growth_unconfigured'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || !key) throw new Error('growth_unconfigured');
  const headers = { apikey: key, Accept: 'application/json', 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_publishable_')) {
    let claims;
    try { claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')); } catch { throw new Error('growth_unconfigured'); }
    // These public previews must never use service-role credentials.
    if (claims.role !== 'anon') throw new Error('growth_unconfigured');
    headers.Authorization = `Bearer ${key}`;
  }
  return { origin: url.origin, headers };
}

async function readPublicRpc(name, args) {
  const { origin, headers } = credentials();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(`${origin}/rest/v1/rpc/${name}`, {
      method: 'POST', headers, body: JSON.stringify(args), signal: controller.signal, cache: 'no-store', redirect: 'error',
    });
    if (!response.ok) throw new Error('growth_unavailable');
    return await response.json();
  } finally { clearTimeout(timeout); }
}

export async function loadGrowthPresentation(kind, id, milestone) {
  if (kind === 'invite') {
    if (typeof id !== 'string' || !CODE.test(id)) return null;
    const data = await readPublicRpc('clutch_invitation_publique_v1', { p_code: id });
    if (!data || data.valide !== true) return null;
    const inviter = safeGrowthPseudo(data.parrain);
    return { kind, code: id, pseudo: inviter, path: `/i/${id}`, title: 'Une place dans le cercle · Clutch',
      headline: 'REJOINS TON CERCLE', description: inviter ? `${inviter} t’invite sur Clutch. Accepte l’invitation avant ton premier call classé.`
        : 'Un supporter t’invite sur Clutch. Accepte l’invitation avant ton premier call classé.' };
  }
  const pseudo = safeGrowthPseudo(id);
  if (!pseudo) return null;
  if (kind === 'showcase') {
    const data = await readPublicRpc('clutch_vitrine_v1', { p_pseudo: pseudo });
    if (!data || data.profil_public !== true || data.visibilite !== 'publique' || !safeGrowthPseudo(data.pseudo)) return null;
    return { kind, pseudo: data.pseudo, path: `/v/${encodeURIComponent(data.pseudo)}`, title: `La vitrine de ${data.pseudo} · Clutch`,
      headline: 'MA COLLECTION. MON STYLE.', description: `Découvre la vitrine de ${data.pseudo} sur Clutch.`,
      likes: Number.isSafeInteger(data.likes) && data.likes >= 0 ? data.likes : 0 };
  }
  if (kind === 'milestone') {
    if (!MILESTONES.has(Number(milestone)) || !/^\d{1,3}$/.test(String(milestone))) return null;
    const data = await readPublicRpc('clutch_jalon_public_v1', { p_pseudo: pseudo, p_palier: Number(milestone) });
    if (!data || !safeGrowthPseudo(data.pseudo) || data.palier !== Number(milestone) || !Number.isFinite(Date.parse(data.obtenu_le))) return null;
    return { kind, pseudo: data.pseudo, milestone: data.palier, earnedAt: data.obtenu_le,
      path: `/s/${encodeURIComponent(data.pseudo)}/${data.palier}`, title: `${data.pseudo} · ${data.palier} jours de calls · Clutch`,
      headline: `${data.palier} JOURS DE CALLS`, description: `${data.pseudo} a obtenu le jalon ${data.palier} jours de calls. Vérifié par Clutch.` };
  }
  return null;
}
