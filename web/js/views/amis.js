/**
 * Les amis — troisième onglet de Ligues.
 *
 * Une ligue est un classement ; un ami est une personne. On peut suivre
 * quelqu'un sans jouer dans la même ligue que lui, et c'est le seul endroit
 * du produit où on choisit qui on regarde.
 *
 * La règle qui commande tout l'écran : **on ne montre jamais un pronostic
 * non résolu.** La répartition anonyme de la communauté existe déjà pour
 * donner le sentiment du groupe avant un match ; afficher nommément ce que
 * le meilleur joueur de la ligue a joué sur un match à venir en ferait une
 * antisèche, et viderait le jeu de son intérêt. L'activité affichée ici est
 * du récit, jamais de l'information.
 */

import * as api from '../api.js';
import { contexte } from '../app.js';
import { esc, frags, vide, toast, surClic, quand } from '../ui.js';

export async function sectionAmis(zone) {
  if (!contexte.utilisateur) {
    zone.innerHTML = vide(
      'Connecte-toi',
      'Les amis, c’est voir qui a eu raison hier soir — et le leur rappeler.',
      '<a class="btn" href="#/connexion">Créer mon compte</a>'
    );
    return;
  }

  await rafraichir(zone);

  // Un seul jeu d'écouteurs pour toute la section : les listes sont
  // reconstruites à chaque action, des écouteurs par bouton s'empileraient.
  surClic(zone, '[data-action]', async (btn) => {
    const { action, user } = btn.dataset;
    btn.disabled = true;
    try {
      if (action === 'demander') {
        const r = await api.demanderAmi(user);
        toast(r.statut === 'acceptee' ? 'Vous êtes amis !' : 'Demande envoyée.', 'succes');
      } else if (action === 'accepter') {
        await api.repondreDemande(user, true);
        toast('Demande acceptée.', 'succes');
      } else if (action === 'refuser') {
        await api.repondreDemande(user, false);
        toast('Demande refusée.');
      } else if (action === 'retirer') {
        await api.retirerAmi(user);
        toast('Retiré de tes amis.');
      }
      await rafraichir(zone, zone.querySelector('#recherche')?.value ?? '');
    } catch (e) {
      toast(e.message || 'Action impossible.', 'erreur');
      btn.disabled = false;
    }
  });
}

async function rafraichir(zone, terme = '') {
  const [donnees, activite] = await Promise.all([api.mesAmis(), api.activiteAmis()]);
  const resultats = terme.trim().length >= 2 ? await api.chercherJoueurs(terme) : [];

  zone.innerHTML = `
    ${blocDemandes(donnees.recues)}

    <div class="bloc">
      <div class="bloc__titre"><span>Trouver quelqu’un</span></div>
      <div class="bloc__corps">
        <label class="champ">
          <span class="champ__libelle">Pseudo</span>
          <input type="text" id="recherche" placeholder="Deux lettres suffisent"
                 autocomplete="off" value="${esc(terme)}" />
        </label>
        <div id="resultats">${listeResultats(resultats, terme)}</div>
      </div>
    </div>

    ${blocAmis(donnees.amis, donnees.envoyees)}
    ${blocActivite(activite)}`;

  const champ = zone.querySelector('#recherche');
  if (champ) {
    // Une frappe ne déclenche pas une requête : on attend que la main
    // s'arrête. Sans ça, « Thomas » en lance six.
    let minuteur;
    champ.addEventListener('input', (e) => {
      const v = e.target.value;
      clearTimeout(minuteur);
      minuteur = setTimeout(async () => {
        const liste = v.trim().length >= 2 ? await api.chercherJoueurs(v) : [];
        const cible = zone.querySelector('#resultats');
        if (cible) cible.innerHTML = listeResultats(liste, v);
      }, 280);
    });
    if (terme) {
      champ.focus();
      champ.setSelectionRange(terme.length, terme.length);
    }
  }
}

function blocDemandes(recues) {
  if (!recues?.length) return '';
  return `
    <div class="bloc bloc--info">
      <div class="bloc__titre">
        <span>Demandes reçues</span><span>${recues.length}</span>
      </div>
      <div class="bloc__corps">
        ${recues
          .map(
            (d) => `
          <div class="ligne-ami">
            <div>
              <div class="ligne-ami__nom">${esc(d.pseudo)}</div>
              <div class="ligne-ami__aide">${esc(quand(d.depuis))}</div>
            </div>
            <div class="ligne-ami__actions">
              <button class="btn btn--petit" data-action="accepter" data-user="${esc(d.id)}">Accepter</button>
              <button class="btn btn--petit btn--fantome" data-action="refuser" data-user="${esc(d.id)}">Refuser</button>
            </div>
          </div>`
          )
          .join('')}
      </div>
    </div>`;
}

