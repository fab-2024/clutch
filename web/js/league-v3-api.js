import { MODE_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const BASE = SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SESSION_KEY = 'clutch.session';

function sessionCourante() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

async function rpc(nom, args = {}, { anon = false } = {}) {
  if (MODE_DEMO) throw new Error('Cette expérience sociale nécessite Supabase.');
  const session = sessionCourante();
  if (!anon && !session?.access_token) throw new Error('Connecte-toi pour continuer.');
  const bearer = session?.access_token || SUPABASE_ANON_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    response = await fetch(`${BASE}/rest/v1/rpc/${nom}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${bearer}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Le QG de ligue ne répond pas.');
    throw new Error('Impossible de joindre le QG de ligue.');
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; }
  catch { data = { message: text }; }
  if (!response.ok) throw new Error(data?.message || data?.hint || `Erreur ${response.status}`);
  return data;
}

export const dashboardLigue = (ligueId, saisonId) => rpc('clutch_ligue_dashboard_v1', {
  p_ligue_id: ligueId,
  p_saison_id: saisonId,
});

export const reagirLigue = (ligueId, eventKey, reaction) => rpc('clutch_reagir_ligue_v1', {
  p_ligue_id: ligueId,
  p_event_key: eventKey,
  p_reaction: reaction,
});

export const liguePublique = (code) => rpc('clutch_ligue_public', { p_code: code }, { anon: true });

export function urlPubliqueLigue(code) {
  return `${location.origin}/l/${encodeURIComponent(String(code || '').toUpperCase())}`;
}
