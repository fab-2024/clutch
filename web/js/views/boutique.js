/**
 * La boutique.
 *
 * Deux monnaies, deux verbes, zéro recouvrement : on **engage** des Frags sur
 * un pronostic, on **dépense** des Volts sur un cosmétique. C'est ce qui règle
 * la question restée ouverte jusqu'au 16 août — dépenser ne fait plus baisser
 * le solde, donc plus jamais la place au classement.
 *
 * Les Volts ne s'achètent pas avec de l'argent, ne se convertissent pas, ne se
 * transmettent pas. Ils se gagnent en décrochant des badges, en finissant bien
 * une saison, et en réussissant son call. Autrement dit : ce qu'on possède ici
 * est le relevé de ce qu'on a fait, pas de ce qu'on a payé.
 *
 * Et la ligne rouge, qui ne bougera pas : rien de ce qui s'achète ici ne donne
 * le moindre avantage de jeu. Le setup est un trophée, pas un équipement.
 */

import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, volts, vide, toast, surClic } from '../ui.js';

/** Les emplacements dans l'ordre d'affichage, avec leur intitulé lisible. */
const EMPLACEMENTS = [
  ['piece', 'La pièce'],
  ['boitier', 'Boîtier'],
  ['gpu', 'Carte graphique'],
  ['refroidissement', 'Refroidissement'],
  ['ventilation', 'Ventilation'],
  ['memoire', 'Mémoire'],
  ['cablage', 'Câblage'],
];

const libelle = (id) => EMPLACEMENTS.find(([e]) => e === id)?.[1] ?? id;

export async function vueBoutique(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = vide(
      'Pas encore de compte',
      'Crée ton profil : les Volts se gagnent en pronostiquant juste, et se dépensent ici.',
      '<a class="btn" href="#/connexion">Commencer</a>'
    );
    return;
  }

  const donnees = await api.boutique();
  if (!donnees) {
    racine.innerHTML = vide('Boutique indisponible', 'Impossible de charger le catalogue pour le moment.');
    return;
  }

  rendre(racine, donnees);

  surClic(racine, '[data-acheter]', async (bouton) => {
    const id = bouton.dataset.acheter;
    bouton.disabled = true;
    try {
      const r = await api.acheterObjet(id);
      toast(`${r.nom} débloqué — il te reste ${volts(r.solde)}.`, 'succes');
      rendre(racine, await api.boutique());
    } catch (e) {
      toast(e.message || 'Achat impossible.', 'erreur');
      bouton.disabled = false;
    }
  });

  surClic(racine, '[data-equiper]', async (bouton) => {
    const id = bouton.dataset.equiper;
    bouton.disabled = true;
    try {
      await api.equiperObjet(id);
      rendre(racine, await api.boutique());
    } catch (e) {
      toast(e.message || 'Impossible d’équiper cet objet.', 'erreur');
      bouton.disabled = false;
    }
  });
}

function rendre(racine, { solde, objets }) {
  const possedes = objets.filter((o) => o.possede && o.niveau > 1).length;
  const payants = objets.filter((o) => o.niveau > 1).length;

  racine.innerHTML = `
    <div class="entete-page">
      <div>
        <h1>Boutique</h1>
        <p>${possedes} objet${possedes > 1 ? 's' : ''} sur ${payants} — tout est cosmétique,
           rien ne s’achète avec de l’argent réel.</p>
      </div>
    </div>

    <div class="bloc bloc--info">
      <div class="bloc__titre">
        <span>Tes Volts</span>
        <span><strong style="color:var(--accent)">${esc(volts(solde))}</strong></span>
      </div>
      <div class="bloc__corps">
        <p style="color:var(--texte-doux);margin-bottom:0">
          Les Volts ne se misent jamais. Dépenser ici ne touche pas à tes Frags,
          donc jamais à ta place au classement. Ils se gagnent avec les badges,
          le rang de fin de saison et le call réussi.
        </p>
      </div>
    </div>

    <div class="encart" style="margin:20px 0 26px">
      Rien de ce qui s’achète ici ne donne le moindre avantage de jeu — ni
      multiplicateur, ni Frags supplémentaires. Le setup est un trophée, pas un
      équipement.
    </div>

    ${EMPLACEMENTS.map(([id]) => bloc(id, objets.filter((o) => o.emplacement === id), solde))
      .filter(Boolean)
      .join('')}`;
}

function bloc(emplacementId, liste, solde) {
  if (!liste.length) return '';
  const trie = [...liste].sort((a, b) => a.niveau - b.niveau);
  const acquis = trie.filter((o) => o.possede && o.niveau > 1).length;
  const total = trie.filter((o) => o.niveau > 1).length;

  return `
    <h2 style="margin-top:26px">
      ${esc(libelle(emplacementId))}
      <span class="badge">${acquis} / ${total}</span>
    </h2>
    <div class="grille grille--3">
      ${trie.map((o) => carte(o, solde)).join('')}
    </div>`;
}

function carte(o, solde) {
  const gratuit = o.niveau === 1;
  const abordable = solde >= o.prix;

  // Un objet non possédé et hors budget reste affiché, en retrait : un objet
  // qu'on ne voit pas ne donne envie de rien. C'est la règle des badges.
  let action;
  if (o.equipe) {
    action = '<span class="badge">Équipé</span>';
  } else if (o.possede || gratuit) {
    action = `<button class="btn btn--fantome btn--petit" data-equiper="${esc(o.id)}">Équiper</button>`;
  } else if (abordable) {
    action = `<button class="btn" data-acheter="${esc(o.id)}">${esc(volts(o.prix))}</button>`;
  } else {
    action = `<span class="objet-carte__prix" title="Il te manque ${esc(volts(o.prix - solde))}">${esc(volts(o.prix))}</span>`;
  }

  const classes = [
    'objet-carte',
    o.equipe ? 'objet-carte--equipe' : '',
    o.possede || gratuit ? 'objet-carte--possede' : '',
    !o.possede && !gratuit && !abordable ? 'objet-carte--hors-budget' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${classes}">
      <div class="objet-carte__niveau">Niveau ${o.niveau}</div>
      <div class="objet-carte__nom">${esc(o.nom)}</div>
      <div class="objet-carte__action">${action}</div>
    </div>`;
}
