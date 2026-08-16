import * as api from '../api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, quand, dateLisible, nomJeu, vide, surClic, ecusson } from '../ui.js';
import { JEUX } from '../core.js';

const FILTRES = [
  { cle: '', libelle: 'Tous les jeux' },
  { cle: 'lol', libelle: 'League of Legends' },
  { cle: 'cs2', libelle: 'CS2' },
  { cle: 'valorant', libelle: 'Valorant' },
];

let jeuActif = '';
let statutActif = 'a_venir';
let favoriSeul = false;

export async function vueMatchs(racine) {
  const favorite = contexte.utilisateur?.equipe_favorite ?? null;
  if (!favorite) favoriSeul = false;

  // Le call n'a plus d'onglet : il s'invite ici tant qu'il est posable, c'est-à-dire
  // au moment et à l'endroit où le joueur pense déjà à pronostiquer.
  const rappelCall = await rappelDuCall();

  racine.innerHTML = `
    <div class="entete-page">
      <h1>Matchs à venir</h1>
      <p>${esc(contexte.saison?.nom ?? '')} — choisis une cote, mise tes Frags, attends le résultat.</p>
    </div>
    ${bandeauSaison()}
    ${rappelCall}
    <div class="es-filtres" id="filtres-jeu"></div>
    <div class="es-filtres" id="filtres-statut"></div>
    <div class="es-liste" id="liste"></div>
  `;

  const rendreFiltres = () => {
    racine.querySelector('#filtres-jeu').innerHTML = FILTRES.map(
      (f) => `<button class="es-puce${f.cle === jeuActif ? ' actif' : ''}" style="--jeu:${f.cle ? `var(--${f.cle})` : 'transparent'}" data-jeu="${f.cle}">${f.cle ? '<span class="es-puce__pt"></span>' : ''}${f.libelle}</button>`
    ).join('');
    racine.querySelector('#filtres-statut').innerHTML =
      [
        { cle: 'a_venir', libelle: 'À venir' },
        { cle: 'termine', libelle: 'Résultats' },
      ]
        .map((f) => `<button class="es-puce es-puce--action${f.cle === statutActif ? ' actif' : ''}" data-statut="${f.cle}">${f.libelle}</button>`)
        .join('') +
      (favorite
        ? `<button class="es-puce es-puce--action${favoriSeul ? ' actif' : ''}" data-favori="1">★ ${esc(favorite.tag)}</button>`
        : '');
  };

  const rendreListe = async () => {
    const liste = racine.querySelector('#liste');
    liste.innerHTML = '<div class="chargement"><span class="spinner"></span></div>';
    const matchs = await api.listerMatchs({
      jeu: jeuActif || null,
      statut: statutActif,
      equipe: favoriSeul ? favorite.id : null,
    });
    if (!matchs.length) {
      liste.innerHTML = vide(
        'Aucun match',
        favoriSeul
          ? `Rien de prévu pour ${favorite.nom} ici. Retire le filtre pour voir le reste.`
          : 'Rien de prévu ici pour le moment.'
      );
      return;
    }
    const cartes = await Promise.all(matchs.map((m) => carteMatch(m, favorite)));
    liste.innerHTML = cartes.join('');
  };

  rendreFiltres();
  await rendreListe();

  surClic(racine, '[data-jeu]', async (btn) => {
    jeuActif = btn.dataset.jeu;
    rendreFiltres();
    await rendreListe();
  });
  surClic(racine, '[data-statut]', async (btn) => {
    statutActif = btn.dataset.statut;
    rendreFiltres();
    await rendreListe();
  });
  surClic(racine, '[data-favori]', async () => {
    favoriSeul = !favoriSeul;
    rendreFiltres();
    await rendreListe();
  });
}

/**
 * Une carte de match.
 *
 * Trois choses portent l'energie de l'ecran, et aucune ne demande d'image :
 * l'ecusson donne son identite a chaque camp, le degrade du haut donne son
 * atmosphere au jeu, et la lueur d'accent est RESERVEE a ton equipe — c'est
 * le seul endroit jaune de la liste, donc elle veut dire quelque chose.
 *
 * Sur telephone les deux camps sont empiles, le format servant de separateur.
 * En vis-a-vis a 430 px, « Movistar KOI » et « Gentle Mates » mordent sur le
 * BO3 : la confrontation ne reprend sa place qu'au-dessus de 640 px.
 */
