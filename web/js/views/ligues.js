/**
 * Ligues — un écran, deux onglets.
 *
 * Le classement global et les ligues privées répondaient à deux entrées de
 * menu différentes alors qu'ils répondent à la même question : où je me situe.
 * Ils vivent maintenant côte à côte, et le passage de l'un à l'autre ne coûte
 * plus un aller-retour dans la navigation.
 */

import * as api from '../api.js';
import { contexte, bandeauSaison } from '../app.js';
import { esc, toast, vide, surClic } from '../ui.js';
import { vueClassement } from './classement.js';

const ONGLETS = [
  { cle: 'global', libelle: 'Classement global' },
  { cle: 'mes', libelle: 'Mes ligues' },
];

/** Retenu d'une visite à l'autre — mais jamais imposé au premier passage. */
let ongletChoisi = null;

export async function vueLigues(racine, force = null) {
  if (force) ongletChoisi = force;
  // Sans compte, « mes ligues » est vide par construction : on ouvre sur le
  // classement, qui a au moins quelque chose à montrer.
  const onglet = ongletChoisi ?? (contexte.utilisateur ? 'mes' : 'global');

  racine.innerHTML = `
    <div class="entete-page">
      <h1>Ligues</h1>
      <p>${esc(contexte.saison?.nom ?? '')} — un pari saisi une fois compte partout,
         dans le classement général comme dans chacune de tes ligues.</p>
    </div>
    ${bandeauSaison()}
    <div class="sections" id="sections"></div>
    <div id="zone-onglet"></div>`;

  const dessinerOnglets = (actif) => {
    racine.querySelector('#sections').innerHTML = ONGLETS.map(
      (o) => `<button class="sections__lien${o.cle === actif ? ' actif' : ''}" data-onglet="${o.cle}">${o.libelle}</button>`
    ).join('');
  };

  /**
   * Zone NEUVE à chaque changement d'onglet.
   *
   * Le classement attache ses écouteurs sur le conteneur qu'on lui donne ;
   * réutiliser le même nœud les empilerait, et un clic sur « retour sur mise »
   * finirait par se déclencher deux fois. Cloner le nœud les emporte.
   */
  const afficher = async (cle) => {
    dessinerOnglets(cle);
    const ancienne = racine.querySelector('#zone-onglet');
    const zone = ancienne.cloneNode(false);
    ancienne.replaceWith(zone);
    zone.innerHTML = '<div class="chargement"><span class="spinner"></span></div>';
    if (cle === 'global') await vueClassement(zone, { entete: false });
    else await sectionMesLigues(zone);
  };

  await afficher(onglet);

  surClic(racine, '[data-onglet]', async (btn) => {
    ongletChoisi = btn.dataset.onglet;
    await afficher(ongletChoisi);
  });
}

/** L'onglet « mes ligues » : créer, rejoindre, et la liste. */
async function sectionMesLigues(zone) {
  if (!contexte.utilisateur) {
    zone.innerHTML = vide(
      'Connecte-toi',
      'Les ligues, c’est le cœur du jeu : crée la tienne et invite tes potes.',
      '<a class="btn" href="#/connexion">Créer mon compte</a>'
    );
    return;
  }

  const ligues = await api.mesLigues();

  zone.innerHTML = `
    <div class="grille grille--2" style="margin-bottom:20px">
      <div class="bloc" style="margin:0">
        <div class="bloc__titre"><span>Créer une ligue</span></div>
        <div class="bloc__corps">
          <label class="champ">
            <span class="champ__libelle">Nom de la ligue</span>
            <input type="text" id="nom-ligue" placeholder="Ex : Les potes du Discord" maxlength="40" />
          </label>
          <button class="btn btn--large" id="creer">Créer</button>
        </div>
      </div>
      <div class="bloc" style="margin:0">
        <div class="bloc__titre"><span>Rejoindre une ligue</span></div>
        <div class="bloc__corps">
          <label class="champ">
            <span class="champ__libelle">Code d'invitation</span>
            <input type="text" id="code-ligue" placeholder="Ex : K7XPQ2" maxlength="6"
                   style="text-transform:uppercase;letter-spacing:0.2em" />
          </label>
          <button class="btn btn--large btn--fantome" id="rejoindre">Rejoindre</button>
        </div>
      </div>
    </div>

    <div class="bloc">
      <div class="bloc__titre">
        <span>Les ligues où je participe</span>
        <span>${ligues.length}</span>
      </div>
      <div class="bloc__corps">
        ${
          ligues.length
            ? `<div class="grille grille--2">${ligues
                .map(
                  (l) => `
              <a class="tuile" href="#/ligues/${encodeURIComponent(l.id)}">
                <span class="tuile__titre">${esc(l.nom)}</span>
                <span class="tuile__aide">${l.nb_membres} membre${l.nb_membres > 1 ? 's' : ''} · code ${esc(l.code)}</span>
              </a>`
                )
                .join('')}</div>`
            : vide('Aucune ligue', 'Crée la première, ça prend 5 secondes.')
        }
      </div>
    </div>`;

  zone.querySelector('#creer').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      const l = await api.creerLigue(zone.querySelector('#nom-ligue').value);
      toast(`Ligue créée ! Code : ${l.code}`, 'succes');
      location.hash = `#/ligues/${encodeURIComponent(l.id)}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
      e.currentTarget.disabled = false;
    }
  });

  zone.querySelector('#rejoindre').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      const l = await api.rejoindreLigue(zone.querySelector('#code-ligue').value);
      toast(`Bienvenue dans ${l.nom} !`, 'succes');
      location.hash = `#/ligues/${encodeURIComponent(l.id)}`;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
      e.currentTarget.disabled = false;
    }
  });
}
