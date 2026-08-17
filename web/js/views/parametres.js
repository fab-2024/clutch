/**
 * Les paramètres.
 *
 * L'équipe préférée est désormais une faction : le choix a une conséquence
 * communautaire, il mérite donc un aperçu et une confirmation explicite.
 */

import * as api from '../api.js';
import { contexte, majSolde } from '../app.js';
import { esc, toast, vide, ecusson, nomJeu } from '../ui.js';
import { PARI_AUTO_MISE_MIN, PARI_AUTO_MISE_MAX } from '../core.js';
import {
  teinteFaction,
  cooldownFaction,
  COOLDOWN_FACTION_JOURS,
} from '../community-progression.js';

export async function vueParametres(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = `
      ${entete()}
      ${carteSaison()}
      ${vide(
        'Pas encore de compte',
        'Les réglages arrivent avec le compte : faction, prono par défaut, notifications.',
        '<a class="btn" href="#/connexion">Créer mon compte</a>'
      )}`;
    brancherSaison(racine);
    return;
  }

  const equipes = await api.listerEquipes();
  const favorite = contexte.utilisateur.equipe_favorite;
  const modeAuto = contexte.utilisateur.pari_auto_mode ?? 'off';
  const cooldown = cooldownFaction(contexte.utilisateur.equipe_favorite_changee_le);
  const choixInitial = favorite ?? equipes[0] ?? null;

  racine.innerHTML = `
    ${entete()}

    ${carteFaction(equipes, favorite, choixInitial, cooldown)}

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
              <option value="favori"${modeAuto === 'favori' ? ' selected' : ''}>Sur les matchs de ma faction seulement</option>
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
                 Ce mode ne fera rien tant que tu n’auras pas rejoint une faction ci-dessus.
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

  brancherFaction(racine, equipes, favorite, cooldown);
  brancherSaison(racine);

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

function carteFaction(equipes, favorite, choixInitial, cooldown) {
  const indisponible = Boolean(favorite && cooldown.actif);
  return `
    <div class="bloc faction-settings">
      <div class="bloc__titre">
        <span>Ma faction</span>
        ${favorite ? `<span>${esc(favorite.tag)}</span>` : '<span>À choisir</span>'}
      </div>
      <div class="bloc__corps">
        <div class="faction-settings__intro">
          <div>
            <h2>${favorite ? 'Ton camp dans Clutch' : 'Choisis ton camp'}</h2>
            <p>
              Ton équipe favorite alimente un réacteur collectif. Les supporters font muter la relique,
              débloquent des récompenses de faction et déterminent ta place dans la guerre communautaire.
            </p>
          </div>
          ${favorite ? '<a href="#/communaute">Voir ma faction →</a>' : ''}
        </div>

        <div class="faction-settings__choix">
          <label class="champ" style="margin:0">
            <span class="champ__libelle">Faction</span>
            <select id="equipe-favorite">
              ${equipes.map((e) =>
                `<option value="${esc(e.id)}"${e.id === choixInitial?.id ? ' selected' : ''}>${esc(e.nom)} · ${esc(e.tag)} · ${esc(nomJeu(e.jeu))}</option>`
              ).join('')}
            </select>
          </label>

          <div id="faction-apercu">${apercuFaction(choixInitial, favorite)}</div>

          ${indisponible ? `
            <div class="faction-settings__cooldown">
              <span>VERROU DE FACTION</span>
              <strong>Nouveau changement disponible le ${esc(dateComplete(cooldown.disponibleLe))}</strong>
              <p>Le cooldown de ${COOLDOWN_FACTION_JOURS} jours évite les switches opportunistes pendant une guerre de factions.</p>
            </div>` : ''}

          <button class="btn" id="preparer-faction" type="button"${indisponible ? ' disabled' : ''}>
            ${favorite ? 'Préparer le changement' : 'Rejoindre cette faction'}
          </button>
        </div>

        <div class="faction-confirmation" id="faction-confirmation" hidden></div>
      </div>
    </div>`;
}

function apercuFaction(equipe, favorite) {
  if (!equipe) return '';
  const hue = teinteFaction(equipe.tag, equipe.nom);
  const estActuelle = favorite?.id === equipe.id;
  return `
    <article class="faction-preview${estActuelle ? ' faction-preview--actuelle' : ''}" style="--team-hue:${hue}">
      <div class="faction-preview__energie" aria-hidden="true"></div>
      ${ecusson(equipe.tag, equipe.nom, 'm')}
      <div class="faction-preview__texte">
        <span>${estActuelle ? 'FACTION ACTUELLE' : 'APERÇU DE FACTION'}</span>
        <strong>${esc(equipe.nom)}</strong>
        <small>${esc(nomJeu(equipe.jeu))} · énergie ${esc(equipe.tag)}</small>
      </div>
      <i aria-hidden="true">${esc(equipe.tag)}</i>
    </article>`;
}

function confirmationFaction(cible, favorite) {
  if (!cible) return '';
  const premierChoix = !favorite;
  return `
    <div class="faction-confirmation__interieur" style="--team-hue:${teinteFaction(cible.tag, cible.nom)}">
      <span>${premierChoix ? 'REJOINDRE UNE FACTION' : 'CONFIRMER LE TRANSFERT'}</span>
      <h3>${premierChoix ? `Rejoindre ${esc(cible.nom)} ?` : `${esc(favorite.nom)} → ${esc(cible.nom)}`}</h3>
      <ul>
        <li>Ta présence et tes prochains pronos compteront pour <strong>${esc(cible.tag)}</strong>.</li>
        <li>Les mutations auxquelles tu as déjà participé restent dans l’histoire de ton profil.</li>
        <li>Tu recevras les prochaines récompenses uniquement si tu es présent dans la faction au moment du seuil.</li>
        <li>Après ce choix, un nouveau changement sera bloqué pendant <strong>${COOLDOWN_FACTION_JOURS} jours</strong>.</li>
      </ul>
      <div class="faction-confirmation__actions">
        <button class="btn" id="confirmer-faction" type="button">${premierChoix ? 'Rejoindre la faction' : 'Confirmer le changement'}</button>
        <button class="btn btn--fantome" id="annuler-faction" type="button">Annuler</button>
      </div>
    </div>`;
}

function brancherFaction(racine, equipes, favorite, cooldown) {
  const select = racine.querySelector('#equipe-favorite');
  const apercu = racine.querySelector('#faction-apercu');
  const preparer = racine.querySelector('#preparer-faction');
  const confirmation = racine.querySelector('#faction-confirmation');
  if (!select || !apercu || !preparer || !confirmation) return;

  const trouver = (id) => equipes.find((e) => e.id === id) ?? null;

  const rafraichir = () => {
    const cible = trouver(select.value);
    apercu.innerHTML = apercuFaction(cible, favorite);
    confirmation.hidden = true;
    confirmation.innerHTML = '';

    const identique = Boolean(favorite && cible?.id === favorite.id);
    const verrouille = Boolean(favorite && cooldown.actif && !identique);
    preparer.disabled = identique || verrouille;
    preparer.textContent = identique
      ? 'Faction actuelle'
      : favorite
        ? 'Préparer le changement'
        : 'Rejoindre cette faction';
  };

  select.addEventListener('change', rafraichir);

  preparer.addEventListener('click', () => {
    const cible = trouver(select.value);
    if (!cible || favorite?.id === cible.id) return;
    confirmation.innerHTML = confirmationFaction(cible, favorite);
    confirmation.hidden = false;
    confirmation.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });

    confirmation.querySelector('#annuler-faction')?.addEventListener('click', () => {
      confirmation.hidden = true;
      confirmation.innerHTML = '';
    });

    confirmation.querySelector('#confirmer-faction')?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        await api.definirEquipeFavorite(cible.id);
        toast(`Faction rejointe : ${cible.nom}.`, 'succes');
        await majSolde();
        location.hash = '#/communaute';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        toast(messageFaction(err), 'erreur');
        e.currentTarget.disabled = false;
      }
    });
  });

  rafraichir();
}

function messageFaction(err) {
  const msg = String(err?.message || 'Impossible de changer de faction.');
  const match = msg.match(/Changement de faction bloqué[^)]*/i);
  return match?.[0] ?? msg;
}

function dateComplete(date) {
  if (!date) return '—';
  return date.toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
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
