import { contexte } from './app.js';
import { preferencesParametres, sauverPreferencesParametres } from './settings-prefs.js';

const PRESETS_NOTIFICATIONS = {
  essentiel: {
    matchSoon: false,
    live: false,
    result: true,
    rewards: true,
    league: false,
    community: false,
  },
  normal: {
    matchSoon: true,
    live: false,
    result: true,
    rewards: true,
    league: true,
    community: true,
  },
  tout: {
    matchSoon: true,
    live: true,
    result: true,
    rewards: true,
    league: true,
    community: true,
  },
};

function rafraichirInterrupteurs(racine, prefs) {
  racine.querySelectorAll('[data-pref-path^="notifications."]').forEach((bouton) => {
    const cle = bouton.dataset.prefPath.split('.')[1];
    const actif = Boolean(prefs.notifications?.[cle]);
    bouton.classList.toggle('is-on', actif);
    bouton.setAttribute('aria-checked', actif ? 'true' : 'false');
  });
}

function marquerSauvegarde(racine) {
  const statut = racine.querySelector('#settings-save-status');
  if (!statut) return;
  statut.classList.add('is-saving');
  const texte = statut.querySelector('span');
  if (texte) texte.textContent = 'Enregistré';
  setTimeout(() => {
    statut.classList.remove('is-saving');
    if (texte) texte.textContent = 'À jour';
  }, 1200);
}

document.addEventListener('click', (event) => {
  const bouton = event.target.closest('[data-notif-mode]');
  if (!bouton || !contexte.utilisateur) return;

  const mode = bouton.dataset.notifMode;
  const preset = PRESETS_NOTIFICATIONS[mode];
  if (!preset) return;

  const prefs = preferencesParametres(contexte.utilisateur);
  prefs.notifications = {
    ...prefs.notifications,
    ...preset,
    mode,
  };
  sauverPreferencesParametres(contexte.utilisateur, prefs);

  const segment = bouton.closest('[data-segment-path]');
  segment?.querySelectorAll('button').forEach((item) => {
    item.classList.toggle('is-active', item === bouton);
  });

  const racine = bouton.closest('[data-settings-root]') || document;
  rafraichirInterrupteurs(racine, prefs);
  marquerSauvegarde(racine);
});
