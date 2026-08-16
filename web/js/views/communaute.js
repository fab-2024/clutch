/**
 * Clutch — Communauté V2.
 * Une faction = une équipe favorite + un réacteur communautaire.
 */

import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, nomJeu, vide, ecusson, teinteEquipe } from '../ui.js';
import { palierCommunaute, PALIERS_COMMUNAUTE, formaterFrags } from '../core.js';
import { bombonne } from './bombonne.js';

const FORMES = [
  { nom: 'Fiole', code: 'I', phrase: 'Le noyau vient de s’allumer.' },
  { nom: 'Flacon', code: 'II', phrase: 'L’élixir commence à tenir sa charge.' },
  { nom: 'Bombonne', code: 'III', phrase: 'La faction devient impossible à ignorer.' },
  { nom: 'Calice', code: 'IV', phrase: 'Le récipient devient un véritable artefact.' },
  { nom: 'Alambic', code: 'V', phrase: 'La charge se raffine au lieu de simplement grossir.' },
  { nom: 'Cornue', code: 'VI', phrase: 'Le réacteur devient instable — dans le bon sens.' },
  { nom: 'Océan', code: 'VII', phrase: 'Plus de récipient. La faction est devenue son propre environnement.' },
];

const forme = (p) => FORMES[Math.min(FORMES.length, Math.max(1, p?.niveau ?? 1)) - 1];
const pourcent = (p) => Math.max(0, Math.min(100, Math.round((p?.progression ?? 0) * 100)));

export async function vueCommunaute(racine) {
  const communautes = await api.classementCommunautes();

  if (!communautes.length) {
    racine.innerHTML = `
      ${entete([], null)}
      <div class="commu-v2">
        ${vide(
          'Les réacteurs sont encore éteints',
          'Choisis une équipe préférée : sa faction démarrera avec toi et son premier récipient commencera à se remplir.',
          contexte.utilisateur
            ? '<a class="btn" href="#/parametres">Choisir ma faction</a>'
            : '<a class="btn" href="#/connexion">Créer mon compte</a>'
        )}
      </div>`;
    return;
  }

  const mienne = communautes.find((c) => c.moi) ?? null;
  const vedette = mienne ?? communautes[0];
  const rang = communautes.indexOf(vedette) + 1;

  racine.innerHTML = `
    ${entete(communautes, mienne)}
    <div class="commu-v2">
      ${coeurFaction(vedette, rang, Boolean(mienne))}
      ${parcoursMutation(vedette)}
      ${classementFactions(communautes)}
      ${explication(mienne)}
    </div>`;

  verifierMutation(vedette);
}

function entete(communautes, mienne) {
  const membres = communautes.reduce((t, c) => t + Number(c.membres || 0), 0);
  return `
    <div class="commu-v2-entete">
      <div>
        <div class="sur-titre">Factions Clutch</div>
        <h1>Communautés</h1>
        <p>Choisis ton camp. Chaque supporter alimente le même réacteur et rapproche sa faction de la prochaine mutation.</p>
      </div>
      ${communautes.length ? `
        <div class="commu-v2-entete__signal">
          <span>${mienne ? 'Ta faction est connectée' : 'Réseau des factions'}</span>
          <strong>${esc(formaterFrags(membres))}</strong>
          <small>supporter${membres > 1 ? 's' : ''} relié${membres > 1 ? 's' : ''}</small>
        </div>` : ''}
    </div>`;
}