async function carteMatch(m, favorite = null) {
  const termine = m.statut === 'termine';
  const monMatch =
    favorite && (m.equipe_a_id === favorite.id || m.equipe_b_id === favorite.id);
  const imminent = !termine && new Date(m.debut) - Date.now() < 3600 * 1000;

  let bas;
  if (termine) {
    const aGagne = m.score_a > m.score_b;
    bas = `<div class="es-cotes">
        <span class="es-pari"><span class="es-pari__tag">${esc(m.tag_a)}</span>
          <span class="es-pari__val${aGagne ? '' : ' es-pari__val--terne'}">${m.score_a}</span></span>
        <span class="es-pari"><span class="es-pari__tag">${esc(m.tag_b)}</span>
          <span class="es-pari__val${aGagne ? ' es-pari__val--terne' : ''}">${m.score_b}</span></span>
      </div>`;
  } else {
    const marches = await api.cotesDuMatch(m.id);
    const vainqueur = marches.find((x) => x.cle === 'vainqueur');
    bas = `<div class="es-cotes">${vainqueur.choix
      .map(
        (c) => `<span class="es-pari">
            <span class="es-pari__tag">${esc(c.libelle)}</span>
            <span class="es-pari__val">${c.cote.toFixed(2)}</span>
          </span>`
      )
      .join('')}</div>`;
  }

  const camp = (nom, tag, elo, droite = false) => `
    <span class="es-camp${droite ? ' es-camp--droite' : ''}">
      ${ecusson(tag, nom)}
      <span class="es-camp__txt">
        <span class="es-camp__nom">${esc(nom)}</span>
        <span class="es-camp__elo">Elo ${elo}</span>
      </span>
    </span>`;

  return `
    <a class="es-match${monMatch ? ' es-match--favori' : ''}" data-jeu="${esc(m.jeu)}"
       href="#/matchs/${encodeURIComponent(m.id)}">
      <div class="es-match__haut">
        <span class="es-tournoi"><span class="es-tournoi__pt"></span>${esc(m.evenement)}</span>
        ${
          imminent
            ? `<span class="es-direct"><span class="es-pt"></span>${esc(quand(m.debut))}</span>`
            : `<span class="es-quand">${esc(termine ? dateLisible(m.debut) : quand(m.debut))}</span>`
        }
      </div>
      <div class="es-duel">
        ${camp(m.equipe_a, m.tag_a, m.elo_a)}
        <span class="es-milieu"><span class="es-format">BO${m.format}</span></span>
        ${camp(m.equipe_b, m.tag_b, m.elo_b, true)}
      </div>
      ${bas}
    </a>`;
}

/**
 * Le rappel du call, affiché uniquement s'il est encore posable.
 *
 * Trois conditions : être connecté, ne pas l'avoir déjà posé, et qu'il reste au
 * moins un tournoi qui n'a pas commencé. Sinon on n'affiche rien du tout —
 * un encart permanent qui dit « indisponible » est pire que pas d'encart.
 */
async function rappelDuCall() {
  if (!contexte.utilisateur) return '';
  try {
    const [call, evenements] = await Promise.all([api.monCall(), api.listerEvenementsSaison()]);
    if (call) return '';
    const ouverts = evenements.filter((e) => e.statut === 'ouvert');
    if (!ouverts.length) return '';
    return `
      <div class="bloc bloc--volt">
        <div class="bloc__titre">
          <span>Le call de la saison</span>
          <span>${ouverts.length} tournoi${ouverts.length > 1 ? 'x' : ''} encore ouvert${ouverts.length > 1 ? 's' : ''}</span>
        </div>
        <div class="bloc__corps">
          <p style="color:var(--texte-doux);margin-bottom:14px">
            Un seul pronostic pour toute la saison : qui gagne le tournoi ? Il se pose
            avant le premier match, et il ne se reprend pas.
          </p>
          <a class="btn btn--large" href="#/call">Poser mon call</a>
        </div>
      </div>`;
  } catch {
    return ''; // un rappel qui échoue ne doit jamais empêcher le calendrier de s'afficher
  }
}
