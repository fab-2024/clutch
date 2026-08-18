import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../web/js/config.js';
import { signatureDepuisRecap, signatureCourte } from '../web/js/profile-identity.js';

const BASE = String(process.env.SUPABASE_URL || SUPABASE_URL || '').replace(/\/+$/, '');
const ANON = process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
const TIMEOUT_MS = 5000;

function safePseudo(value) {
  const pseudo = String(value || '').trim();
  if (!pseudo || pseudo.length > 48) return null;
  return pseudo;
}

async function rpcProfile(pseudo) {
  if (!BASE || !ANON) throw new Error('public_profile_unconfigured');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/rest/v1/rpc/clutch_profil_public_v1`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_pseudo: pseudo }),
    });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }
    if (!res.ok) throw new Error(`public_profile_${res.status}`);
    return body;
  } finally { clearTimeout(timer); }
}

export async function loadPublicProfile(rawPseudo) {
  const pseudo = safePseudo(rawPseudo);
  if (!pseudo) return null;
  return rpcProfile(pseudo);
}

export function profilePresentation(data) {
  if (!data?.pseudo) return null;
  const signature = signatureDepuisRecap(data.recap || {});
  const frags = Number(data.classement?.frags || 1000);
  const rang = Number(data.classement?.rang || 0) || null;
  const precision = Math.round(Number(data.recap?.precision_pct || 0));
  const serie = Number(data.serie_actuelle || 0);
  const faction = data.equipe_favorite?.tag || data.equipe_favorite?.nom || null;
  const short = signatureCourte(data);
  return {
    kind: 'profile',
    pseudo: String(data.pseudo),
    style: signature.nom,
    styleKey: signature.cle,
    styleSymbol: signature.symbole,
    styleText: signature.texte,
    short,
    frags,
    rang,
    precision,
    serie,
    faction,
    factionName: data.equipe_favorite?.nom || null,
    title: `${data.pseudo} · ${signature.nom} | Clutch`,
    description: `${signature.nom} · ${frags.toLocaleString('fr-FR')} Frags${rang ? ` · #${rang}` : ''}${precision ? ` · ${precision} %` : ''}. Découvre son profil Clutch.`,
    spaPath: `/#/u/${encodeURIComponent(String(data.pseudo))}`,
  };
}
