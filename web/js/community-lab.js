import { contexte } from './app.js';
import { PALIERS_COMMUNAUTE, formaterFrags } from './core.js';
import { teinteEquipe } from './ui.js';
import { bombonne } from './views/bombonne.js';

const FORMES = [
  { nom: 'Fiole', code: 'I' },
  { nom: 'Flacon', code: 'II' },
  { nom: 'Bombonne', code: 'III' },
  { nom: 'Calice', code: 'IV' },
  { nom: 'Alambic', code: 'V' },
  { nom: 'Cornue', code: 'VI' },
  { nom: 'Océan', code: 'VII' },
];

function route() {
  return location.hash.replace(/^#/, '') || '/matchs';
}

function apercuPalier(index) {
  const courant = PALIERS_COMMUNAUTE[index];
  const precedent = index === 0 ? 0 : PALIERS_COMMUNAUTE[index - 1].seuil;
  const progression = index === FORMES.length - 1 ? 0.72 : 0.65;
  const membres = Math.round(precedent + (courant.seuil - precedent) * progression);
  return {
    membres,
    niveau: index + 1,
    nom: FORMES[index].nom,
    plancher: precedent,
    objectif: courant.seuil,
    progression,
    restant: Math.max(0, courant.seuil - membres),
    max: false,
  };
}

function carte(forme, index, hue) {
  const p = apercuPalier(index);
  return `
    <article class="commu-lab__forme commu-lab__forme--n${index + 1}">
      <div class="commu-lab__code">${forme.code}</div>
      <div class="commu-lab__objet">
        ${bombonne(p, { teinte: hue, bulles: true })}
      </div>
      <strong>${forme.nom}</strong>
      <small>${formaterFrags(PALIERS_COMMUNAUTE[index].seuil)} supporters</small>
    </article>`;
}

function injecter() {
  if (route() !== '/communaute') return false;
  const u = contexte.utilisateur;
  if (!u?.est_fondateur) return false;
  if (document.querySelector('.commu-lab')) return true;

  const ancre = document.querySelector('.commu-evolution');
  if (!ancre) return false;

  const equipe = u.equipe_favorite;
  const hue = teinteEquipe(equipe?.tag || 'CLT', equipe?.nom || 'Clutch');
  const section = document.createElement('section');
  section.className = 'commu-lab';
  section.style.setProperty('--team-hue', hue);
  section.innerHTML = `
    <div class="commu-lab__haut">
      <div>
        <span>LABORATOIRE FONDATEUR</span>
        <h2>Les 7 récipients</h2>
      </div>
      <p>Aperçu comparatif · remplissage simulé · aucune donnée de faction modifiée.</p>
    </div>
    <div class="commu-lab__grille">
      ${FORMES.map((f, i) => carte(f, i, hue)).join('')}
    </div>`;
  ancre.insertAdjacentElement('afterend', section);
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