function coeurFaction(c, rang, estLaMienne) {
  const p = palierCommunaute(c.membres);
  const f = forme(p);
  const hue = teinteEquipe(c.tag, c.nom);
  const pct = pourcent(p);

  return `
    <section class="commu-core commu-core--epure" style="--team-hue:${hue};--charge:${Math.max(.08, p.progression)}">
      <div class="commu-core__grain" aria-hidden="true"></div>
      <div class="commu-core__flare" aria-hidden="true"></div>

      <div class="commu-core__identite">
        <div class="commu-core__eyebrow">
          <span>${estLaMienne ? 'MA FACTION' : 'FACTION EN VEDETTE'}</span>
        </div>
        <div class="commu-core__equipe">
          ${ecusson(c.tag, c.nom, 'm')}
          <div>
            <h2>${esc(c.nom)}</h2>
            <p>${esc(nomJeu(c.jeu))} · ${esc(c.tag)}</p>
          </div>
        </div>
        <p class="commu-core__resume">#${rang} · ${esc(formaterFrags(c.membres))} membre${c.membres > 1 ? 's' : ''} · Elo ${esc(c.elo)}</p>
        ${estLaMienne ? '<a class="commu-core__gerer" href="#/parametres">Gérer mon équipe →</a>' : ''}
      </div>

      <div class="commu-core__reacteur">
        ${reacteur(c, p, hue)}
      </div>

      <div class="commu-core__charge">
        <div class="commu-charge__haut">
          <span>Mutation ${esc(f.code)}</span>
          <strong>${p.max ? 'MAX' : `${pct} %`}</strong>
        </div>
        <h3>${esc(f.nom)}</h3>
        <p class="commu-charge__objectif">
          ${p.max
            ? 'Palier terminal atteint. Chaque nouveau supporter élargit désormais l’Océan.'
            : `<strong>${esc(formaterFrags(c.membres))}</strong> / ${esc(formaterFrags(p.objectif))} supporters`}
        </p>
        <div class="commu-charge__barre" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}">
          <i style="width:${p.max ? 100 : pct}%"></i>
          <span style="left:${p.max ? 100 : pct}%"></span>
        </div>
        <p class="commu-charge__reste">
          ${p.max
            ? 'Forme terminale atteinte.'
            : `Encore <strong>${esc(formaterFrags(p.restant))}</strong> supporter${p.restant > 1 ? 's' : ''} avant ${esc(f.nom)}.`}
        </p>
      </div>
    </section>`;
}

function parcoursMutation(c) {
  const p = palierCommunaute(c.membres);
  const hue = teinteEquipe(c.tag, c.nom);
  return `
    <section class="commu-evolution" style="--team-hue:${hue}">
      <div class="commu-evolution__haut">
        <div>
          <span>ÉVOLUTION DE LA FACTION</span>
          <strong>${esc(forme(p).phrase)}</strong>
        </div>
        <small>7 formes permanentes</small>
      </div>
      ${railMutation(c.membres, p)}
    </section>`;
}

function reacteur(c, p, hue, { compact = false } = {}) {
  const f = forme(p);
  const classeCharge = p.max || p.progression >= .75
    ? ' commu-reacteur--critique'
    : p.progression >= .4
      ? ' commu-reacteur--actif'
      : '';
  const pVisuel = { ...p, nom: f.nom };

  return `
    <div class="commu-reacteur commu-reacteur--n${p.niveau}${compact ? ' commu-reacteur--compact' : ''}${classeCharge}"
         style="--team-hue:${hue};--charge:${Math.max(.08, p.progression)}">
      <span class="commu-reacteur__halo" aria-hidden="true"></span>
      <span class="commu-reacteur__orbite commu-reacteur__orbite--a" aria-hidden="true"></span>
      <span class="commu-reacteur__orbite commu-reacteur__orbite--b" aria-hidden="true"></span>
      <span class="commu-reacteur__vapeur commu-reacteur__vapeur--a" aria-hidden="true"></span>
      <span class="commu-reacteur__vapeur commu-reacteur__vapeur--b" aria-hidden="true"></span>
      <span class="commu-reacteur__motes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
      ${bombonne(pVisuel, { teinte: hue })}
      <span class="commu-reacteur__socle" aria-hidden="true"><i></i></span>
      <span class="commu-reacteur__niveau">${esc(f.code)}</span>
    </div>`;
}

function railMutation(membres, p) {
  return `
    <ol class="commu-rail">
      ${PALIERS_COMMUNAUTE.map((palier, i) => {
        const f = FORMES[i];
        const franchi = membres >= palier.seuil;
        const courant = !p.max && p.niveau === i + 1;
        const terminal = p.max && i === PALIERS_COMMUNAUTE.length - 1;
        return `<li class="${franchi ? 'est-franchi ' : ''}${courant || terminal ? 'est-courant' : ''}">
          <span class="commu-rail__point"><i>${esc(f.code)}</i></span>
          <strong>${esc(f.nom)}</strong>
          <small>${esc(formaterFrags(palier.seuil))}</small>
        </li>`;
      }).join('')}
    </ol>`;
}

