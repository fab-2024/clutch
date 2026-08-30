const CLE_VISUELLE = 'clutch.settings.visual.v2';
const PREFIXE_UTILISATEUR = 'clutch.settings.v2.';

export const PARAMETRES_PAR_DEFAUT = Object.freeze({
  notifications: {
    mode: 'normal',
    matchSoon: true,
    live: true,
    result: true,
    rewards: true,
    league: true,
    community: true,
  },
  experience: {
    games: ['lol', 'rocket_league', 'valorant'],
    motion: 'full',
    sound: 65,
    rewardSound: true,
  },
  privacy: {
    profile: 'public',
    predictions: 'friends',
    room: 'friends',
    activity: 'friends',
    online: true,
  },
  accessibility: {
    reduceMotion: false,
    reduceFlashes: false,
    contrast: false,
    textScale: '100',
  },
  personalization: {
    home: true,
    marketing: false,
  },
});

function copieDefaut() {
  return JSON.parse(JSON.stringify(PARAMETRES_PAR_DEFAUT));
}

function fusionner(base, source) {
  if (!source || typeof source !== 'object') return base;
  for (const [cle, valeur] of Object.entries(source)) {
    if (Array.isArray(valeur)) base[cle] = [...valeur];
    else if (valeur && typeof valeur === 'object') {
      base[cle] = fusionner(
        base[cle] && typeof base[cle] === 'object' && !Array.isArray(base[cle]) ? base[cle] : {},
        valeur
      );
    } else base[cle] = valeur;
  }
  return base;
}

function lireJSON(cle) {
  try {
    return JSON.parse(localStorage.getItem(cle) || 'null');
  } catch {
    return null;
  }
}

function ecrireJSON(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // Les préférences ne doivent jamais bloquer l'application.
  }
}

function cleUtilisateur(utilisateur) {
  return `${PREFIXE_UTILISATEUR}${utilisateur?.id || 'invite'}`;
}

export function preferencesParametres(utilisateur) {
  return fusionner(copieDefaut(), lireJSON(cleUtilisateur(utilisateur)) || {});
}

export function sauverPreferencesParametres(utilisateur, preferences) {
  const propres = fusionner(copieDefaut(), preferences || {});
  ecrireJSON(cleUtilisateur(utilisateur), propres);
  ecrireJSON(CLE_VISUELLE, {
    motion: propres.experience.motion,
    reduceMotion: propres.accessibility.reduceMotion,
    reduceFlashes: propres.accessibility.reduceFlashes,
    contrast: propres.accessibility.contrast,
    textScale: propres.accessibility.textScale,
  });
  appliquerPreferencesVisuelles(propres);
  return propres;
}

export function reinitialiserPreferencesParametres(utilisateur) {
  try { localStorage.removeItem(cleUtilisateur(utilisateur)); } catch { /* rien */ }
  const propres = copieDefaut();
  sauverPreferencesParametres(utilisateur, propres);
  return propres;
}

export function appliquerPreferencesVisuelles(preferences) {
  const visuel = preferences?.accessibility
    ? {
        motion: preferences.experience?.motion || 'full',
        reduceMotion: Boolean(preferences.accessibility.reduceMotion),
        reduceFlashes: Boolean(preferences.accessibility.reduceFlashes),
        contrast: Boolean(preferences.accessibility.contrast),
        textScale: String(preferences.accessibility.textScale || '100'),
      }
    : preferences || {};

  const html = document.documentElement;
  const mouvement = visuel.reduceMotion ? 'reduced' : (visuel.motion || 'full');
  html.dataset.clutchMotion = mouvement;
  html.dataset.clutchFlashes = visuel.reduceFlashes ? 'reduced' : 'normal';
  html.dataset.clutchContrast = visuel.contrast ? 'high' : 'normal';
  html.dataset.clutchText = ['90', '100', '110', '125'].includes(String(visuel.textScale))
    ? String(visuel.textScale)
    : '100';
}

const visuelInitial = lireJSON(CLE_VISUELLE);
if (visuelInitial) appliquerPreferencesVisuelles(visuelInitial);
