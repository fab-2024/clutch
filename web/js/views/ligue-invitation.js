import * as api from '../api.js';
import { contexte } from '../app.js';
import { liguePublique } from '../league-v3-api.js';
import { esc, toast } from '../ui.js';

export const CLE_INVITATION_LIGUE = 'clutch:league:pending:v1';

export async function vueLigueInvitation(racine, codeBrut) {
  const code = String(codeBrut || '').trim().toUpperCase();
  racine.innerHTML = '<div class="phase10-loading"><span class="spinner"></span><strong>Lecture de l’invitation…</strong></div>';

  let ligue;
  try { ligue = await liguePublique(code); }
  catch (error) {
    racine.innerHTML = `<div class="vide"><h3>Invitation indisponible</h3><p>${esc(error.message)}</p><p><a href="#/ligues">Voir les ligues</a></p></div>`;
    return;
  }
  if (!ligue) {
    racine.innerHTML = '<div class="vide"><h3>Invitation introuvable</h3><p>Ce code n’existe plus.</p><p><a href="#/ligues">Voir les ligues</a></p></div>';
    return;
  }

  racine.innerHTML = `
    <section class="phase10-invite">
      <div class="phase10-invite__crest">${esc(initiales(ligue.nom))}</div>
      <small>INVITATION DE LIGUE</small>
      <h1>${esc(ligue.nom)}</h1>
      <p>${esc(ligue.createur_pseudo || 'Un joueur')} t’invite dans son classement privé. Tes pronostics restent les mêmes : ici, ils deviennent une rivalité entre potes.</p>
      <div class="phase10-invite__stats">
        <div><small>MEMBRES</small><strong>${Number(ligue.nb_membres || 0)}</strong></div>
        <div><small>LEADER</small><strong>${esc(ligue.leader_pseudo || '—')}</strong></div>
        <div><small>FRAGS #1</small><strong>${Number(ligue.leader_frags || 1000).toLocaleString('fr-FR')}</strong></div>
      </div>
      <button type="button" class="phase10-invite__cta" data-phase10-join="${esc(code)}">${contexte.utilisateur ? 'Rejoindre la ligue' : 'Accepter l’invitation'}</button>
      <span class="phase10-invite__note">${contexte.utilisateur ? 'Tu entres immédiatement dans le classement de la saison.' : 'Tu choisis d’abord. La création du profil vient juste après.'}</span>
    </section>`;

  racine.querySelector('[data-phase10-join]')?.addEventListener('click', async (buttonEvent) => {
    const button = buttonEvent.currentTarget;
    if (!contexte.utilisateur) {
      localStorage.setItem(CLE_INVITATION_LIGUE, JSON.stringify({ code, id: ligue.id, nom: ligue.nom, creeLe: Date.now() }));
      location.hash = '#/connexion';
      return;
    }
    button.disabled = true;
    button.textContent = 'Entrée dans la ligue…';
    try {
      const joined = await api.rejoindreLigue(code);
      localStorage.removeItem(CLE_INVITATION_LIGUE);
      toast(`Bienvenue dans ${joined.nom}.`, 'succes');
      location.hash = `#/ligues/${encodeURIComponent(joined.id)}`;
    } catch (error) {
      if (/déjà|deja/i.test(error.message)) {
        localStorage.removeItem(CLE_INVITATION_LIGUE);
        location.hash = `#/ligues/${encodeURIComponent(ligue.id)}`;
        return;
      }
      toast(error.message, 'erreur');
      button.disabled = false;
      button.textContent = 'Rejoindre la ligue';
    }
  });
}

function initiales(v='') {
  const w=String(v).trim().split(/\s+/).filter(Boolean);
  return (w.length>1?`${w[0][0]}${w.at(-1)[0]}`:w[0]?.slice(0,2)||'CL').toUpperCase();
}