function classementFactions(communautes) {
  return `
    <section class="commu-classement">
      <div class="commu-classement__haut">
        <div>
          <div class="sur-titre">Guerre des factions</div>
          <h2>Qui charge le plus vite ?</h2>
        </div>
        <span>${communautes.length} faction${communautes.length > 1 ? 's' : ''} active${communautes.length > 1 ? 's' : ''}</span>
      </div>
      <div class="commu-factions">
        ${communautes.map((c, i) => carteFaction(c, i + 1)).join('')}
      </div>
    </section>`;
}

function carteFaction(c, rang) {
  const p = palierCommunaute(c.membres);
  const f = forme(p);
  const pct = pourcent(p);
  const hue = teinteEquipe(c.tag, c.nom);
  return `
    <article class="commu-faction${c.moi ? ' commu-faction--moi' : ''}" style="--team-hue:${hue}">
      <div class="commu-faction__rang"><span>#</span>${rang}</div>
      <div class="commu-faction__logo">${ecusson(c.tag, c.nom, 's')}</div>
      <div class="commu-faction__identite">
        <div><strong>${esc(c.nom)}</strong>${c.moi ? '<i>TA FACTION</i>' : ''}</div>
        <small>${esc(nomJeu(c.jeu))} · ${esc(f.nom)} ${esc(f.code)}</small>
      </div>
      <div class="commu-faction__progress">
        <div><span>${p.max ? 'MAX' : `${pct} %`}</span><small>${esc(formaterFrags(c.membres))} membre${c.membres > 1 ? 's' : ''}</small></div>
        <div class="commu-faction__barre"><i style="width:${p.max ? 100 : pct}%"></i></div>
      </div>
      <div class="commu-faction__elo"><small>ELO</small><strong>${esc(c.elo)}</strong></div>
    </article>`;
}

function explication(mienne) {
  return `
    <div class="commu-regle">
      <span class="commu-regle__icone">✦</span>
      <div>
        <strong>Une équipe. Une faction. Un réacteur.</strong>
        <p>Ton équipe favorite détermine ta communauté. Changer d’équipe déplace immédiatement ta présence vers son nouveau réacteur ; les paliers, eux, sont permanents.</p>
      </div>
      ${contexte.utilisateur
        ? `<a href="#/parametres">${mienne ? 'Gérer mon équipe' : 'Choisir ma faction'}</a>`
        : '<a href="#/connexion">Rejoindre Clutch</a>'}
    </div>`;
}

function verifierMutation(c) {
  if (!c?.moi || !contexte.utilisateur?.id) return;
  const p = palierCommunaute(c.membres);
  const cle = `clutch.community.stage.${contexte.utilisateur.id}.${c.id || c.tag}`;
  const precedent = Number(localStorage.getItem(cle) || 0);
  localStorage.setItem(cle, String(p.niveau));
  if (!precedent || p.niveau <= precedent) return;

  const hue = teinteEquipe(c.tag, c.nom);
  const f = forme(p);
  const overlay = document.createElement('div');
  overlay.className = 'commu-mutation';
  overlay.style.setProperty('--team-hue', hue);
  overlay.innerHTML = `
    <section class="commu-mutation__carte">
      <span class="commu-mutation__sur">MUTATION DE FACTION</span>
      <div class="commu-mutation__reacteur">${reacteur(c, p, hue)}</div>
      <span class="commu-mutation__niveau">FORME ${esc(f.code)}</span>
      <h2>${esc(f.nom)}</h2>
      <p>${esc(c.nom)} vient de franchir un nouveau palier communautaire.</p>
      <button class="btn" type="button">Voir le nouveau réacteur</button>
    </section>`;
  const fermer = () => overlay.remove();
  overlay.querySelector('button')?.addEventListener('click', fermer);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) fermer(); });
  document.body.appendChild(overlay);
}