function listeResultats(liste, terme) {
  if (terme.trim().length < 2) {
    return '<p class="ligne-ami__aide" style="margin:0">Tape au moins deux lettres.</p>';
  }
  if (!liste.length) {
    return '<p class="ligne-ami__aide" style="margin:0">Personne de ce nom.</p>';
  }
  const bouton = {
    aucune: (id) => `<button class="btn btn--petit" data-action="demander" data-user="${esc(id)}">Ajouter</button>`,
    demande_envoyee: () => '<span class="badge">Demande envoyée</span>',
    demande_recue: (id) => `<button class="btn btn--petit" data-action="accepter" data-user="${esc(id)}">Accepter</button>`,
    ami: () => '<span class="badge">Ami</span>',
  };
  return liste
    .map(
      (j) => `
    <div class="ligne-ami">
      <div class="ligne-ami__nom">${esc(j.pseudo)}</div>
      <div class="ligne-ami__actions">${bouton[j.relation](j.id)}</div>
    </div>`
    )
    .join('');
}

function blocAmis(amis, envoyees) {
  const enAttente = (envoyees ?? [])
    .map(
      (d) => `
    <div class="ligne-ami">
      <div>
        <div class="ligne-ami__nom" style="opacity:.7">${esc(d.pseudo)}</div>
        <div class="ligne-ami__aide">Demande envoyée ${esc(quand(d.depuis))}</div>
      </div>
      <div class="ligne-ami__actions">
        <button class="btn btn--petit btn--fantome" data-action="retirer" data-user="${esc(d.id)}">Annuler</button>
      </div>
    </div>`
    )
    .join('');

  return `
    <div class="bloc">
      <div class="bloc__titre">
        <span>Mes amis</span><span>${amis?.length ?? 0}</span>
      </div>
      <div class="bloc__corps">
        ${
          amis?.length
            ? amis
                .map(
                  (a) => `
          <div class="ligne-ami">
            <div>
              <div class="ligne-ami__nom">${esc(a.pseudo)}${
                a.tag_favori ? ` <span class="badge">${esc(a.tag_favori)}</span>` : ''
              }</div>
              <div class="ligne-ami__aide">
                ${esc(frags(a.solde))} · ${a.paris} pari${a.paris > 1 ? 's' : ''}
                · retour <span class="${Number(a.roi) >= 0 ? 'positif' : 'negatif'}">${
                    Number(a.roi) >= 0 ? '+' : ''
                  }${esc(Number(a.roi).toFixed(1))} %</span>
                · note ${a.note}
              </div>
            </div>
            <div class="ligne-ami__actions">
              <button class="btn btn--petit btn--fantome" data-action="retirer" data-user="${esc(a.id)}">Retirer</button>
            </div>
          </div>`
                )
                .join('')
            : vide('Personne pour l’instant', 'Cherche un pseudo au-dessus, ou envoie ton code de ligue.')
        }
        ${enAttente}
      </div>
    </div>`;
}

function blocActivite(activite) {
  if (!activite?.length) return '';
  return `
    <div class="bloc">
      <div class="bloc__titre"><span>Ce qu’ils ont fait</span></div>
      <div class="bloc__corps">
        ${activite
          .map(
            (e) => `
          <div class="ligne-ami">
            <div>
              <div class="ligne-ami__nom">${esc(e.pseudo)}</div>
              <div class="ligne-ami__aide">
                ${esc(e.libelle_choix ?? e.choix)} sur ${esc(e.equipe_a)} – ${esc(e.equipe_b)},
                cote ${esc(Number(e.cote).toFixed(2))} · ${esc(quand(e.quand))}
              </div>
            </div>
            <div class="ligne-ami__actions ${e.statut === 'gagne' ? 'positif' : 'negatif'}">
              ${e.statut === 'gagne' ? `+${esc(frags(e.net))}` : `−${esc(frags(e.mise))}`}
            </div>
          </div>`
          )
          .join('')}
      </div>
      <div class="encart" style="margin:0 14px 14px">
        Seuls les pronostics déjà résolus apparaissent ici. Ce que tes amis ont
        joué sur les matchs à venir reste caché — sinon il suffirait de recopier
        le meilleur d’entre vous.
      </div>
    </div>`;
}
