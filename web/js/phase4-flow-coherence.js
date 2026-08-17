const KEY = 'clutch:onboarding:v1';

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
      const current = readOnboarding();
      writeOnboarding({ ...current, termine: true });
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

function sync() {
  requestAnimationFrame(() => {
    syncOnboardingProgress();
    syncAuthStep();
  });
}

window.addEventListener('hashchange', sync);
window.addEventListener('DOMContentLoaded', sync);

const root = document.getElementById('contenu');
if (root) {
  new MutationObserver(sync).observe(root, { childList: true, subtree: true });
}

sync();
