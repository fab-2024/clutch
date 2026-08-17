// Profile V4 compatibility bridge.
// Keeps the current profile renderer intact while retiring Economy V1 UI debt.

import * as api from './api.js';

const ETAT = { timer: null };

function routeProfil() {
  return location.hash.replace(/^#/, '') === '/profil';
}

function nombre(v) {
  return Number.isFinite(Number(v)) ? Number(v) : 0;
}

function retirerColonnesLegacy(table) {
  if (!table || table.dataset.profileV4Clean === '1') return;
  table.dataset.profileV4Clean = '1';

  table.querySelectorAll('tr').forEach((row) => {
    // Legacy columns: Engagé + Multipl. (Economy V1). Remove from right to left.
    [3, 2].forEach((index) => row.children[index]?.remove());
  });

  const headers = table.querySelectorAll('thead th');
  if (headers[0]) headers[0].textContent = 'Match';
  if (headers[1]) headers[1].textContent = 'Pronostic';
  if (headers[2]) headers[2].textContent = 'Impact Frags';
}

function enrichirBlocHistorique(bloc, index) {
  if (!bloc || bloc.classList.contains('profile-history-v4')) return;
  bloc.classList.add('profile-history-v4');
  bloc.dataset.profileHistory = index === 0 ? 'open' : 'settled';

  const titre = bloc.querySelector('.bloc__titre');
  if (titre && !titre.querySelector('.profile-v4-legend')) {
    const legende = document.createElement('span');
    legende.className = 'profile-v4-legend';
    legende.textContent = index === 0 ? 'Choix verrouillés jusqu’au verdict' : 'Rating saisonnier · aucun Frag engagé';
    titre.appendChild(legende);
  }

  retirerColonnesLegacy(bloc.querySelector('table'));
}

function signatureDepuisRecap(recap = {}) {
  const pronostics = nombre(recap.paris);
  const gagnes = nombre(recap.gagnes);
  const precision = Number.isFinite(Number(recap.precision_pct))
    ? Number(recap.precision_pct)
    : pronostics > 0 ? (gagnes / pronostics) * 100 : 0;
  const outsiders = nombre(recap.outsiders_250_gagnes);
  const probaMin = Number(recap.proba_min_gagnee);
  const serie = nombre(recap.plus_longue_serie);

  if (pronostics >= 15 && precision >= 80) {
    return { cle: 'oracle', nom: 'Oracle', texte: 'Tu convertis la précision en identité.', detail: `${Math.round(precision)} % sur ${pronostics} verdicts` };
  }
  if (outsiders >= 3) {
    return { cle: 'upset', nom: 'Upset Hunter', texte: 'Tu cherches la faille plutôt que le favori.', detail: `${outsiders} outsiders transformés` };
  }
  if (serie >= 5) {
    return { cle: 'streaker', nom: 'Streaker', texte: 'Quand la série démarre, elle devient difficile à casser.', detail: `${serie} réussites consécutives` };
  }
  if (pronostics >= 10 && precision >= 70) {
    return { cle: 'safe', nom: 'Safe Hands', texte: 'Tu privilégies les choix qui tiennent sous pression.', detail: `${Math.round(precision)} % de précision` };
  }
  if (gagnes > 0 && Number.isFinite(probaMin) && probaMin > 0 && probaMin <= .4) {
    return { cle: 'contrarian', nom: 'Contrarian', texte: 'Tu sais parfois prendre le côté que le modèle laisse derrière.', detail: `Victoire à ${Math.round(probaMin * 100)} % modèle` };
  }
  return { cle: 'forming', nom: 'Signature en formation', texte: 'Ton style apparaîtra à mesure que les verdicts s’accumulent.', detail: `${pronostics} pronostic${pronostics > 1 ? 's' : ''} réglé${pronostics > 1 ? 's' : ''}` };
}

async function ajouterSignature() {
  const identite = document.querySelector('.profil-identite');
  if (!identite || identite.querySelector('.profil-v4-signature')) return;

  const donnees = await api.mesBadges().catch(() => null);
  if (!routeProfil() || !document.contains(identite)) return;
  const signature = signatureDepuisRecap(donnees?.recap ?? {});

  const bloc = document.createElement('div');
  bloc.className = `profil-v4-signature profil-v4-signature--${signature.cle}`;
  bloc.innerHTML = `
    <span>STYLE DE JEU</span>
    <strong>${signature.nom}</strong>
    <p>${signature.texte}</p>
    <small>${signature.detail}</small>`;

  const xp = identite.querySelector('.profil-xp');
  if (xp) xp.insertAdjacentElement('afterend', bloc);
  else identite.appendChild(bloc);
}

function nettoyerProfil() {
  if (!routeProfil()) return;
  const profil = document.querySelector('.profil-v2');
  if (!profil) return;

  profil.classList.add('profil-v4-active');

  // Daily login Frags belong to Economy V1. Economy V2 never grants ranking
  // points for attendance, so the old module is deliberately removed from UI.
  document.querySelectorAll('.profil-section--serie').forEach((section) => {
    section.classList.add('profile-v4-legacy-hidden');
    section.setAttribute('aria-hidden', 'true');
  });

  // The renderer places the two pronostic blocks directly after .profil-v2.
  const blocs = [];
  let suivant = profil.nextElementSibling;
  while (suivant && blocs.length < 2) {
    if (suivant.classList.contains('bloc')) blocs.push(suivant);
    suivant = suivant.nextElementSibling;
  }
  blocs.forEach(enrichirBlocHistorique);

  ajouterSignature();
}

function programmer() {
  clearTimeout(ETAT.timer);
  ETAT.timer = setTimeout(() => {
    if (!routeProfil()) return;
    let essais = 0;
    const attendre = () => {
      if (document.querySelector('.profil-v2')) {
        nettoyerProfil();
        return;
      }
      essais += 1;
      if (essais < 24) setTimeout(attendre, 70);
    };
    attendre();
  }, 35);
}

window.addEventListener('hashchange', programmer);
window.addEventListener('DOMContentLoaded', programmer);
programmer();
