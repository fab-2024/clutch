import * as api from '../api.js';
import { toast } from '../ui.js';
import { MODE_DEMO } from '../config.js';
import { SOLDE_INITIAL } from '../core.js';

export async function vueConnexion(racine) {
  const u = await api.utilisateurCourant();
  if (u) {
    location.hash = '#/matchs';
    return;
  }

  racine.innerHTML = `
    <div style="max-width:440px;margin:40px auto">
      <h1>Rejoindre la partie</h1>
      <p style="color:var(--texte-doux)">
        Tu démarres avec <strong style="color:var(--accent)">${SOLDE_INITIAL} Frags</strong>.
        Aucun paiement, aucun gain réel : c'est un jeu.
      </p>
      <div class="carte" style="margin-top:20px">
        <label class="champ">
          <span class="champ__libelle">${MODE_DEMO ? 'Ton pseudo' : 'Ton adresse e-mail'}</span>
          <input type="${MODE_DEMO ? 'text' : 'email'}" id="identifiant"
                 placeholder="${MODE_DEMO ? 'Ex : NovaKill' : 'toi@exemple.fr'}" autocomplete="${MODE_DEMO ? 'nickname' : 'email'}" />
        </label>
        <button class="btn btn--large" id="ok">
          ${MODE_DEMO ? 'Commencer à jouer' : 'Recevoir mon lien de connexion'}
        </button>
        ${
          MODE_DEMO
            ? `<p style="font-size:0.78rem;color:var(--texte-faible);margin:14px 0 0">
                 En mode démo, aucun compte n'est créé : ta progression reste dans ce navigateur.
               </p>`
            : `<p style="font-size:0.78rem;color:var(--texte-faible);margin:14px 0 0">
                 On t'envoie un lien de connexion, pas de mot de passe à retenir.
               </p>`
        }
      </div>
    </div>`;

  const champ = racine.querySelector('#identifiant');
  champ.focus();

  const valider = async () => {
    const valeur = champ.value.trim();
    if (!valeur) return toast('Remplis le champ.', 'erreur');
    try {
      const r = await api.connexion(valeur);
      if (r?.enAttenteEmail) {
        toast('Lien envoyé, regarde ta boîte mail (et les indésirables).', 'succes');
        racine.querySelector('.carte').insertAdjacentHTML(
          'beforeend',
          `<div class="encart" style="margin-top:16px">
             Un lien vient de partir vers <strong>${valeur.replace(/[<>&]/g, '')}</strong>.
             Clique dessus depuis <strong>ce navigateur</strong> : il te ramènera ici, connecté.
           </div>`
        );
        return;
      }
      toast(`Bienvenue ${valeur} !`, 'succes');
      location.hash = '#/matchs';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (e) {
      toast(e.message, 'erreur');
    }
  };

  racine.querySelector('#ok').addEventListener('click', valider);
  champ.addEventListener('keydown', (e) => e.key === 'Enter' && valider());
}
