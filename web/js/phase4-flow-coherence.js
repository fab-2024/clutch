import { BASE } from './api.js';
import { SUPABASE_ANON_KEY, MODE_DEMO } from './config.js';

const KEY = 'clutch:onboarding:v1';
const SESSION_KEY = 'clutch.session';
const SYNC_KEY = 'clutch:onboarding:jeux-sync-v1';
const JEUX_VALIDES = new Set(['lol', 'cs2', 'valorant']);

function readOnboarding() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    const jeux = Array.isArray(raw.jeux) ? raw.jeux : (raw.jeu ? [raw.jeu] : []);
    return { ...raw, jeux };
  } catch {
    return { jeux: [], equipeNom: '', equipeId: '', termine: false };
  }
}

function writeOnboarding(next) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

function signupRouteActive() {
  const hash = location.hash || '#/accueil';
  return hash === '#/connexion' && localStorage.getItem('clutch:auth-intent') !== 'connexion';
}

function syncOnboardingProgress() {
  const screen = document.querySelector('.onboarding-v5');
  if (!screen) return;

  const progress = screen.querySelector('.onboarding-v5__progress');
  if (!progress) return;

  while (progress.querySelectorAll('i').length < 3) {
    progress.append(document.createElement('i'));
  }

  const step = screen.classList.contains('onboarding-v5--teams') ? 2 : 1;
  progress.querySelectorAll('i').forEach((segment, index) => {
    segment.classList.toggle('actif', index < step);
  });
  progress.setAttribute('aria-label', `Étape ${step} sur 3`);

  // Phase 4.1 : l'abandon sans compte n'est proposé qu'à l'étape 3.
  if (step === 2) screen.querySelector('[data-explore]')?.remove();
}

function buildFlowTop() {
  const top = document.createElement('div');
  top.className = 'auth-v4__flow-top';
  top.innerHTML = `
    <a class="auth-v4__flow-brand" href="#/accueil" aria-label="Clutch">
      <img src="assets/logo.svg" alt="" aria-hidden="true">
      <strong>CLUTCH<span>.</span></strong>
    </a>
    <div class="auth-v4__flow-progress" aria-label="Étape 3 sur 3">
      <i class="actif"></i><i class="actif"></i><i class="actif"></i>
    </div>
    <button class="auth-v4__flow-login" type="button" data-auth-login-direct>Se connecter</button>`;
  return top;
}

function syncAuthStep() {
  const signup = signupRouteActive();
  document.body.classList.toggle('phase4-auth-onboarding', signup);
  if (!signup) return;

  // Phase 4.1 : atteindre le formulaire n'est pas "terminer" l'onboarding.
  // Le routeur historique a besoin du flag pendant la transition depuis l'étape 2 ;
  // on le remet immédiatement à false une fois l'étape 3 réellement affichée.
  const current = readOnboarding();
  if (current.termine) writeOnboarding({ ...current, termine: false });

  const auth = document.querySelector('.auth-v4');
  if (!auth) return;
  auth.classList.add('auth-v4--onboarding-step');

  if (!auth.querySelector('.auth-v4__flow-top')) {
    auth.prepend(buildFlowTop());
  }

  const intro = auth.querySelector('.auth-v4__intro');
  const overline = intro?.querySelector('.sur-titre');
  if (overline) overline.textContent = '03 // TON PROFIL';

  // Les choix des étapes 1/2 restent uniquement des données : aucun récap visuel ici.
  auth.querySelector('.auth-v4__resume')?.remove();
  auth.querySelector('.auth-v4__locked-faction')?.remove();

  // On conserve la valeur pré-sélectionnée pour l'inscription, sans redemander le choix.
  const select = auth.querySelector('#equipe-favorite');
  select?.closest('.champ')?.classList.add('auth-v4__source-faction');

  const validate = auth.querySelector('#valider');
  if (validate && !auth.querySelector('#continuer-sans-inscription')) {
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.id = 'continuer-sans-inscription';
    skip.className = 'auth-v4__skip';
    skip.innerHTML = '<span>Continuer sans inscription</span><b>→</b>';
    validate.after(skip);
    skip.addEventListener('click', () => {
      const currentState = readOnboarding();
      writeOnboarding({ ...currentState, termine: true });
      localStorage.removeItem('clutch:auth-intent');
      location.hash = '#/accueil';
    });
  }

  const directLogin = auth.querySelector('[data-auth-login-direct]');
  if (directLogin && directLogin.dataset.bound !== '1') {
    directLogin.dataset.bound = '1';
    directLogin.addEventListener('click', () => {
      localStorage.setItem('clutch:auth-intent', 'connexion');
      location.hash = '#/connexion-login';
    });
  }
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

function normaliserJeux(jeux) {
  return [...new Set((Array.isArray(jeux) ? jeux : [])
    .map((jeu) => String(jeu || '').toLowerCase())
    .filter((jeu) => JEUX_VALIDES.has(jeu)))].sort();
}

async function persistJeuxSuivis() {
  if (MODE_DEMO) return;
  const onboarding = readOnboarding();
  if (!onboarding.termine) return;

  const jeux = normaliserJeux(onboarding.jeux);
  if (!jeux.length) return;

  const session = readSession();
  if (!session?.access_token) return;

  const signature = `${session.access_token.slice(-20)}:${jeux.join(',')}`;
  if (localStorage.getItem(SYNC_KEY) === signature) return;

  try {
    const response = await fetch(`${BASE}/rest/v1/rpc/clutch_definir_jeux_suivis`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_jeux: jeux }),
    });
    if (!response.ok) throw new Error(await response.text());
    localStorage.setItem(SYNC_KEY, signature);
  } catch (error) {
    // La préférence améliore le feed mais ne doit jamais bloquer l'accès à Clutch.
    console.warn('[Clutch] jeux suivis non persistés', error);
  }
}

function sync() {
  requestAnimationFrame(() => {
    syncOnboardingProgress();
    syncAuthStep();
    void persistJeuxSuivis();
  });
}

// Le vieux handler de l'étape 2 marque `termine=true` pour franchir le garde-fou
// du routeur. On le laisse passer uniquement comme flag de transition ; syncAuthStep
// le remet à false dès l'affichage de l'étape 3. Cela garantit qu'un onglet fermé
// sur le formulaire ne compte plus comme onboarding terminé.
window.addEventListener('hashchange', sync);
window.addEventListener('DOMContentLoaded', sync);

const root = document.getElementById('contenu');
if (root) {
  new MutationObserver(sync).observe(root, { childList: true, subtree: true });
}

sync();
