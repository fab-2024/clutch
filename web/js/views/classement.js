import * as api from '../api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, frags, dateLisible, vide, surClic } from '../ui.js';
import { MODES_CLASSEMENT, trierClassement, CLASSEMENT_MIN_PARIS, NOTE_MIN_PARIS } from '../core.js';

let modeActif = 'solde';

export async function vueClassement(racine) {
  const [lignes, palmares, rivalite] = await Promise.all([
    api.classementGlobal(),
    api.palmares(),
    contexte.utilisateur ? api.rivaliteSemaine().catch(() => null) : null,
  ]);

  racine.innerHTML = `
    <div class="entete-page">
      <div>
        <h1>Classement</h1>
        <p>${esc(contexte.saison?.nom ?? '')} — chaque saison repart de zéro pour tout le monde.</p>
      </div>
    </div>
    ${bandeauSaison()}
    ${carteRivalite(rivalite)}
    <div class="filtres" id="filtres-mode"></div>
    <p id="aide-mode" style="color:var(--texte-faible);font-size:0.85rem;margin-top:-8px"></p>
    <div class="carte" id="zone-classement"></div>

    ${
      palmares.length
        ? `<h2 style="margin-top:30px">Palmarès</h2>
           <div class="carte">
             <table class="tableau">
               <tbody>
                 ${palmares
                   .map(
                     (p) => `<tr>
                       <td>${esc(p.saison.nom)}
                         <div style="font-size:0.75rem;color:var(--texte-faible)">
                           close le ${esc(dateLisible(p.saison.fin))}
                         </div>
                       </td>
                       <td><strong>${esc(p.vainqueur?.pseudo ?? '—')}</strong></td>
                       <td class="num">${p.vainqueur ? esc(frags(p.vainqueur.solde)) : ''}</td>
                     </tr>`
                   )
                   .join('')}
               </tbody>
             </table>
           </div>`
        : ''
    }`;

  const dessiner = () => {
    racine.querySelector('#filtres-mode').innerHTML = MODES_CLASSEMENT.map(
      (m) => `<button class="puce${m.cle === modeActif ? ' actif' : ''}" data-mode="${m.cle}">${m.libelle}</button>`
    ).join('');
    racine.querySelector('#aide-mode').textContent =
      MODES_CLASSEMENT.find((m) => m.cle === modeActif)?.aide ?? '';

    const triees = trierClassement(lignes, modeActif);
    racine.querySelector('#zone-classement').innerHTML = triees.length
      ? tableauClassement(triees, modeActif)
      : vide(
          'Personne à afficher',
          modeActif === 'roi'
            ? `Il faut au moins ${CLASSEMENT_MIN_PARIS} paris réglés pour figurer dans ce classement.`
            : modeActif === 'note'
              ? `Il faut au moins ${NOTE_MIN_PARIS} paris réglés pour qu'une note veuille dire quelque chose.`
              : 'Sois le premier.'
        );
  };

  dessiner();
  surClic(racine, '[data-mode]', (btn) => {
    modeActif = btn.dataset.mode;
    dessiner();
  });
}

/**
 * La rivalité de la semaine.
 *
 * Le rival est choisi parmi les joueurs les plus proches au classement, de
 * façon déterministe à partir de la semaine ISO : il ne bouge pas d'une page à
 * l'autre, et change tout seul chaque lundi. Aucune donnée nouvelle n'est
 * stockée — c'est ce qui rend cette fonctionnalité aussi peu chère.
 */
export function carteRivalite(r) {
  if (!r?.rival) return '';
  const devant = r.ecart >= 0;
  const bilan = (b) =>
    `${b.paris} pari${b.paris > 1 ? 's' : ''} · <span class="${b.net >= 0 ? 'positif' : 'negatif'}">${
      b.net >= 0 ? '+' : ''
    }${esc(frags(b.net))}</span>`;

  return `
    <div class="carte carte--rivalite">
      <div class="carte-call-pose__haut">
        <strong>Ta rivalité de la semaine</strong>
        <span class="badge">${esc(r.semaine)}</span>
      </div>
      <div class="duel">
        <div class="duel__cote">
          <span class="duel__nom">${esc(r.moi.pseudo)}</span>
          <span class="duel__rang">${r.moi.rang}<sup>e</sup></span>
          <span class="duel__bilan">${bilan(r.moi.bilan)}</span>
        </div>
        <div class="duel__milieu">
          <span class="duel__vs">VS</span>
          <span class="duel__ecart ${devant ? 'positif' : 'negatif'}">
            ${devant ? '+' : ''}${esc(frags(r.ecart))}
          </span>
        </div>
        <div class="duel__cote duel__cote--droite">
          <span class="duel__nom">${esc(r.rival.pseudo)}</span>
          <span class="duel__rang">${r.rival.rang}<sup>e</sup></span>
          <span class="duel__bilan">${bilan(r.rival.bilan)}</span>
        </div>
      </div>
      <p style="color:var(--texte-faible);font-size:0.78rem;margin:14px 0 0;text-align:center">
        ${
          devant
            ? `Tu mènes de ${esc(frags(Math.abs(r.ecart)))}. Il ne te reste qu'à ne pas te rater.`
            : `Il te devance de ${esc(frags(Math.abs(r.ecart)))}. Nouveau tirage lundi.`
        }
      </p>
    </div>`;
}

/**
 * Rendu partagé entre le classement global et celui d'une ligue.
 *
 * La colonne de droite change avec le mode : c'est elle qui porte le tri, et
 * afficher les trois mesures en même temps rendrait le tableau illisible sur
 * un téléphone.
 */
export function tableauClassement(lignes, mode = 'solde') {
  const colonne = { solde: 'Solde', roi: 'Retour', note: 'Note' }[mode] ?? 'Solde';
  return `
    <table class="tableau">
      <thead>
        <tr>
          <th class="rang">#</th>
          <th>Joueur</th>
          <th class="num">Paris</th>
          <th class="num">Réussite</th>
          <th class="num">${colonne}</th>
        </tr>
      </thead>
      <tbody>
        ${lignes
          .map((l, i) => {
            const reussite = l.paris ? Math.round((l.gagnes / l.paris) * 100) : null;
            return `<tr${l.moi ? ' class="moi"' : ''}>
              <td class="rang rang--${i + 1}">${i + 1}</td>
              <td>
                ${esc(l.pseudo)}${l.moi ? ' <span class="badge">toi</span>' : ''}
                ${l.tag_favori ? ` <span class="badge badge--equipe" title="${esc(l.equipe_favorite ?? '')}">${esc(l.tag_favori)}</span>` : ''}
              </td>
              <td class="num">${mode === 'note' ? (l.note_paris ?? 0) : (l.paris ?? 0)}</td>
              <td class="num">${reussite === null ? '—' : reussite + ' %'}</td>
              <td class="num">${valeurMode(l, mode)}</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>`;
}

/** La valeur mise en avant, selon le classement consulté. */
function valeurMode(l, mode) {
  if (mode === 'roi') {
    const r = Number(l.roi ?? 0);
    return `<strong class="${r >= 0 ? 'positif' : 'negatif'}">${r >= 0 ? '+' : ''}${r.toFixed(1)} %</strong>`;
  }
  if (mode === 'note') return `<strong>${Math.round(l.note ?? 0)}</strong>`;
  return `<strong>${esc(frags(l.solde))}</strong>`;
}
