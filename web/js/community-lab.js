import { contexte } from './app.js';
import { formaterFrags } from './core.js';
import { esc } from './ui.js';
import { FORMES_COMMUNAUTE, teinteFaction, palierFaction, formeCommunaute } from './community-progression.js';
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

function reacteurDebug(p, hue) {
  const f = formeCommunaute(p.niveau);
  return `
    <div class="commu-reacteur commu-reacteur--compact commu-reacteur--n${p.niveau}"
         style="--team-hue:${hue};--charge:${Math.max(.08, p.progression)}">
      <span class="commu-reacteur__halo" aria-hidden="true"></span>
      <span class="commu-reacteur__orbite commu-reacteur__orbite--a" aria-hidden="true"></span>
      <span class="commu-reacteur__orbite commu-reacteur__orbite--b" aria-hidden="true"></span>
      ${bombonne({ ...p, nom: f.nom }, { teinte: hue, bulles: true })}
      <span class="commu-reacteur__socle" aria-hidden="true"><i></i></span>
      <span class="commu-reacteur__niveau">${f.code}</span>
    </div>`;
}

function simulerMutation(niveau, hue, equipe) {
  const n = Math.max(2, Math.min(7, Number(niveau) || 2));
  const forme = formeCommunaute(n);
  const precedent = palierFaction(forme.seuil, n - 1);
  precedent.progression = .96;
  const nouveau = palierFaction(forme.seuil, n);
  nouveau.progression = .08;
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const overlay = document.createElement('div');
  overlay.className = `commu-mutation-v3 commu-mutation-v3--debug${reduit ? ' est-reduite' : ''}`;
  overlay.style.setProperty('--team-hue', hue);
  overlay.innerHTML = `
    <div class="commu-mutation-v3__flash" aria-hidden="true"></div>
    <section class="commu-mutation-v3__carte" role="dialog" aria-modal="true" aria-label="Simulation de mutation">
      <span class="commu-mutation-v3__sur">SIMULATION FONDATEUR</span>
      <div class="commu-mutation-v3__scene">
        <div class="commu-mutation-v3__ancien">${reacteurDebug(precedent, hue)}</div>
        <div class="commu-mutation-v3__nouveau">${reacteurDebug(nouveau, hue)}</div>
      </div>
      <span class="commu-mutation-v3__niveau">FORME ${esc(forme.code)}</span>
      <h2>${esc(forme.nom)}</h2>
      <p>${esc(equipe?.nom || 'Clutch')} franchit ${esc(formaterFrags(forme.seuil))} supporters.</p>
      <div class="commu-mutation-v3__gain">+${esc(formaterFrags(forme.recompense))} Frags <small>simulation — aucun solde modifié</small></div>
      <button class="btn" type="button">Fermer la simulation</button>
    </section>`;

  const fermer = () => {
    overlay.classList.add('est-fermee');
    setTimeout(() => overlay.remove(), reduit ? 0 : 260);
  };
  overlay.querySelector('button')?.addEventListener('click', fermer);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fermer(); });
  document.body.appendChild(overlay);

  if (reduit) {
    overlay.classList.add('phase-reveal');
    return;
  }
  requestAnimationFrame(() => overlay.classList.add('phase-charge'));
  setTimeout(() => overlay.classList.add('phase-surcharge'), 720);
  setTimeout(() => overlay.classList.add('phase-flash'), 1320);
  setTimeout(() => overlay.classList.add('phase-reveal'), 1510);
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
      <div class="commu-lab-debug__test">
        <label>
          <span>Tester une mutation plein écran</span>
          <select data-mutation-level>
            ${FORMES_COMMUNAUTE.slice(1).map((f) => `<option value="${f.niveau}">${f.code} · ${f.nom}</option>`).join('')}
          </select>
        </label>
        <button class="btn btn--fantome" type="button" data-test-mutation>Simuler la mutation</button>
      </div>
      <div class="commu-lab__grille">
        ${FORMES_COMMUNAUTE.map((f) => carte(f, hue)).join('')}
      </div>`;

    contenu.querySelector('[data-test-mutation]')?.addEventListener('click', () => {
      const niveau = contenu.querySelector('[data-mutation-level]')?.value ?? 2;
      simulerMutation(niveau, hue, equipe);
    });
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
