/** Petits utilitaires d'interface partagés par toutes les vues. */

import { MONNAIE, MONNAIE_VOLTS } from './config.js';
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

/** Les Volts, la monnaie cosmétique. On ne les mise jamais : on les dépense. */
export const volts = (n) => `${formaterFrags(n)} ${MONNAIE_VOLTS}`;

/**
 * Le jeton de Frag : un crâne dans une mire.
 *
 * « Frag » est le terme FPS pour une élimination. Le crâne le dit ; les quatre
 * crans autour disent la visée. Le réticule seul, qui était là avant, ne disait
 * que la seconde moitié du mot.
 *
 * Tracé à plat, frontal, en deux couleurs, et en SVG plutôt que chargé en
 * image : il suit la couleur d'accent — la changer un jour suffit —, reste net
 * à toutes les tailles, et ne coûte aucune requête. Un rendu en perspective
 * avec sa lumière cuite dedans deviendrait une tache à 18 px, la taille à
 * laquelle il vit réellement dans l'en-tête.
 */
export function jeton(taille = 18) {
  return `<svg class="jeton" width="${taille}" height="${taille}" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="var(--accent)" />
    <g stroke="var(--sur-accent)" stroke-width="1.6" stroke-linecap="round">
      <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2" />
    </g>
    <path d="M12 5.1c-3.15 0-5.45 2.15-5.45 5.05 0 1.72.82 2.98 1.85 3.7v1.5c0 .62.5 1.12 1.12 1.12h4.96c.62 0 1.12-.5 1.12-1.12v-1.5c1.03-.72 1.85-1.98 1.85-3.7 0-2.9-2.3-5.05-5.45-5.05z"
          fill="var(--sur-accent)" />
    <circle cx="9.75" cy="10.5" r="1.62" fill="var(--accent)" />
    <circle cx="14.25" cy="10.5" r="1.62" fill="var(--accent)" />
    <path d="M12 12.5l-.85 1.5h1.7z" fill="var(--accent)" />
    <path d="M10.4 15.4v1.6M12 15.4v1.6M13.6 15.4v1.6"
          stroke="var(--accent)" stroke-width="1" stroke-linecap="round" />
  </svg>`;
}

export function jetonVolt(taille = 18) {
  return `<svg class="jeton" width="${taille}" height="${taille}" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="var(--accent)" />
    <g fill="none" stroke="var(--sur-accent)" stroke-width="1.7" stroke-linecap="round">
      <path d="M7.7 7.4a6.5 6.5 0 0 0-.1 9.2M16.3 16.6a6.5 6.5 0 0 0 .1-9.2" />
    </g>
    <path d="M13.9 3.6 7.9 12.9h3.4l-1.2 7.5 6.2-9.5h-3.5z" fill="var(--sur-accent)" />
  </svg>`;
}

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

/* ------------------------------------------------------------------ */
/* Les écussons d'équipe                                               */
/* ------------------------------------------------------------------ */

/**
 * Il n'existe aucun logo d'équipe dans ce produit, et il n'en existera
 * pas : ce sont des marques déposées, et il faudrait de toute façon un
 * fichier par équipe. L'écusson les remplace — forme découpée, teinte
 * propre à l'équipe, monogramme au centre. C'est la solution de Football
 * Manager et de Sorare pour les clubs non licenciés.
 *
 * On ne retient de la couleur réelle d'une équipe que sa TEINTE. La
 * clarté et la saturation sont fixes pour tout le monde (oklch 0,62 /
 * 0,16), et c'est ce qui fait tenir l'ensemble :
 *
 *   · les écussons se distinguent mais forment une famille ;
 *   · le monogramme blanc garde le même contraste sur chacun ;
 *   · aucune équipe ne peut tomber sur le jaune d'accent, qui doit rester
 *     réservé à l'action. Le jaune de Vitality devient un olivâtre, pas
 *     un bouton.
 *
 * Une équipe absente de la table reçoit une teinte dérivée de son nom :
 * stable d'un écran à l'autre, et jamais deux fois la même par hasard.
 */
const TEINTES_EQUIPE = {
  KC: 250, G2: 25, FNC: 45, MKOI: 300, VIT: 100, BDS: 340, TH: 15,
  SK: 205, GX: 150, RGE: 130, NAVI: 60, SPR: 215, FAZE: 8, MOUZ: 0,
  FLC: 160, AST: 355, SEN: 350, DRX: 230, FUT: 195, M8: 190, SLY: 165,
  T1: 10, TL: 235,
};

function teinteEquipe(tag, nom) {
  const connue = TEINTES_EQUIPE[String(tag).toUpperCase()];
  if (connue != null) return connue;
  let h = 0;
  for (const c of String(nom ?? tag)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 360;
}

/** L'écusson d'une équipe : un monogramme dans une forme à six pans. */
export function ecusson(tag, nom, taille = 'm') {
  const t = teinteEquipe(tag, nom);
  const couleur = `oklch(0.62 0.16 ${t})`;
  const liseré = `oklch(0.78 0.11 ${t})`;
  return `<span class="ecusson-cadre ecusson-cadre--${esc(taille)}" style="--liseré:${liseré}">
    <span class="ecusson" style="--teinte:${couleur}">${esc(tag)}</span>
  </span>`;
}
