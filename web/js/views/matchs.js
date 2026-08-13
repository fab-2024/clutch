import * as api from '../api.js';
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

export async function vueMatchs(racine) {
  racine.innerHTML = `
    <div class="entete-page">
      <div>
        <h1>Matchs à venir</h1>
        <p>Choisis une cote, mise tes Frags, attends le résultat.</p>
      </div>
    </div>
    <div class="filtres" id="filtres-jeu"></div>
    <div class="filtres" id="filtres-statut"></div>
    <div class="grille grille--2" id="liste"></div>
  `;

  const rendreFiltres = () => {
    racine.querySelector('#filtres-jeu').innerHTML = FILTRES.map(
      (f) => `<button class="puce${f.cle === jeuActif ? ' actif' : ''}" data-jeu="${f.cle}">${f.libelle}</button>`
    ).join('');
    racine.querySelector('#filtres-statut').innerHTML = [
      { cle: 'a_venir', libelle: 'À venir' },
      { cle: 'termine', libelle: 'Résultats' },
    ]
      .map((f) => `<button class="puce${f.cle === statutActif ? ' actif' : ''}" data-statut="${f.cle}">${f.libelle}</button>`)
      .join('');
  };

  const rendreListe = async () => {
    const liste = racine.querySelector('#liste');
    liste.innerHTML = '<div class="chargement"><span class="spinner"></span></div>';
    const matchs = await api.listerMatchs({ jeu: jeuActif || null, statut: statutActif });
    if (!matchs.length) {
      liste.innerHTML = vide('Aucun match', 'Rien de prévu ici pour le moment.');
      return;
    }
    const cartes = await Promise.all(matchs.map((m) => carteMatch(m)));
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
}

async function carteMatch(m) {
  const termine = m.statut === 'termine';
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

  return `
    <a class="match" href="#/matchs/${encodeURIComponent(m.id)}">
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
          <span class="equipe__nom">${esc(m.equipe_a)}</span>
          <span class="equipe__elo">Elo ${m.elo_a}</span>
        </div>
        ${centre}
        <div class="equipe equipe--droite">
          <span class="equipe__nom">${esc(m.equipe_b)}</span>
          <span class="equipe__elo">Elo ${m.elo_b}</span>
        </div>
      </div>
      ${bas}
    </a>`;
}
