import * as api from '../api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, frags, nomJeu, toast, surClic } from '../ui.js';
import { tableauClassement, carteRivalite } from './classement.js';

export async function vueLigue(racine, id) {
  const ligue = await api.lireLigue(id);
  if (!ligue) {
    racine.innerHTML = `<div class="vide"><h3>Ligue introuvable</h3><p><a href="#/ligues">Retour</a></p></div>`;
    return;
  }
  const [classement, rivalite, defi] = await Promise.all([
    api.classementLigue(id),
    contexte.utilisateur ? api.rivaliteSemaine({ ligue: id }).catch(() => null) : null,
    api.defiLigue(id).catch(() => null),
  ]);
  const classementDefi = defi ? await api.classementDefi(id).catch(() => []) : [];
  const estCreateur = contexte.utilisateur?.id === ligue.createur_id;

  racine.innerHTML = `
    <p><a href="#/ligues">← Mes ligues</a></p>
    <div class="entete-page">
      <div>
        <h1>${esc(ligue.nom)}</h1>
        <p>${classement.length} membre${classement.length > 1 ? 's' : ''} · ${esc(contexte.saison?.nom ?? '')}</p>
      </div>
    </div>
    ${bandeauSaison()}

    <div class="grille grille--2" style="margin-bottom:22px">
      <div class="carte">
        <h3 style="margin-bottom:10px">Inviter des joueurs</h3>
        <p style="color:var(--texte-doux);font-size:0.86rem">
          Partage ce code, ils le saisissent depuis « Mes ligues ».
        </p>
        <div class="code-ligue">${esc(ligue.code)}</div>
        <button class="btn btn--fantome btn--large" id="copier" style="margin-top:12px">Copier le code</button>
      </div>
      <div class="carte">
        <h3 style="margin-bottom:10px">Comment on gagne</h3>
        <p style="color:var(--texte-doux);font-size:0.86rem;margin:0">
          Le classement se fait au solde de Frags, <strong>saison par saison</strong> : à
          chaque nouvelle saison, tout le monde repart au même niveau. La ligue, elle, reste.
          Un pari saisi une fois compte dans toutes tes ligues.
        </p>
      </div>
    </div>

    ${carteRivalite(rivalite)}

    <div class="carte">
      ${tableauClassement(classement)}
    </div>

    <h2 style="margin-top:30px">Le défi de la ligue</h2>
    ${carteDefi(defi, classementDefi, estCreateur)}`;

  surClic(racine, '#tirer-defi', async (bouton) => {
    bouton.disabled = true;
    try {
      const d = await api.tirerDefi(id);
      toast(`Le sort a désigné ${d.nom}.`, 'succes');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
      bouton.disabled = false;
    }
  });

  racine.querySelector('#copier').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(ligue.code);
      toast('Code copié.', 'succes');
    } catch {
      toast(`Code : ${ligue.code}`);
    }
  });
}

/**
 * Le défi : un tournoi tiré au sort pour la ligue, avec son classement à part.
 *
 * Il est volontairement séparé du classement principal. Deux classements
 * concurrents diluent l'enjeu ; un classement principal et un défi à côté
 * donnent une seconde chance à ceux qui ont raté leur saison.
 */
function carteDefi(defi, classement, estCreateur) {
  if (!defi) {
    return `
      <div class="carte">
        <p style="color:var(--texte-doux);margin-bottom:14px">
          Un tournoi tiré au sort, et un classement parallèle où seuls les paris posés
          sur ce tournoi comptent. Un tirage par saison, il ne se reprend pas.
        </p>
        ${
          estCreateur
            ? '<button class="btn" id="tirer-defi">Tirer le tournoi du défi</button>'
            : `<p style="color:var(--texte-faible);font-size:0.85rem;margin:0">
                 Seul le créateur de la ligue peut lancer le tirage.
               </p>`
        }
      </div>`;
  }

  return `
    <div class="carte carte--defi">
      <div class="carte-call-pose__haut">
        <span class="match__event">
          <span class="pastille-jeu" data-jeu="${esc(defi.jeu ?? '')}"></span>
          <span>Tirage du ${esc(new Date(defi.tire_le).toLocaleDateString('fr-FR'))}</span>
        </span>
        <span class="badge">${esc(nomJeu(defi.jeu))}</span>
      </div>
      <p class="carte-call-pose__phrase">
        Le défi de la saison : <strong>${esc(defi.nom)}</strong>.
      </p>
      <p style="color:var(--texte-doux);font-size:0.86rem">
        Seuls les paris posés sur les matchs de ce tournoi comptent ici, et on classe
        au bénéfice net — pas au solde.
      </p>
      ${
        classement.length
          ? `<table class="tableau">
               <thead>
                 <tr>
                   <th class="rang">#</th><th>Joueur</th>
                   <th class="num">Paris</th><th class="num">Misé</th><th class="num">Net</th>
                 </tr>
               </thead>
               <tbody>
                 ${classement
                   .map(
                     (l, i) => `<tr${l.moi ? ' class="moi"' : ''}>
                       <td class="rang rang--${i + 1}">${i + 1}</td>
                       <td>${esc(l.pseudo)}${l.moi ? ' <span class="badge">toi</span>' : ''}</td>
                       <td class="num">${l.paris}</td>
                       <td class="num">${esc(frags(l.mises))}</td>
                       <td class="num ${l.net >= 0 ? 'positif' : 'negatif'}">${l.net >= 0 ? '+' : ''}${esc(frags(l.net))}</td>
                     </tr>`
                   )
                   .join('')}
               </tbody>
             </table>`
          : `<p style="color:var(--texte-faible);font-size:0.85rem;margin:0">
               Personne n'a encore de pari réglé sur ce tournoi.
             </p>`
      }
    </div>`;
}
