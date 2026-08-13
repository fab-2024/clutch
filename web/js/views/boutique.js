/**
 * La boutique — écran d'annonce.
 *
 * Elle n'ouvre pas encore, et l'entrée existe quand même dans le menu :
 * accumuler des Frags sans savoir à quoi ils serviront un jour est ce qui
 * lasse le plus vite. Autant dire tout de suite ce qui arrive.
 *
 * Rien ici ne s'achète avec de l'argent réel, et rien ne s'achètera jamais :
 * Clutch est un jeu gratuit, les Frags se gagnent en jouant et ne se
 * convertissent pas.
 */

import { contexte } from '../app.js';
import { esc, frags, jeton } from '../ui.js';

const A_VENIR = [
  {
    titre: 'Titres',
    detail: 'Une ligne sous ton pseudo, visible au classement et dans tes ligues. « Roi de l’outsider », « Sniper du dimanche »…',
    prix: '200 à 2 000 Frags',
  },
  {
    titre: 'Couleurs de pseudo',
    detail: 'Ta teinte au classement et dans les ligues. Sobre par défaut, tape-à-l’œil si tu insistes.',
    prix: '500 Frags',
  },
  {
    titre: 'Cadres d’avatar',
    detail: 'Le contour de ta pastille en haut à droite. Certains ne s’achètent pas : ils se décrochent avec un badge.',
    prix: '800 Frags',
  },
  {
    titre: 'Habillages de carte',
    detail: 'Le fond des cartes « Je l’avais dit » que tu partages après un gros coup.',
    prix: '1 200 Frags',
  },
  {
    titre: 'La chambre gaming',
    detail: 'Plus tard, et c’est le gros morceau : une pièce à équiper pièce par pièce, écran, fauteuil, néons, posters de ton équipe.',
    prix: 'plus tard',
  },
];

export async function vueBoutique(racine) {
  const solde = contexte.utilisateur?.solde;

  racine.innerHTML = `
    <div class="entete-page">
      <h1>Boutique</h1>
      <p>Tout est cosmétique, tout se paye en Frags gagnés en jouant.
         Rien ne s’achète avec de l’argent réel, ici ou ailleurs.</p>
    </div>

    <div class="bloc bloc--info">
      <div class="bloc__titre">
        <span>Pas encore ouverte</span>
        ${contexte.utilisateur ? `<span>${jeton(15)} Ton solde : ${esc(frags(solde))}</span>` : ''}
      </div>
      <div class="bloc__corps">
        <p style="color:var(--texte-doux);margin-bottom:0">
          ${
            contexte.utilisateur
              ? `Tu as ${jeton(17)} <strong style="color:var(--accent)">${esc(frags(solde))}</strong> de côté.
                 Rien n’est perdu : ce que tu accumules maintenant sera dépensable ici.`
              : `Crée ton compte : les Frags que tu gagnes dès aujourd’hui seront dépensables ici.
                 <a href="#/connexion">Commencer</a>`
          }
        </p>
      </div>
    </div>

    <div class="bloc">
      <div class="bloc__titre"><span>Ce qui arrive</span></div>
      <div class="bloc__corps">
        <div class="bientot">
          ${A_VENIR.map(
            (a) => `
            <div>
              <div class="bientot__ligne">
                <span class="bientot__nom">${esc(a.titre)}</span>
                <span class="bientot__prix">${esc(a.prix)}</span>
              </div>
              <p style="color:var(--texte-faible);font-size:0.84rem;margin:2px 0 0">${esc(a.detail)}</p>
            </div>`
          ).join('')}
        </div>
      </div>
    </div>

    <div class="encart">
      <strong>Une question encore ouverte.</strong> Dépenser des Frags fait baisser
      ton solde, donc ta place au classement. Deux façons de régler ça : soit la
      boutique puise dans un total « gagné depuis toujours » qui ne touche pas au
      solde de la saison, soit le classement se lit au retour sur mise plutôt qu’au
      solde. Ce sera tranché avant l’ouverture.
    </div>`;
}
