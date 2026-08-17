import * as api from '../api.js';
import { toast, esc } from '../ui.js';
import { MODE_DEMO } from '../config.js';
import { SOLDE_INITIAL } from '../core.js';
import { lireOnboarding } from './onboarding.js';

/**
 * Page de connexion.
 *
 * Le mot de passe est la voie principale, pas le lien par e-mail : le service
 * d'envoi intégré de Supabase est plafonné à quelques messages par heure, ce
 * qui empêcherait un groupe d'amis de s'inscrire le même soir. Le lien reste
 * proposé en repli pour qui préfère ne pas retenir un mot de passe.
 */
export async function vueConnexion(racine) {
  if (await api.utilisateurCourant()) {
    location.hash = '#/matchs';
    return;
  }

  if (MODE_DEMO) return vueDemo(racine);

  const onboarding = lireOnboarding();
  let mode = localStorage.getItem('clutch:auth-intent') === 'connexion' ? 'connexion' : 'inscription';

  // Le choix de l'équipe vient désormais de l'onboarding quand il existe.
  // Le select reste présent pour pouvoir corriger ce choix avant création.
  const equipes = await api.listerEquipes().catch(() => []);

  const dessiner = () => {
    racine.innerHTML = `
      <section class="auth-v4">
        <div class="auth-v4__intro">
          <span class="sur-titre">${mode === 'inscription' ? 'DERNIÈRE ÉTAPE' : 'RETOUR DANS CLUTCH'}</span>
          <h1>${mode === 'inscription' ? 'Ton profil peut maintenant exister.' : 'Reprends ta place.'}</h1>
          <p>
            ${
              mode === 'inscription'
                ? `Ton rating démarre à <strong>${SOLDE_INITIAL} Frags</strong>. Les Frags restent un classement : rien à miser, rien à retirer.`
                : 'Content de te revoir.'
            }
          </p>
          ${mode === 'inscription' && (onboarding.jeu || onboarding.equipeNom) ? `<div class="auth-v4__resume">${onboarding.jeu ? `<span>${esc(onboarding.jeu.toUpperCase())}</span>` : ''}${onboarding.equipeNom ? `<span>${esc(onboarding.equipeNom)}</span>` : ''}</div>` : ''}
        </div>

        <div class="carte auth-v4__card">
          ${
            mode === 'inscription'
              ? `<label class="champ">
                   <span class="champ__libelle">Ton pseudo</span>
                   <input type="text" id="pseudo" placeholder="Ex : NovaKill" maxlength="20" autocomplete="nickname" />
                 </label>`
              : ''
          }
          <label class="champ">
            <span class="champ__libelle">Adresse e-mail</span>
            <input type="email" id="email" placeholder="toi@exemple.fr" autocomplete="email" />
          </label>
          <label class="champ">
            <span class="champ__libelle">Mot de passe${mode === 'inscription' ? ' (6 caractères minimum)' : ''}</span>
            <input type="password" id="motdepasse" placeholder="••••••••"
                   autocomplete="${mode === 'inscription' ? 'new-password' : 'current-password'}" />
          </label>

          ${
            mode === 'inscription' && equipes.length
              ? `<label class="champ">
                   <span class="champ__libelle">Ta faction (facultatif)</span>
                   <select id="equipe-favorite">
                     <option value="">Je choisirai plus tard</option>
                     ${equipes
                       .map((e) => `<option value="${esc(e.id)}"${String(e.id) === String(onboarding.equipeId || '') ? ' selected' : ''}>${esc(e.nom)} · ${esc(e.tag)}</option>`)
                       .join('')}
                   </select>
                   <span class="auth-v4__hint">Elle personnalise ton univers et met ses matchs en avant. Aucun impact sur le calcul des Frags.</span>
                 </label>`
              : ''
          }

          <button class="btn btn--large" id="valider">
            ${mode === 'inscription' ? 'Créer mon profil' : 'Me connecter'}
          </button>

          <p class="auth-v4__switch">
            ${
              mode === 'inscription'
                ? 'Déjà un compte ? <button class="lien-bandeau" id="bascule">Se connecter</button>'
                : 'Pas encore de compte ? <button class="lien-bandeau" id="bascule">En créer un</button>'
            }
          </p>
        </div>

        <details class="auth-v4__magic">
          <summary>Je préfère recevoir un lien par e-mail</summary>
          <div class="carte">
            <label class="champ">
              <span class="champ__libelle">Adresse e-mail</span>
              <input type="email" id="email-lien" placeholder="toi@exemple.fr" autocomplete="email" />
            </label>
            <button class="btn btn--fantome btn--large" id="envoyer-lien">Recevoir un lien</button>
            <p>Supabase ne laisse partir que quelques e-mails par heure. Si tu obtiens une erreur, passe par le mot de passe : il n'envoie rien.</p>
          </div>
        </details>
      </section>`;

    racine.querySelector('#bascule').addEventListener('click', () => {
      mode = mode === 'inscription' ? 'connexion' : 'inscription';
      localStorage.setItem('clutch:auth-intent', mode);
      dessiner();
    });

    const valider = async (bouton) => {
      const email = racine.querySelector('#email').value.trim();
      const motDePasse = racine.querySelector('#motdepasse').value;
      const pseudo = racine.querySelector('#pseudo')?.value.trim();
      const equipeFavoriteId = racine.querySelector('#equipe-favorite')?.value || null;

      if (!email || !motDePasse) return toast('Remplis les deux champs.', 'erreur');
      if (mode === 'inscription' && motDePasse.length < 6) {
        return toast('Mot de passe trop court : 6 caractères minimum.', 'erreur');
      }

      bouton.disabled = true;
      try {
        const r =
          mode === 'inscription'
            ? await api.inscription({ email, motDePasse, pseudo, equipeFavoriteId })
            : await api.connexionMotDePasse({ email, motDePasse });

        if (r?.enAttenteEmail) {
          ecranConfirmationAttendue(racine, email);
          return;
        }
        localStorage.removeItem('clutch:auth-intent');
        toast(`Bienvenue ${pseudo || email} !`, 'succes');
        location.hash = '#/matchs';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (e) {
        toast(e.message, 'erreur');
        bouton.disabled = false;
      }
    };

    const bouton = racine.querySelector('#valider');
    bouton.addEventListener('click', () => valider(bouton));
    racine.querySelectorAll('#email, #motdepasse, #pseudo').forEach((champ) =>
      champ.addEventListener('keydown', (e) => e.key === 'Enter' && valider(bouton))
    );

    racine.querySelector('#envoyer-lien').addEventListener('click', async (e) => {
      const email = racine.querySelector('#email-lien').value.trim();
      if (!email) return toast('Saisis ton adresse.', 'erreur');
      e.currentTarget.disabled = true;
      try {
        await api.connexion(email);
        toast('Lien envoyé, regarde ta boîte mail (et les indésirables).', 'succes');
      } catch (err) {
        toast(err.message, 'erreur');
      }
      e.currentTarget.disabled = false;
    });

    racine.querySelector(mode === 'inscription' ? '#pseudo' : '#email').focus();
  };

  dessiner();
}

/** En mode démo, aucun compte n'existe : un pseudo suffit. */
async function vueDemo(racine) {
  const equipes = await api.listerEquipes().catch(() => []);
  const onboarding = lireOnboarding();
  racine.innerHTML = `
    <section class="auth-v4">
      <div class="auth-v4__intro"><span class="sur-titre">MODE DÉMO</span><h1>Rejoindre la partie</h1><p>Ton rating démarre à <strong>${SOLDE_INITIAL} Frags</strong>. Aucun paiement, aucun gain réel : c'est un jeu.</p></div>
      <div class="carte auth-v4__card">
        <label class="champ">
          <span class="champ__libelle">Ton pseudo</span>
          <input type="text" id="identifiant" placeholder="Ex : NovaKill" autocomplete="nickname" />
        </label>
        <label class="champ">
          <span class="champ__libelle">Ta faction (facultatif)</span>
          <select id="equipe-favorite">
            <option value="">Je choisirai plus tard</option>
            ${equipes.map((e) => `<option value="${esc(e.id)}"${String(e.id) === String(onboarding.equipeId || '') ? ' selected' : ''}>${esc(e.nom)} · ${esc(e.tag)}</option>`).join('')}
          </select>
        </label>
        <button class="btn btn--large" id="ok">Commencer à jouer</button>
        <p class="auth-v4__hint">En mode démo, aucun compte n'est créé : ta progression reste dans ce navigateur.</p>
      </div>
    </section>`;

  const champ = racine.querySelector('#identifiant');
  champ.focus();
  const valider = async () => {
    const valeur = champ.value.trim();
    if (!valeur) return toast('Choisis un pseudo.', 'erreur');
    await api.inscription({
      email: valeur,
      motDePasse: '',
      pseudo: valeur,
      equipeFavoriteId: racine.querySelector('#equipe-favorite')?.value || null,
    });
    toast(`Bienvenue ${valeur} !`, 'succes');
    location.hash = '#/matchs';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  racine.querySelector('#ok').addEventListener('click', valider);
  champ.addEventListener('keydown', (e) => e.key === 'Enter' && valider());
}

/** Écran affiché quand Supabase exige une confirmation par e-mail. */
function ecranConfirmationAttendue(racine, email) {
  racine.innerHTML = `
    <div style="max-width:560px;margin:40px auto">
      <h1>Ton compte est créé</h1>
      <p style="color:var(--texte-doux)">
        Mais Supabase attend une confirmation par e-mail avant de te laisser entrer,
        et ce message n'arrivera probablement jamais.
      </p>

      <div class="encart encart--alerte" style="margin-bottom:18px">
        Le service d'envoi intégré de Supabase n'écrit <strong>qu'aux adresses de l'équipe
        du projet</strong>, et seulement quelques messages par heure. Sur un projet gratuit,
        c'est la cause numéro un des inscriptions bloquées.
      </div>

      <div class="carte">
        <h3>La correction, côté Supabase</h3>
        <ol style="color:var(--texte-doux);padding-left:20px;margin:12px 0">
          <li>Ouvre ton projet sur <strong>supabase.com</strong></li>
          <li><strong>Authentication</strong> → <strong>Sign In / Providers</strong> → <strong>Email</strong></li>
          <li>Désactive <strong>« Confirm email »</strong>, puis enregistre</li>
          <li><strong>Authentication</strong> → <strong>Users</strong> → sur la ligne
              <code>${esc(email)}</code>, menu <strong>…</strong> →
              <strong>Confirm email</strong> (les comptes déjà créés restent non confirmés
              même après avoir désactivé le réglage)</li>
        </ol>
        <p style="color:var(--texte-faible);font-size:0.84rem;margin:0">
          Une fois ces deux points faits, l'inscription ouvre la session immédiatement,
          sans le moindre e-mail.
        </p>
      </div>

      <div style="display:flex;gap:10px;margin-top:16px">
        <a class="btn btn--fantome" href="#/connexion" onclick="location.reload()">Réessayer</a>
        <a class="btn btn--fantome" href="#/diagnostic">Lancer le diagnostic</a>
      </div>
    </div>`;
}
