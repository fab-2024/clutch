import * as api from '../api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, frags, nomJeu, vide } from '../ui.js';
import { constatsAnalyste, TRANCHES_COTE, SEUIL_SIGNIFICATIF } from '../core.js';

/**
 * Le profil d'analyste.
 *
 * Rien de nouveau n'est stocké ici : tout se déduit des paris déjà réglés.
 * L'intérêt n'est pas la statistique, c'est le constat — « tu perds sur les
 * BO1 » vaut mieux que douze colonnes de chiffres que personne ne lit.
 */
export async function vueAnalyste(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Pas encore de compte',
      "Crée-toi un profil, mise, et je te dirai quel parieur tu es.",
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  const detail = await api.statistiquesDetaillees();
  const total = detail?.total ?? { paris: 0 };

  if (!total.paris) {
    racine.innerHTML = `
      <div class="entete-page"><div><h1>Mon profil d'analyste</h1></div></div>
      ${bandeauSaison()}
      ${vide(
        'Aucun pari réglé',
        "Reviens quand tes premiers paris seront tombés : sans résultat, il n'y a rien à analyser.",
        '<a class="btn" href="#/matchs">Voir les matchs</a>'
      )}`;
    return;
  }

  const constats = constatsAnalyste(detail);

  racine.innerHTML = `
    <p><a href="#/profil">← Mes paris</a></p>
    <div class="entete-page">
      <div>
        <h1>Mon profil d'analyste</h1>
        <p>
          ${esc(contexte.saison?.nom ?? '')} — ${total.paris} pari${total.paris > 1 ? 's' : ''} réglé${total.paris > 1 ? 's' : ''},
          ${Number(total.roi).toFixed(1)} % de retour sur mise.
        </p>
      </div>
    </div>
    ${bandeauSaison()}

    <h2>Ce que disent tes paris</h2>
    <div class="grille" style="margin-bottom:26px">
      ${constats.map((c) => `<div class="constat">${c.texte}</div>`).join('')}
    </div>

    <p style="color:var(--texte-faible);font-size:0.82rem">
      Les catégories de moins de ${SEUIL_SIGNIFICATIF} paris ne sont jamais commentées :
      en dessous, un écart de rentabilité raconte le hasard, pas ton jugement.
    </p>

    ${bloc('Par format', detail.par_format, (c) => `BO${c}`)}
    ${bloc('Par jeu', detail.par_jeu, (c) => nomJeu(c))}
    ${bloc('Par marché', detail.par_marche, (c) => LIBELLE_MARCHE[c] ?? c)}
    ${bloc('Par niveau de cote', detail.par_cote, (c) => TRANCHES_COTE.find((t) => t.cle === c)?.libelle ?? c)}
    ${blocFavorite(detail.equipe_favorite)}`;
}

const LIBELLE_MARCHE = {
  vainqueur: 'Vainqueur du match',
  score_exact: 'Score exact en maps',
  total_maps: 'Nombre de maps',
};

function bloc(titre, lignes, formate) {
  if (!lignes?.length) return '';
  return `
    <h2 style="margin-top:26px">${esc(titre)}</h2>
    <div class="carte">
      <table class="tableau">
        <thead>
          <tr>
            <th>${esc(titre.replace('Par ', '').replace(/^./, (c) => c.toUpperCase()))}</th>
            <th class="num">Paris</th>
            <th class="num">Réussite</th>
            <th class="num">Misé</th>
            <th class="num">Net</th>
            <th class="num">Retour</th>
          </tr>
        </thead>
        <tbody>
          ${lignes
            .map(
              (l) => `<tr>
                <td>${esc(formate(l.cle))}</td>
                <td class="num">${l.paris}</td>
                <td class="num">${l.paris ? Math.round((l.gagnes / l.paris) * 100) : 0} %</td>
                <td class="num">${esc(frags(l.mises))}</td>
                <td class="num ${l.net >= 0 ? 'positif' : 'negatif'}">${l.net >= 0 ? '+' : ''}${esc(frags(l.net))}</td>
                <td class="num ${l.roi >= 0 ? 'positif' : 'negatif'}">${l.roi >= 0 ? '+' : ''}${Number(l.roi).toFixed(1)} %</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

function blocFavorite(fav) {
  if (!fav) {
    return `
      <h2 style="margin-top:26px">Ton équipe</h2>
      <div class="carte" style="color:var(--texte-doux)">
        Tu n'as pas choisi d'équipe préférée. C'est pourtant la comparaison la plus
        instructive du lot : presque tout le monde surestime son équipe, et le chiffrer
        est le seul moyen de s'en rendre compte.
        <a href="#/profil">En choisir une</a>.
      </div>`;
  }
  const ligne = (titre, b) => `<tr>
      <td>${esc(titre)}</td>
      <td class="num">${b.paris}</td>
      <td class="num">${b.paris ? Math.round((b.gagnes / b.paris) * 100) : 0} %</td>
      <td class="num">${esc(frags(b.mises))}</td>
      <td class="num ${b.net >= 0 ? 'positif' : 'negatif'}">${b.net >= 0 ? '+' : ''}${esc(frags(b.net))}</td>
      <td class="num ${b.roi >= 0 ? 'positif' : 'negatif'}">${b.roi >= 0 ? '+' : ''}${Number(b.roi).toFixed(1)} %</td>
    </tr>`;

  return `
    <h2 style="margin-top:26px">Le biais du supporter</h2>
    <div class="carte">
      <table class="tableau">
        <thead>
          <tr>
            <th>Périmètre</th><th class="num">Paris</th><th class="num">Réussite</th>
            <th class="num">Misé</th><th class="num">Net</th><th class="num">Retour</th>
          </tr>
        </thead>
        <tbody>
          ${ligne(`Matchs de ${fav.nom}`, fav.avec)}
          ${ligne('Tous les autres matchs', fav.sans)}
        </tbody>
      </table>
    </div>`;
}
