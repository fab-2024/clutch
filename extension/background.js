/**
 * Service worker de l'extension.
 *
 * Rôle volontairement minimal : mémoriser l'URL de l'application et
 * transmettre l'ordre d'ouverture de l'overlay quand on clique sur l'icône.
 */

const DEFAUTS = {
  urlApp: 'http://localhost:8123/index.html',
  actif: true,
  cote: 'droite',
};

chrome.runtime.onInstalled.addListener(async () => {
  const actuel = await chrome.storage.sync.get(Object.keys(DEFAUTS));
  const manquants = {};
  for (const [cle, valeur] of Object.entries(DEFAUTS)) {
    if (actuel[cle] === undefined) manquants[cle] = valeur;
  }
  if (Object.keys(manquants).length) await chrome.storage.sync.set(manquants);
});

chrome.runtime.onMessage.addListener((message, expediteur, repondre) => {
  if (message?.type === 'basculer-overlay' && expediteur.tab?.id) {
    repondre({ ok: true });
  }
  return true;
});
