import * as api from './api.js';
import { contexte } from './app.js';
import { liguePublique } from './league-v3-api.js';
import { toast } from './ui.js';
import { CLE_INVITATION_LIGUE } from './views/ligue-invitation.js';

let enCours = false;

function pending() {
  try { return JSON.parse(localStorage.getItem(CLE_INVITATION_LIGUE) || 'null'); }
  catch { return null; }
}

async function reprendre() {
  if (enCours || !contexte.utilisateur) return;
  const p = pending();
  if (!p?.code) return;
  enCours = true;
  try {
    const joined = await api.rejoindreLigue(p.code);
    localStorage.removeItem(CLE_INVITATION_LIGUE);
    toast(`Bienvenue dans ${joined.nom}.`, 'succes');
    location.hash = `#/ligues/${encodeURIComponent(joined.id)}`;
  } catch (error) {
    if (/déjà|deja/i.test(error.message)) {
      const info = await liguePublique(p.code).catch(() => null);
      localStorage.removeItem(CLE_INVITATION_LIGUE);
      if (info?.id) location.hash = `#/ligues/${encodeURIComponent(info.id)}`;
    }
  } finally { enCours = false; }
}

window.addEventListener('hashchange', () => setTimeout(() => void reprendre(), 80));
window.addEventListener('focus', () => void reprendre());
new MutationObserver(() => { if (pending()) void reprendre(); }).observe(document.body, { childList:true, subtree:true });
setInterval(() => { if (pending()) void reprendre(); }, 1800);
setTimeout(() => void reprendre(), 0);
