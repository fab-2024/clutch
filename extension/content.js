/**
 * Overlay GRIFF injecté sur Twitch et YouTube.
 *
 * Choix d'architecture : le panneau affiche l'application GRIFF dans une
 * iframe plutôt que de réimplémenter les calls. Conséquence :
 * une seule base de code à maintenir, la session de connexion est celle du
 * site, et toute évolution de l'app apparaît immédiatement dans l'overlay.
 */

(() => {
  if (window.__clutchInjecte) return;
  window.__clutchInjecte = true;

  const ID = 'clutch-overlay';
  let reglages = { urlApp: '', actif: true, cote: 'droite' };
  let panneau = null;

  /* ------------------------------------------------------ Détection du jeu */

  /** Devine le jeu regardé, à partir du titre de la page et des tags Twitch. */
  function jeuDetecte() {
    const texte = `${document.title} ${document.querySelector('meta[name="description"]')?.content || ''}`.toLowerCase();
    if (/valorant|vct/.test(texte)) return 'valorant';
    if (/counter-?strike|cs2|cs:go|blast|esl pro/.test(texte)) return 'cs2';
    if (/league of legends|lol|lec|lfl|worlds/.test(texte)) return 'lol';
    return '';
  }

  /* ------------------------------------------------------------- Interface */

  function construire() {
    const racine = document.createElement('div');
    racine.id = ID;
    racine.dataset.cote = reglages.cote;
    racine.innerHTML = `
      <button class="clutch-lanceur" title="Ouvrir GRIFF" aria-label="Ouvrir GRIFF">
        <img src="${chrome.runtime.getURL('icons/icone-128.png')}" alt="" aria-hidden="true" />
      </button>
      <section class="clutch-panneau" hidden aria-label="Panneau GRIFF">
        <header class="clutch-entete">
          <span class="clutch-titre">GRIFF<span class="clutch-point"></span></span>
          <div class="clutch-actions">
            <button class="clutch-btn" data-action="cote" title="Changer de côté">⇄</button>
            <button class="clutch-btn" data-action="ouvrir" title="Ouvrir dans un onglet">↗</button>
            <button class="clutch-btn" data-action="fermer" title="Fermer">✕</button>
          </div>
        </header>
        <div class="clutch-corps"></div>
      </section>`;
    document.body.appendChild(racine);
    return racine;
  }

  function urlIframe() {
    const base = (reglages.urlApp || '').trim();
    if (!base) return null;
    const jeu = jeuDetecte();
    const separateur = base.includes('#') ? '' : '#/matchs';
    return base + separateur + (jeu ? `?jeu=${jeu}` : '');
  }

  function remplirCorps() {
    const corps = panneau.querySelector('.clutch-corps');
    const url = urlIframe();
    if (!url) {
      corps.innerHTML = `
        <div class="clutch-vide">
          <p><strong>Presque prêt.</strong></p>
          <p>Indique l'adresse de ton GRIFF dans les réglages de l'extension
             (clic sur l'icône dans la barre d'outils).</p>
        </div>`;
      return;
    }
    corps.innerHTML = `<iframe src="${url}" title="GRIFF" referrerpolicy="no-referrer"></iframe>`;
  }

  function basculer(force) {
    const section = panneau.querySelector('.clutch-panneau');
    const ouvrir = force ?? section.hidden;
    section.hidden = !ouvrir;
    panneau.classList.toggle('clutch-ouvert', ouvrir);
    if (ouvrir && !section.querySelector('iframe')) remplirCorps();
  }

  function brancher() {
    panneau.querySelector('.clutch-lanceur').addEventListener('click', () => basculer());
    panneau.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (!action) return;
      if (action === 'fermer') basculer(false);
      if (action === 'ouvrir' && urlIframe()) window.open(urlIframe(), '_blank', 'noopener');
      if (action === 'cote') {
        reglages.cote = reglages.cote === 'droite' ? 'gauche' : 'droite';
        panneau.dataset.cote = reglages.cote;
        chrome.storage.sync.set({ cote: reglages.cote });
      }
    });

    // Raccourci clavier principal : Alt + G. Alt + C reste compatible.
    document.addEventListener('keydown', (e) => {
      if (e.altKey && ['g', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        basculer();
      }
    });
  }

  /* ------------------------------------------------------------ Démarrage */

  chrome.storage.sync.get(['urlApp', 'actif', 'cote'], (valeurs) => {
    reglages = { ...reglages, ...valeurs };
    if (reglages.actif === false) return;
    panneau = construire();
    brancher();
  });

  chrome.storage.onChanged.addListener((changements) => {
    if (changements.urlApp && panneau) {
      reglages.urlApp = changements.urlApp.newValue;
      const corps = panneau.querySelector('.clutch-corps');
      if (corps.innerHTML) remplirCorps();
    }
  });
})();
