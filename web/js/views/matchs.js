import * as api from '../api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, quand, dateLisible, nomJeu, vide, surClic } from '../ui.js';
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
    <div class="filtres" id="filtres-jeu"></div>
    <div class="filtres" id="filtres-statut"></div>
    <div class="grille grille--2" id="liste"></div>
  `;

  const rendreFiltres = () => {
    racine.querySelector('#filtres-jeu').innerHTML = FILTRES.map(
      (f) => `<button class="puce${f.cle === jeuActif ? ' actif' : ''}" data-jeu="${f.cle}">${f.libelle}</button>`
    ).join('');
    racine.querySelector('#filtres-statut').innerHTML =
      [
        { cle: 'a_venir', libelle: 'À venir' },
        { cle: 'termine', libelle: 'Résultats' },
      ]
        .map((f) => `<button class="puce${f.cle === statutActif ? ' actif' : ''}" data-statut="${f.cle}">${f.libelle}</button>`)
        .join('') +
      (favorite
        ? `<button class="puce puce--favori${favoriSeul ? ' actif' : ''}" data-favori="1">★ ${esc(favorite.tag)}</button>`
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

async function carteMatch(m, favorite = null) {
  const termine = m.statut === 'termine';
  const monMatch =
    favorite && (m.equipe_a_id === favorite.id || m.equipe_b_id === favorite.id);
  const imminent = !termine && new Date(m.debut) - Date.now() < 3600 * 1000;

  let bas = '';
  if (termine) {
    const gA = m.score_a > m.score_b;
    bas = `<div class="match__cotes"><div class="badge">Terminé — ${esc(m.tag_a)} ${m.score_a} / ${m.score_b} ${esc(m.tag_b)}${gA ? '' : ''}</div></div>`;
  } else {
    const marches = await api.cotesDuMatch(m.id);
    const vainqueur = marches.find((x) => x.cle === 'vainqueur');
    bas = `<div class="match__cotes">${vainqueur.choix
      .map(
        (c) => `<span class="cote"><span class="cote__libelle">${esc(c.libelle)}</span><span class="cote__valeur">${c.cote.toFixed(2)}</span></span>`
      )
      .join('')}</div>`;
  }

  const centre = termine
    ? `<div><span class="score${m.score_a > m.score_b ? '' : ' score--perdant'}">${m.score_a}</span><span class="versus"> – </span><span class="score${m.score_b > m.score_a ? '' : ' score--perdant'}">${m.score_b}</span></div>`
    : `<span class="versus">BO${m.format}</span>`;

  const etoile = (id) =>
    favorite && id === favorite.id ? '<span class="equipe__favori" title="Ton équipe">★</span>' : '';

  return `
    <a class="match${monMatch ? ' match--favori' : ''}" href="#/matchs/${encodeURIComponent(m.id)}">
      <div class="match__haut">
        <span class="match__event">
          <span class="pastille-jeu" data-jeu="${esc(m.jeu)}"></span>
          <span>${esc(nomJeu(m.jeu))} · ${esc(m.evenement)}</span>
        </span>
        <span>${
          imminent
            ? `<span class="badge badge--direct"><span class="point-direct"></span>${esc(quand(m.debut))}</span>`
            : esc(termine ? dateLisible(m.debut) : quand(m.debut))
        }</span>
      </div>
      <div class="match__corps">
        <div class="equipe">
          <span class="equipe__nom">${etoile(m.equipe_a_id)} ${esc(m.equipe_a)}</span>
          <span class="equipe__elo">Elo ${m.elo_a}</span>
        </div>
        ${centre}
        <div class="equipe equipe--droite">
          <span class="equipe__nom">${esc(m.equipe_b)} ${etoile(m.equipe_b_id)}</span>
          <span class="equipe__elo">Elo ${m.elo_b}</span>
        </div>
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
