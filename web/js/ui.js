/** Petits utilitaires d'interface partagés par toutes les vues. */

import { MONNAIE } from './config.js';
import { JEUX, formaterFrags } from './core.js';

/** Échappe une chaîne avant injection dans du HTML. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

/** Template tag qui échappe automatiquement les interpolations. */
export function html(morceaux, ...valeurs) {
  return morceaux.reduce((acc, m, i) => {
    const v = valeurs[i - 1];
    const rendu = v === undefined || v === null ? '' : (v.__brut ? v.valeur : esc(v));
    return acc + rendu + m;
  });
}

/** Marque une chaîne comme déjà sûre (HTML pré-construit). */
export const brut = (valeur) => ({ __brut: true, valeur });

export const frags = (n) => `${formaterFrags(n)} ${MONNAIE}`;

export const nomJeu = (id) => JEUX[id]?.court ?? id;

/** 1 → « 1er », 2 → « 2e ». Écrit en toutes lettres : un <sup> disparaît
    dans un bandeau en capitales, où « 1e » se lit « 1E ». */
export const rangEcrit = (n) => (Number(n) === 1 ? '1er' : `${n}e`);

/** "dans 2 h 15", "il y a 3 j", "maintenant" */
export function quand(iso) {
  const delta = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(delta);
  const min = Math.round(abs / 60000);
  const futur = delta > 0;
  let texte;
  if (min < 1) texte = "à l'instant";
  else if (min < 60) texte = `${min} min`;
  else if (min < 60 * 24) {
    const h = Math.floor(min / 60);
    const r = min % 60;
    texte = r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`;
  } else texte = `${Math.floor(min / 1440)} j`;
  if (min < 1) return texte;
  return futur ? `dans ${texte}` : `il y a ${texte}`;
}

/** "sam. 15 août, 18:00" */
export function dateLisible(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function toast(message, type = 'info') {
  const zone = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = message;
  zone.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 250ms';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 250);
  }, 3600);
}

export function vide(titre, texte, action = '') {
  return `<div class="vide"><h3>${esc(titre)}</h3><p>${esc(texte)}</p>${action}</div>`;
}

/** Barre de répartition des probabilités entre deux issues. */
export function barreProba(pA, couleurA = 'var(--accent)', couleurB = 'var(--bordure-vive)') {
  const a = Math.round(pA * 100);
  return `<div class="barre-proba" role="img" aria-label="${a} % contre ${100 - a} %">
    <div class="barre-proba__part" style="width:${a}%;background:${couleurA}"></div>
    <div class="barre-proba__part" style="width:${100 - a}%;background:${couleurB}"></div>
  </div>`;
}

/** Délègue un clic sur un sélecteur, dans un conteneur donné. */
export function surClic(racine, selecteur, gestionnaire) {
  racine.addEventListener('click', (e) => {
    const cible = e.target.closest(selecteur);
    if (cible && racine.contains(cible)) gestionnaire(cible, e);
  });
}
