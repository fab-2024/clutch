import { SUPABASE_URL, SUPABASE_ANON_KEY, MODE_DEMO } from './config.js';

const BASE = SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SESSION_KEY = 'clutch.session';

function sessionCourante() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

async function rpc(nom, args = {}) {
  if (MODE_DEMO) throw new Error('Les Friend Quests nécessitent Supabase.');
  const session = sessionCourante();
  if (!session?.access_token) throw new Error('Connecte-toi pour retrouver tes missions.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    response = await fetch(`${BASE}/rest/v1/rpc/${nom}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Les missions mettent trop de temps à répondre.');
    throw new Error('Impossible de joindre les missions sociales.');
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (!response.ok) throw new Error(data?.message || data?.hint || `Erreur ${response.status}`);
  return data;
}

export const dashboardFriendQuests = () => rpc('clutch_friend_quests_dashboard_v1');
export const marquerFriendQuestRevelee = (questId) => rpc('clutch_friend_quest_mark_revealed_v1', { p_quest: questId });
export const monXpFriendQuests = () => rpc('clutch_mon_xp_quetes_v1');
