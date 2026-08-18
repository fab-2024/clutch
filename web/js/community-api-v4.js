/** Phase 11 — Community V4 data client. */
import { MODE_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

if (typeof document !== 'undefined' && !document.getElementById('phase11-relic-compat')) {
  const link = document.createElement('link');
  link.id = 'phase11-relic-compat';
  link.rel = 'stylesheet';
  link.href = 'styles/pages/phase11-community-relic-compat.css';
  document.head.append(link);
}

const BASE = SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SESSION_KEY = 'clutch.session';

function session() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

async function rpc(nom, args = {}) {
  if (MODE_DEMO) return null;
  const s = session();
  const jeton = s?.access_token || SUPABASE_ANON_KEY;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(`${BASE}/rest/v1/rpc/${nom}`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jeton}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
    const texte = await r.text();
    let data = null;
    try { data = texte ? JSON.parse(texte) : null; } catch { data = null; }
    if (!r.ok) throw new Error(data?.message || `Erreur ${r.status}`);
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('La faction met trop de temps à répondre.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const communauteDashboardV4 = () => rpc('clutch_communaute_dashboard_v4');
