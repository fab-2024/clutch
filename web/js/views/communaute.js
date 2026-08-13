/**
 * Les communautés.
 *
 * Une communauté, c'est tous les joueurs qui ont choisi la même équipe
 * préférée. Sa jauge se remplit avec les inscriptions : quelqu'un met Karmine
 * en favorite, la bombonne de Karmine monte d'un cran.
 *
 * L'écran a deux étages. En haut, une seule communauté en grand — la tienne si
 * tu en as une, sinon celle qui mène. En bas, le classement complet. Montrer
 * trente jauges de la même taille n'aurait donné envie de rien : c'est la
 * comparaison entre « la mienne » et « la première » qui fait revenir.
 */

import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, nomJeu, rangEcrit, vide } from '../ui.js';
import { palierCommunaute, PALIERS_COMMUNAUTE } from '../core.js';

export async function vueCommunaute(racine) {
  const communautes = await api.classementCommunautes();

  if (!communautes.length) {
    racine.innerHTML = `
      ${entete()}
      ${vide(
        'Aucune communauté pour l’instant',
        'Personne n’a encore choisi d’équipe préférée. Sois le premier : la bombonne de ton équipe démarre à toi.',
        contexte.utilisateur
          ? '<a class="btn" href="#/parametres">Choisir mon équipe</a>'
          : '<a class="btn" href="#/connexion">Créer mon compte</a>'
      )}`;
    return;
  }

  const mienne = communautes.find((c) => c.moi) ?? null;
  const vedette = mienne ?? communautes[0];
  const rang = communautes.indexOf(vedette) + 1;

  racine.innerHTML = `
    ${entete()}
    ${carteVedette(vedette, rang, Boolean(mienne))}

    <div class="bloc">
      <div class="bloc__titre">
        <span>Les plus grosses communautés</span>
        <span>${communautes.length} équipe${communautes.length > 1 ? 's' : ''} suivie${communautes.length > 1 ? 's' : ''}</span>
      </div>
      <div class="bloc__corps">
        ${communautes.map((c, i) => ligne(c, i + 1)).join('')}
      </div>
    </div>

    <div class="encart">
      <strong>Comment ça marche.</strong> Chaque joueur qui désigne une équipe
      préférée rejoint sa communauté, et une seule à la fois. Les paliers se
      suivent — ${PALIERS_COMMUNAUTE.map((p) => `${esc(p.nom)} à ${p.seuil}`).join(', ')} —
      et changer d’équipe déplace ta voix d’une bombonne à l’autre.
      ${
        contexte.utilisateur && !mienne
          ? ' Tu n’as pas encore d’équipe : <a href="#/parametres">choisis-en une</a>.'
          : ''
      }
    </div>`;
}

function entete() {
  return `
    <div class="entete-page">
      <h1>Communautés</h1>
      <p>Chaque équipe a sa bombonne d’élixir. Elle se remplit d’un cran à chaque
         joueur qui la choisit comme équipe préférée.</p>
    </div>`;
}

/** La communauté mise en avant, avec sa bombonne en grand. */
function carteVedette(c, rang, estLaMienne) {
  const p = palierCommunaute(c.membres);
  return `
    <div class="bloc bloc--volt">
      <div class="bloc__titre">
        <span>${estLaMienne ? 'Ma communauté' : 'La communauté qui mène'}</span>
        <span>${esc(nomJeu(c.jeu))} · ${rangEcrit(rang)} sur le classement</span>
      </div>
      <div class="bloc__corps">
        <div class="commu-vedette">
          ${bombonne(p)}
          <div>
            <h2 style="margin-bottom:6px">${esc(c.nom)}
              <span class="badge badge--equipe">${esc(c.tag)}</span>
            </h2>
            <p style="color:var(--texte-doux);margin-bottom:14px">
              ${
                p.max
                  ? `Palier maximum atteint : <strong style="color:var(--accent)">${esc(p.nom)}</strong>.
                     Plus rien au-dessus, il ne reste qu'à creuser l'écart.`
                  : `Palier <strong style="color:var(--accent)">${esc(p.nom)}</strong> —
                     encore ${p.restant} membre${p.restant > 1 ? 's' : ''} avant de le franchir.`
              }
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <span class="badge">${c.membres} membre${c.membres > 1 ? 's' : ''}</span>
              <span class="badge">Elo ${c.elo}</span>
              ${estLaMienne ? '<span class="badge badge--gagne">tu en fais partie</span>' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

/**
 * L'anneau qui se remplit.
 *
 * Un cercle SVG dont on ne dessine qu'une portion, en jouant sur le tiret :
 * `stroke-dasharray` vaut la circonférence entière, `stroke-dashoffset` la
 * portion qu'on efface. Aucune image, aucune dépendance, et ça s'anime tout
 * seul quand la valeur change.
 */
function bombonne(p) {
  const R = 70;
  const circonference = 2 * Math.PI * R;
  const reste = circonference * (1 - Math.min(1, Math.max(0, p.progression)));
  return `
    <div class="bombonne" role="img"
         aria-label="${p.membres} membres, palier ${esc(p.nom)} à ${p.objectif}">
      <svg viewBox="0 0 168 168">
        <circle class="bombonne__piste" cx="84" cy="84" r="${R}" />
        <circle class="bombonne__jus" cx="84" cy="84" r="${R}"
                stroke-dasharray="${circonference.toFixed(1)}"
                stroke-dashoffset="${reste.toFixed(1)}" />
      </svg>
      <div class="bombonne__centre">
        <span class="bombonne__valeur">${p.membres}</span>
        <span class="bombonne__sur">${p.max ? 'au maximum' : `sur ${p.objectif}`}</span>
        <span class="bombonne__palier">${esc(p.nom)}</span>
      </div>
    </div>`;
}

/** Une ligne du classement des communautés. */
function ligne(c, rang) {
  const p = palierCommunaute(c.membres);
  const pourcent = Math.round(p.progression * 100);
  return `
    <div class="commu-ligne${c.moi ? ' commu-ligne--moi' : ''}">
      <span class="rang rang--${rang}">${rang}</span>
      <div>
        <span class="commu-ligne__nom">${esc(c.nom)}</span>
        <span class="badge" style="margin-left:6px">${esc(nomJeu(c.jeu))}</span>
        ${c.moi ? '<span class="badge badge--equipe" style="margin-left:4px">la mienne</span>' : ''}
        <div class="jauge commu-ligne__jauge">
          <div class="jauge__remplie" style="width:${pourcent}%"></div>
        </div>
      </div>
      <div class="commu-ligne__droite">
        <div class="commu-ligne__membres">${c.membres}</div>
        <div class="commu-ligne__palier">${esc(p.nom)}${p.max ? '' : ` · ${pourcent} %`}</div>
      </div>
    </div>`;
}
