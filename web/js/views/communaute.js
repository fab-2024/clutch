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
import { esc, nomJeu, vide, ecusson, teinteEquipe } from '../ui.js';
import { palierCommunaute, PALIERS_COMMUNAUTE, formaterFrags } from '../core.js';
import { bombonne } from './bombonne.js';

export async function vueCommunaute(racine) {
  const communautes = await api.classementCommunautes();

  if (!communautes.length) {
    racine.innerHTML = `
      ${entete()}
      ${vide(
        'Toutes les bombonnes sont vides',
        'Personne n’a encore choisi d’équipe préférée — celle que tu prendras démarrera donc à toi, et tu en seras le membre fondateur.',
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
    <div class="bloc commu-vedette-bloc">
      <div class="bloc__titre">
        <span>${estLaMienne ? 'Ma communauté' : 'La communauté qui mène'}</span>
      </div>
      <div class="bloc__corps">
        <div class="commu-vedette">
          <div class="bombonne-bloc">
            ${bombonne(p, { teinte: teinteEquipe(c.tag, c.nom) })}
            <div class="bombonne-bloc__compte">
              ${esc(formaterFrags(p.membres))}${p.max ? '' : `<small> / ${esc(formaterFrags(p.objectif))}</small>`}
            </div>
            <div class="bombonne-bloc__palier">${esc(p.nom)}</div>
          </div>
          <div class="commu-vedette__txt">
            <h2 style="margin-bottom:2px">${esc(c.nom)}</h2>
            <div class="commu-jeu">${esc(nomJeu(c.jeu))} · n°${rang} des communautés</div>
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
            </div>
          </div>
          ${echelle(p)}
        </div>
      </div>
    </div>`;
}

/**
 * L'echelle des sept paliers.
 *
 * C'est ce qui manquait le plus : on voyait un remplissage sans savoir vers
 * quoi. Les paliers franchis sont allumes, le palier courant est marque, les
 * suivants restent visibles et eteints — meme regle que les badges, ce qu'on
 * ne voit pas ne donne envie de rien.
 */
function echelle(p) {
  return `
    <ol class="echelle">
      ${PALIERS_COMMUNAUTE.map((pal, i) => {
        const franchi = p.membres >= pal.seuil;
        const courant = !franchi && (i === 0 || p.membres >= PALIERS_COMMUNAUTE[i - 1].seuil);
        return `<li class="echelle__cran${franchi ? ' echelle__cran--franchi' : ''}${courant ? ' echelle__cran--courant' : ''}">
          <span class="echelle__pt"></span>
          <span class="echelle__nom">${esc(pal.nom)}</span>
          <span class="echelle__seuil">${esc(formaterFrags(pal.seuil))}</span>
        </li>`;
      }).join('')}
    </ol>`;
}

/** Une ligne du classement des communautés. */
function ligne(c, rang) {
  const p = palierCommunaute(c.membres);
  const pourcent = Math.round(p.progression * 100);
  return `
    <div class="commu-ligne${c.moi ? ' commu-ligne--moi' : ''}">
      <span class="rang rang--${rang}">${rang}</span>
      ${ecusson(c.tag, c.nom, 's')}
      <div>
        <span class="commu-ligne__nom">${esc(c.nom)}</span>
        <span class="commu-ligne__jeu">${esc(nomJeu(c.jeu))}</span>
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
