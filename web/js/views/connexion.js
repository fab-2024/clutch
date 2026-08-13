import * as api from '../api.js';
import { toast, esc } from '../ui.js';
import { MODE_DEMO } from '../config.js';
import { SOLDE_INITIAL } from '../core.js';

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

  let mode = 'inscription'; // ou 'connexion'

  // Le choix de l'équipe se fait ici parce que c'est le seul moment où on a
  // l'attention du joueur. Il reste facultatif, et se change depuis le profil.
  const equipes = await api.listerEquipes().catch(() => []);

  const dessiner = () => {
    racine.innerHTML = `
      <div style="max-width:440px;margin:40px auto">
        <h1>${mode === 'inscription' ? 'Créer mon compte' : 'Me connecter'}</h1>
        <p style="color:var(--texte-doux)">
          ${
            mode === 'inscription'
              ? `Tu démarres avec <strong style="color:var(--accent)">${SOLDE_INITIAL} Frags</strong>.
                 Aucun paiement, aucun gain réel : c'est un jeu.`
              : 'Content de te revoir.'
          }
        </p>

        <div class="carte" style="margin-top:20px">
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
                   <span class="champ__libelle">Ton équipe (facultatif)</span>
                   <select id="equipe-favorite">
                     <option value="">Je n'en ai pas</option>
                     ${equipes
                       .map((e) => `<option value="${esc(e.id)}">${esc(e.nom)} · ${esc(e.tag)}</option>`)
                       .join('')}
                   </select>
                   <span style="font-size:0.76rem;color:var(--texte-faible);margin-top:6px;display:block">
                     Elle met tes matchs en avant dans le calendrier. Aucune incidence sur les cotes.
                   </span>
                 </label>`
              : ''
          }

          <button class="btn btn--large" id="valider">
            ${mode === 'inscription' ? 'Créer mon compte et jouer' : 'Me connecter'}
          </button>

          <p style="font-size:0.85rem;color:var(--texte-doux);margin:16px 0 0;text-align:center">
            ${
              mode === 'inscription'
                ? 'Déjà un compte ? <button class="lien-bandeau" id="bascule" style="margin:0">Se connecter</button>'
                : 'Pas encore de compte ? <button class="lien-bandeau" id="bascule" style="margin:0">En créer un</button>'
            }
          </p>
        </div>

        <details style="margin-top:18px">
          <summary style="cursor:pointer;color:var(--texte-faible);font-size:0.85rem">
            Je préfère recevoir un lien par e-mail
          </summary>
          <div class="carte" style="margin-top:12px">
            <label class="champ">
              <span class="champ__libelle">Adresse e-mail</span>
              <input type="email" id="email-lien" placeholder="toi@exemple.fr" autocomplete="email" />
            </label>
            <button class="btn btn--fantome btn--large" id="envoyer-lien">Recevoir un lien</button>
            <p style="font-size:0.76rem;color:var(--texte-faible);margin:12px 0 0">
              Supabase ne laisse partir que quelques e-mails par heure. Si tu obtiens
              une erreur, passe par le mot de passe : il n'envoie rien.
            </p>
          </div>
        </details>
      </div>`;

    racine.querySelector('#bascule').addEventListener('click', () => {
      mode = mode === 'inscription' ? 'connexion' : 'inscription';
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
          // Le compte est créé mais Supabase attend une confirmation par e-mail.
          // Un toast qui disparaît en trois secondes laisse le joueur bloqué sans
          // savoir quoi faire : on affiche la marche à suivre, et elle reste à l'écran.
          ecranConfirmationAttendue(racine, email);
          return;
        }
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
  racine.innerHTML = `
    <div style="max-width:440px;margin:40px auto">
      <h1>Rejoindre la partie</h1>
      <p style="color:var(--texte-doux)">
        Tu démarres avec <strong style="color:var(--accent)">${SOLDE_INITIAL} Frags</strong>.
        Aucun paiement, aucun gain réel : c'est un jeu.
      </p>
      <div class="carte" style="margin-top:20px">
        <label class="champ">
          <span class="champ__libelle">Ton pseudo</span>
          <input type="text" id="identifiant" placeholder="Ex : NovaKill" autocomplete="nickname" />
        </label>
        <label class="champ">
          <span class="champ__libelle">Ton équipe (facultatif)</span>
          <select id="equipe-favorite">
            <option value="">Je n'en ai pas</option>
            ${equipes.map((e) => `<option value="${esc(e.id)}">${esc(e.nom)} · ${esc(e.tag)}</option>`).join('')}
          </select>
        </label>
        <button class="btn btn--large" id="ok">Commencer à jouer</button>
        <p style="font-size:0.78rem;color:var(--texte-faible);margin:14px 0 0">
          En mode démo, aucun compte n'est créé : ta progression reste dans ce navigateur.
        </p>
      </div>
    </div>`;

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

/**
 * Écran affiché quand Supabase exige une confirmation par e-mail.
 *
 * C'est presque toujours un réglage oublié, pas un incident : le service d'envoi
 * intégré de Supabase n'écrit qu'aux adresses de l'équipe du projet et n'envoie
 * que quelques messages par heure. Autant le dire franchement plutôt que de
 * laisser quelqu'un rafraîchir sa boîte mail pendant dix minutes.
 */
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
