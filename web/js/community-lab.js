import { contexte } from './app.js';
import { formaterFrags } from './core.js';
import { FORMES_COMMUNAUTE, teinteFaction, palierFaction } from './community-progression.js';
import { bombonne } from './views/bombonne.js';

function route() {
  return location.hash.replace(/^#/, '') || '/matchs';
}

function apercuPalier(forme) {
  const suivante = FORMES_COMMUNAUTE[forme.niveau] ?? null;
  const objectif = suivante?.seuil ?? 10000;
  const membres = Math.round(forme.seuil + (objectif - forme.seuil) * .62);
  const p = palierFaction(membres, forme.niveau);
  p.niveau = forme.niveau;
  p.nom = forme.nom;
  return p;
}

function carte(forme, hue) {
  const p = apercuPalier(forme);
  return `
    <article class="commu-lab__forme commu-lab__forme--n${forme.niveau}">
      <div class="commu-lab__code">${forme.code}</div>
      <div class="commu-lab__objet">
        ${bombonne(p, { teinte: hue, bulles: true })}
      </div>
      <strong>${forme.nom}</strong>
      <small>${forme.niveau === 1 ? 'forme de départ' : `${formaterFrags(forme.seuil)} supporters`}</small>
    </article>`;
}

function injecter() {
  if (route() !== '/communaute') return false;
  const u = contexte.utilisateur;
  if (!u?.est_fondateur) return false;
  if (document.querySelector('.commu-lab-debug')) return true;

  const ancre = document.querySelector('.commu-regle');
  if (!ancre) return false;

  const equipe = u.equipe_favorite;
  const hue = teinteFaction(equipe?.tag || 'CLT', equipe?.nom || 'Clutch');
  const details = document.createElement('details');
  details.className = 'commu-lab-debug';
  details.style.setProperty('--team-hue', hue);
  details.innerHTML = `
    <summary>
      <span>OUTIL FONDATEUR</span>
      <strong>Laboratoire des 7 reliques</strong>
      <small>debug visuel · chargé uniquement à l'ouverture</small>
    </summary>
    <div class="commu-lab-debug__contenu" data-lab-content></div>`;

  let charge = false;
  details.addEventListener('toggle', () => {
    if (!details.open || charge) return;
    charge = true;
    const contenu = details.querySelector('[data-lab-content]');
    contenu.innerHTML = `
      <div class="commu-lab__haut">
        <div><span>LABORATOIRE FONDATEUR</span><h2>Les 7 récipients</h2></div>
        <p>Aperçu comparatif · remplissage simulé · aucune donnée de faction modifiée.</p>
      </div>
      <div class="commu-lab__grille">
        ${FORMES_COMMUNAUTE.map((f) => carte(f, hue)).join('')}
      </div>`;
  });

  ancre.insertAdjacentElement('afterend', details);
  return true;
}

let generation = 0;
function programmer() {
  const maGeneration = ++generation;
  let tentative = 0;

  const essayer = () => {
    if (maGeneration !== generation || route() !== '/communaute') return;
    tentative += 1;
    if (injecter()) return;
    if (tentative < 50) setTimeout(essayer, 100);
  };

  setTimeout(essayer, 30);
}

window.addEventListener('hashchange', programmer);
window.addEventListener('DOMContentLoaded', programmer);
programmer();
