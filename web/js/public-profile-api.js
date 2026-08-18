import { SUPABASE_URL, SUPABASE_ANON_KEY, MODE_DEMO } from './config.js';

const BASE = SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SESSION_KEY = 'clutch.session';

function sessionCourante() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

async function rpc(nom, args = {}, { authenticated = false } = {}) {
  if (MODE_DEMO) throw new Error('Les profils publics nécessitent Supabase.');
  const session = sessionCourante();
  if (authenticated && !session?.access_token) throw new Error('Connecte-toi pour continuer.');
  const token = session?.access_token || SUPABASE_ANON_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    response = await fetch(`${BASE}/rest/v1/rpc/${nom}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Le profil met trop de temps à répondre.');
    throw new Error('Impossible de joindre le profil public.');
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) {
    const err = new Error(data?.message || data?.hint || `Erreur ${response.status}`);
    err.status = response.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export const lireProfilPublic = (pseudo) => rpc('clutch_profil_public_v1', { p_pseudo: pseudo });
export const reglerVisibiliteProfil = (visible) => rpc('clutch_regler_visibilite_profil_v1', { p_public: Boolean(visible) }, { authenticated: true });

export function urlProfilPublic(pseudo) {
  return `${location.origin}/u/${encodeURIComponent(String(pseudo || '').trim())}`;
}
