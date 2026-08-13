/**
 * Les paramètres.
 *
 * Tout ce qui se règle une fois et ne se regarde plus : l'équipe préférée, le
 * prono par défaut, la saison consultée, la déconnexion. Ces réglages
 * occupaient le milieu du profil, entre les statistiques et l'historique, là
 * où on vient pour tout autre chose.
 */

import * as api from '../api.js';
import { contexte, majSolde } from '../app.js';
import { esc, toast, vide } from '../ui.js';
import { PARI_AUTO_MISE_MIN, PARI_AUTO_MISE_MAX } from '../core.js';

export async function vueParametres(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = `
      ${entete()}
      ${carteSaison()}
      ${vide(
        'Pas encore de compte',
        'Les réglages arrivent avec le compte : équipe préférée, prono par défaut, notifications.',
        '<a class="btn" href="#/connexion">Créer mon compte</a>'
      )}`;
    brancherSaison(racine);
    return;
  }

  const equipes = await api.listerEquipes();
  const favorite = contexte.utilisateur.equipe_favorite;
  const modeAuto = contexte.utilisateur.pari_auto_mode ?? 'off';

  racine.innerHTML = `
    ${entete()}

    <div class="bloc">
      <div class="bloc__titre"><span>Mon équipe</span>${
        favorite ? `<span>${esc(favorite.tag)}</span>` : '<span>aucune</span>'
      }</div>
      <div class="bloc__corps">
        <p style="color:var(--texte-doux)">
          Elle met tes matchs en avant dans le calendrier, affiche tes couleurs au
          classement, et te fait rejoindre sa communauté. Elle ne change rien aux
          cotes : personne ne te fera de cadeau.
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
          <label class="champ" style="flex:1;min-width:220px;margin:0">
            <span class="champ__libelle">Équipe préférée</span>
            <select id="equipe-favorite">
              <option value="">Aucune</option>
              ${equipes
                .map(
                  (e) =>
                    `<option value="${esc(e.id)}"${e.id === favorite?.id ? ' selected' : ''}>${esc(e.nom)} · ${esc(e.tag)}</option>`
                )
                .join('')}
            </select>
          </label>
          <button class="btn btn--fantome" id="enregistrer-equipe">Enregistrer</button>
        </div>
      </div>
    </div>

    <div class="bloc">
      <div class="bloc__titre"><span>Le prono par défaut</span></div>
      <div class="bloc__corps">
        <p style="color:var(--texte-doux)">
          Si tu n’as rien saisi à l’heure du coup d’envoi, Clutch mise pour toi sur le
          favori. Ce n’est pas une stratégie — le favori perd lentement à cause de la
          marge — c’est un filet : rater une soirée ne doit pas te sortir du classement.
        </p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">
          <label class="champ" style="flex:2;min-width:240px;margin:0">
            <span class="champ__libelle">Quand ?</span>
            <select id="auto-mode">
              <option value="off"${modeAuto === 'off' ? ' selected' : ''}>Jamais — je gère mes paris</option>
              <option value="favori"${modeAuto === 'favori' ? ' selected' : ''}>Sur les matchs de mon équipe seulement</option>
              <option value="tous"${modeAuto === 'tous' ? ' selected' : ''}>Sur tous les matchs de la saison</option>
            </select>
          </label>
          <label class="champ" style="flex:1;min-width:140px;margin:0">
            <span class="champ__libelle">Mise (Frags)</span>
            <input type="number" id="auto-mise" min="${PARI_AUTO_MISE_MIN}" max="${PARI_AUTO_MISE_MAX}" step="10"
                   value="${contexte.utilisateur.pari_auto_mise ?? 100}" />
          </label>
          <button class="btn btn--fantome" id="enregistrer-auto">Enregistrer</button>
        </div>
        ${
          modeAuto === 'favori' && !favorite
            ? `<div class="encart encart--alerte" style="margin-top:12px">
                 Ce mode ne fera rien tant que tu n’auras pas choisi d’équipe préférée ci-dessus.
               </div>`
            : ''
        }
      </div>
    </div>

    ${carteSaison()}

    <div class="bloc">
      <div class="bloc__titre"><span>Mon compte</span><span>${esc(contexte.utilisateur.email ?? '')}</span></div>
      <div class="bloc__corps">
        <p style="color:var(--texte-faible);font-size:0.86rem">
          Inscrit le ${esc(new Date(contexte.utilisateur.cree_le).toLocaleDateString('fr-FR'))}.
          ${contexte.admin ? '<a href="#/admin">Espace administration</a> · ' : ''}
          <a href="#/diagnostic">Diagnostic technique</a>
        </p>
        <button class="btn btn--danger" id="quitter">Se déconnecter</button>
      </div>
    </div>`;

  brancherSaison(racine);

  racine.querySelector('#enregistrer-equipe').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await api.definirEquipeFavorite(racine.querySelector('#equipe-favorite').value || null);
      toast('Équipe enregistrée.', 'succes');
      await majSolde();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
      e.currentTarget.disabled = false;
    }
  });

  racine.querySelector('#enregistrer-auto').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await api.definirPariAuto({
        mode: racine.querySelector('#auto-mode').value,
        mise: Number(racine.querySelector('#auto-mise').value),
      });
      toast('Prono par défaut enregistré.', 'succes');
      await majSolde();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
      e.currentTarget.disabled = false;
    }
  });

  racine.querySelector('#quitter').addEventListener('click', async () => {
    await api.deconnexion();
    location.hash = '#/matchs';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

function entete() {
  return `
    <div class="entete-page">
      <h1>Paramètres</h1>
      <p>Ce qui se règle une fois et se garde.</p>
    </div>`;
}

/** Le sélecteur de saison : il vivait dans l'en-tête, sur toutes les pages. */
function carteSaison() {
  if (!contexte.saisons?.length) return '';
  return `
    <div class="bloc">
      <div class="bloc__titre"><span>Saison consultée</span><span>${esc(contexte.saison?.nom ?? '')}</span></div>
      <div class="bloc__corps">
        <p style="color:var(--texte-doux)">
          Chaque saison a son propre solde et son propre classement : tout le monde
          repart au même niveau à l’ouverture. Tu peux revenir consulter les
          saisons passées, sans pouvoir y miser.
        </p>
        <label class="champ" style="margin:0;max-width:340px">
          <span class="champ__libelle">Saison</span>
          <select id="selecteur-saison">
            ${contexte.saisons
              .map(
                (s) =>
                  `<option value="${esc(s.id)}"${s.id === contexte.saison?.id ? ' selected' : ''}>${esc(s.nom)}${
                    s.statut === 'terminee' ? ' (terminée)' : s.statut === 'a_venir' ? ' (à venir)' : ''
                  }</option>`
              )
              .join('')}
          </select>
        </label>
      </div>
    </div>`;
}

function brancherSaison(racine) {
  racine.querySelector('#selecteur-saison')?.addEventListener('change', async (e) => {
    await api.choisirSaison(e.target.value);
    toast('Saison changée.', 'succes');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}
