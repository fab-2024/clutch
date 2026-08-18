import { contexte } from './app.js';
import { vueProfilPublic } from './views/profil-public.js';
import { urlProfilPublic } from './public-profile-api.js';
import { toast } from './ui.js';

const ROUTE_PUBLIC = /^#\/u\/([^/?#]+)$/i;
let generation = 0;

function chargerStyles() {
  if (document.querySelector('link[data-phase12-profile-css]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'styles/pages/phase12-public-profile.css';
  link.dataset.phase12ProfileCss = '1';
  document.head.appendChild(link);
}

function pseudoRoute() {
  const m = String(location.hash || '').match(ROUTE_PUBLIC);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); }
  catch { return m[1]; }
}

async function rendreRoutePublique() {
  const pseudo = pseudoRoute();
  if (!pseudo) return;
  const token = ++generation;
  chargerStyles();
  // L'app principale ne connaît volontairement pas cette route : on laisse son
  // rendu de fallback terminer, puis on remplace uniquement le contenu.
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (token !== generation || pseudo !== pseudoRoute()) return;
  const racine = document.getElementById('contenu');
  if (!racine) return;
  document.body.dataset.screen = 'social';
  await vueProfilPublic(racine, pseudo);
}

function injecterPartageProfilPrive() {
  if (location.hash !== '#/profil' || !contexte.utilisateur?.pseudo) return;
  const profil = document.querySelector('.profil-v2');
  if (!profil || profil.querySelector('[data-phase12-self-public]')) return;
  chargerStyles();

  const bar = document.createElement('div');
  bar.className = 'phase12-self-public';
  bar.dataset.phase12SelfPublic = '1';
  bar.innerHTML = `<div><small>PROFIL PUBLIC</small><strong>Ton identité Clutch est partageable.</strong><span>/u/${escapeHtml(contexte.utilisateur.pseudo)}</span></div><div><a href="#/u/${encodeURIComponent(contexte.utilisateur.pseudo)}">Voir mon profil</a><button type="button" data-phase12-copy-self>Copier le lien</button></div>`;
  profil.insertAdjacentElement('afterbegin', bar);
}

async function copierMonProfil() {
  if (!contexte.utilisateur?.pseudo) return;
  const url = urlProfilPublic(contexte.utilisateur.pseudo);
  try {
    await navigator.clipboard.writeText(url);
    toast('Lien de ton profil copié.', 'succes');
  } catch {
    window.prompt('Copie ce lien :', url);
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function synchroniser() {
  if (pseudoRoute()) void rendreRoutePublique();
  else setTimeout(injecterPartageProfilPrive, 20);
}

document.addEventListener('click', (event) => {
  if (event.target.closest?.('[data-phase12-copy-self]')) void copierMonProfil();
});
window.addEventListener('hashchange', synchroniser);
new MutationObserver(() => {
  if (pseudoRoute()) {
    const root = document.getElementById('contenu');
    if (root && !root.querySelector('.phase12-profile,.phase12-not-found,.phase12-loading')) void rendreRoutePublique();
  } else injecterPartageProfilPrive();
}).observe(document.body, { childList: true, subtree: true });

chargerStyles();
synchroniser();
