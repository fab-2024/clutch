/**
 * Paramètres V2 — Control Center.
 *
 * La page sépare l'identité publique (Profil) des réglages du compte.
 * Les réglages purement visuels/socials sont locaux pour l'instant ; les réglages
 * métier déjà supportés par l'API (faction, saison, prono auto, session) restent
 * branchés sur leur backend existant.
 */

import * as api from '../api.js';
import { contexte, majSolde } from '../app.js';
import { esc, toast, vide, ecusson, nomJeu } from '../ui.js';
import { PARI_AUTO_MISE_MIN, PARI_AUTO_MISE_MAX } from '../core.js';
import {
  teinteFaction,
  cooldownFaction,
  COOLDOWN_FACTION_JOURS,
} from '../community-progression.js';
import {
  preferencesParametres,
  sauverPreferencesParametres,
  reinitialiserPreferencesParametres,
} from '../settings-prefs.js';

const SECTIONS = [
  ['compte', 'Compte', 'Identité & sécurité'],
  ['notifications', 'Notifications', 'Matchs & progression'],
  ['experience', 'Expérience', 'Jeux, saison & prono auto'],
  ['faction', 'Équipe & faction', 'Ton camp communautaire'],
  ['confidentialite', 'Confidentialité', 'Ce que les autres voient'],
  ['accessibilite', 'Accessibilité', 'Confort & mouvement'],
  ['donnees', 'Données', 'Préférences locales'],
  ['session', 'Session', 'Appareil & déconnexion'],
];

const ICONES = {
  compte: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.5-4.1 3-6.2 7-6.2s6.5 2.1 7 6.2"/>',
  notifications: '<path d="M7 9a5 5 0 0 1 10 0v4.2l1.8 2.8H5.2L7 13.2Z"/><path d="M10 19h4"/>',
  experience: '<path d="M7 8h10l2 9-3 .8-2-3.2h-4l-2 3.2-3-.8Z"/><path d="M8.5 11.5h3M10 10v3M15.5 11.5h.01"/>',
  faction: '<path d="M5 20V5l7-2 7 2v15"/><path d="M5 7h14M9 20v-5h6v5"/>',
  confidentialite: '<path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z"/><circle cx="12" cy="12" r="2.5"/>',
  accessibilite: '<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5h14M12 8.5v11M8.5 20l3.5-6 3.5 6"/>',
  donnees: '<ellipse cx="12" cy="5.5" rx="7" ry="3"/><path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  session: '<path d="M9 4H5v16h4M13 8l4 4-4 4M17 12H8"/>',
};

export async function vueParametres(racine) {
  if (!contexte.utilisateur) {
    racine.innerHTML = `
      ${entete()}
      <div class="settings-v2 settings-v2--invite">
        ${vide(
          'Ton Control Center arrive avec ton compte',
          'Connecte-toi pour gérer ta faction, ton expérience, tes notifications et ta confidentialité.',
          '<a class="btn" href="#/connexion">Créer mon compte</a>'
        )}
      </div>`;
    return;
  }

  const equipes = await api.listerEquipes();
  const utilisateur = contexte.utilisateur;
  const favorite = utilisateur.equipe_favorite;
  const cooldown = cooldownFaction(utilisateur.equipe_favorite_changee_le);
  let prefs = preferencesParametres(utilisateur);

  racine.innerHTML = `
    <div class="settings-v2" data-settings-root>
      ${entete()}
      <div class="settings-v2__layout">
        ${railParametres()}
        <div class="settings-v2__stage" id="settings-stage">
          ${panneauCompte(utilisateur)}
          ${panneauNotifications(prefs)}
          ${panneauExperience(prefs, utilisateur)}
          ${panneauFaction(equipes, favorite, cooldown)}
          ${panneauConfidentialite(prefs)}
          ${panneauAccessibilite(prefs)}
          ${panneauDonnees(prefs)}
          ${panneauSession(utilisateur)}
        </div>
      </div>
    </div>`;

  const sauver = (nouveau = prefs) => {
    prefs = sauverPreferencesParametres(utilisateur, nouveau);
    marquerSauvegarde(racine);
    return prefs;
  };

  brancherNavigation(racine);
  brancherRecherche(racine);
  brancherPreferences(racine, prefs, sauver);
  brancherExperience(racine, prefs, sauver, favorite);
  brancherFaction(racine, equipes, favorite, cooldown);
  brancherSaison(racine);
  brancherDonnees(racine, utilisateur, () => {
    prefs = reinitialiserPreferencesParametres(utilisateur);
    toast('Préférences locales réinitialisées.', 'succes');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  brancherSession(racine);
}

function entete() {
  return `
    <header class="settings-v2__header">
      <div>
        <span class="settings-v2__eyebrow">CONTROL CENTER</span>
        <h1>Paramètres</h1>
        <p>Configure Clutch à ta façon. Les changements légers sont enregistrés automatiquement.</p>
      </div>
      <div class="settings-v2__save" id="settings-save-status" aria-live="polite">
        <i></i><span>À jour</span>
      </div>
    </header>`;
}

function railParametres() {
  return `
    <aside class="settings-rail" aria-label="Catégories de paramètres">
      <label class="settings-search">
        <span class="settings-search__icon" aria-hidden="true">⌕</span>
        <input id="settings-search" type="search" placeholder="Rechercher un réglage" autocomplete="off" />
      </label>
      <nav class="settings-rail__nav">
        ${SECTIONS.map(([id, nom, detail], index) => `
          <button class="settings-rail__item${index === 0 ? ' is-active' : ''}" type="button"
                  data-settings-tab="${id}" aria-controls="settings-${id}" aria-selected="${index === 0 ? 'true' : 'false'}">
            <span class="settings-rail__icon">${iconeSection(id)}</span>
            <span class="settings-rail__copy"><strong>${esc(nom)}</strong><small>${esc(detail)}</small></span>
            <span class="settings-rail__arrow" aria-hidden="true">›</span>
          </button>`).join('')}
      </nav>
      <div class="settings-rail__foot">
        <span class="settings-rail__pulse"></span>
        <span><strong>Auto-save</strong><small>Préférences légères</small></span>
      </div>
    </aside>`;
}

function panneauCompte(u) {
  const pseudo = u.pseudo || 'Joueur Clutch';
  const date = dateCompte(u.cree_le);
  return panneau('compte', 'Compte', 'Ton accès à Clutch, sans mélanger identité publique et réglages.', `
    <div class="settings-account-hero">
      <div class="settings-account-hero__avatar">${esc(initiales(pseudo || u.email || '?'))}</div>
      <div class="settings-account-hero__copy">
        <span>COMPTE CLUTCH</span>
        <h2>${esc(pseudo)}</h2>
        <p>${esc(u.email || 'Adresse non renseignée')}</p>
      </div>
      <div class="settings-status-pill settings-status-pill--ok"><i></i>Session active</div>
    </div>

    <div class="settings-list">
      ${ligneInfo('Adresse e-mail', esc(u.email || '—'), 'Utilisée pour la connexion et la récupération du compte.')}
      ${ligneInfo('Membre depuis', esc(date), 'Ton historique de progression reste attaché à ce compte.')}
      ${ligneInfo('Identité publique', esc(pseudo), 'Avatar, bannière, badges et arsenal se modifient depuis le Profil.', '<a class="settings-link" href="#/profil">Ouvrir mon profil →</a>')}
    </div>

    <div class="settings-security-strip">
      <div class="settings-security-strip__shield" aria-hidden="true">${shieldIcon()}</div>
      <div><span>SÉCURITÉ</span><strong>Connexion protégée par ta session Clutch</strong><p>Le diagnostic permet de vérifier la session et l’accès Supabase sans exposer tes jetons.</p></div>
      <a class="btn btn--fantome btn--petit" href="#/diagnostic">Diagnostic</a>
    </div>
  `, true);
}

function panneauNotifications(prefs) {
  const n = prefs.notifications;
  return panneau('notifications', 'Notifications', 'Décide ce qui mérite vraiment de t’interrompre.', `
    <div class="settings-mode-block">
      <div><span class="settings-kicker">INTENSITÉ</span><h3>Mode notifications</h3><p>Un preset rapide, puis tu peux affiner chaque événement.</p></div>
      ${segment('notifications.mode', n.mode, [
        ['essentiel', 'Essentiel'], ['normal', 'Normal'], ['tout', 'Tout'],
      ], 'data-notif-mode')}
    </div>

    <div class="settings-subsection">
      <div class="settings-subsection__title"><span>🎯</span><div><h3>Matchs</h3><p>Ce qui se passe autour de tes pronostics.</p></div></div>
      <div class="settings-list settings-list--switches">
        ${ligneSwitch('Un match suivi commence bientôt', 'Alerte avant le coup d’envoi.', 'notifications.matchSoon', n.matchSoon)}
        ${ligneSwitch('Un match passe LIVE', 'Seulement les rencontres que tu suis.', 'notifications.live', n.live)}
        ${ligneSwitch('Résultat de mon pronostic', 'Résultat, Frags et progression associée.', 'notifications.result', n.result)}
      </div>
    </div>

    <div class="settings-subsection">
      <div class="settings-subsection__title"><span>⚡</span><div><h3>Progression & social</h3><p>Niveaux, ligues et guerre de factions.</p></div></div>
      <div class="settings-list settings-list--switches">
        ${ligneSwitch('Récompenses et level-up', 'Badge, niveau ou récompense disponible.', 'notifications.rewards', n.rewards)}
        ${ligneSwitch('Ligues', 'Invitation, rival qui te dépasse ou fin de saison.', 'notifications.league', n.league)}
        ${ligneSwitch('Communauté', 'Mutation, seuil ou événement de ta faction.', 'notifications.community', n.community)}
      </div>
    </div>
  `);
}

function panneauExperience(prefs, u) {
  const modeAuto = u.pari_auto_mode ?? 'off';
  return panneau('experience', 'Expérience Clutch', 'Jeux suivis, comportement de l’interface et réglages de saison.', `
    <div class="settings-subsection settings-subsection--first">
      <div class="settings-subsection__title"><span>◈</span><div><h3>Jeux suivis</h3><p>Ils priorisent ce que Clutch te montre dans le Hub et les Matchs.</p></div></div>
      <div class="settings-game-grid">
        ${jeuChip('lol', 'League of Legends', prefs.experience.games.includes('lol'))}
        ${jeuChip('valorant', 'VALORANT', prefs.experience.games.includes('valorant'))}
        ${jeuChip('cs2', 'Counter-Strike 2', prefs.experience.games.includes('cs2'))}
      </div>
    </div>

    <div class="settings-list settings-list--spaced">
      <div class="settings-row settings-row--stack">
        <div class="settings-row__copy"><strong>Mouvement de l’interface</strong><small>Animations Clutch, transitions et micro-interactions.</small></div>
        ${segment('experience.motion', prefs.experience.motion, [
          ['full', 'Complet'], ['reduced', 'Réduit'], ['off', 'Désactivé'],
        ], 'data-motion-mode')}
      </div>
      <div class="settings-row settings-row--stack">
        <div class="settings-row__copy"><strong>Volume des effets</strong><small>Effets d’interface et sons de récompense.</small></div>
        <div class="settings-range"><input id="settings-sound" type="range" min="0" max="100" step="5" value="${Number(prefs.experience.sound) || 0}"><output id="settings-sound-output">${Number(prefs.experience.sound) || 0}%</output></div>
      </div>
      ${ligneSwitch('Sons de récompense', 'Level-up, badge, mutation et récompense.', 'experience.rewardSound', prefs.experience.rewardSound)}
    </div>

    <div class="settings-prono-auto">
      <div class="settings-prono-auto__head"><span class="settings-kicker">FILET DE SÉCURITÉ</span><h3>Prono par défaut</h3><p>Si tu n’as rien saisi au coup d’envoi, Clutch peut miser automatiquement sur le favori. Ce n’est pas une stratégie, seulement un filet anti-oubli.</p></div>
      <div class="settings-prono-auto__form">
        <label><span>Quand ?</span><select id="auto-mode">
          <option value="off"${modeAuto === 'off' ? ' selected' : ''}>Jamais</option>
          <option value="favori"${modeAuto === 'favori' ? ' selected' : ''}>Matchs de ma faction</option>
          <option value="tous"${modeAuto === 'tous' ? ' selected' : ''}>Tous les matchs de la saison</option>
        </select></label>
        <label><span>Mise</span><div class="settings-input-unit"><input type="number" id="auto-mise" min="${PARI_AUTO_MISE_MIN}" max="${PARI_AUTO_MISE_MAX}" step="10" value="${u.pari_auto_mise ?? 100}"><i>Frags</i></div></label>
        <button class="btn" id="enregistrer-auto">Enregistrer</button>
      </div>
      ${modeAuto === 'favori' && !u.equipe_favorite ? '<div class="settings-inline-alert">Choisis d’abord une faction pour utiliser ce mode.</div>' : ''}
    </div>

    ${carteSaison()}
  `);
}

function panneauFaction(equipes, favorite, cooldown) {
  const choix = favorite ?? equipes[0] ?? null;
  const indisponible = Boolean(favorite && cooldown.actif);
  return panneau('faction', 'Équipe & faction', 'Ton équipe favorite est ton camp dans la Communauté.', `
    ${heroFaction(favorite, cooldown)}

    <div class="settings-faction-picker">
      <div class="settings-faction-picker__head">
        <div><span class="settings-kicker">SÉLECTEUR DE FACTION</span><h3>${favorite ? 'Changer de camp' : 'Choisir ton camp'}</h3><p>Choisis une équipe pour voir l’aperçu avant toute confirmation.</p></div>
        ${favorite ? '<a class="settings-link" href="#/communaute">Voir ma faction →</a>' : ''}
      </div>
      <div class="settings-team-grid" id="settings-team-grid">
        ${equipes.map((e) => equipeBouton(e, choix?.id, favorite?.id)).join('')}
      </div>
      <div id="settings-faction-preview">${apercuFaction(choix, favorite, cooldown)}</div>
      <button class="btn settings-faction-cta" id="preparer-faction" type="button"${indisponible || !choix || choix.id === favorite?.id ? ' disabled' : ''}>
        ${favorite ? (indisponible ? 'Changement verrouillé' : 'Préparer le changement') : 'Rejoindre cette faction'}
      </button>
      <div class="settings-faction-confirm" id="faction-confirmation" hidden></div>
    </div>
  `);
}

function panneauConfidentialite(prefs) {
  const p = prefs.privacy;
  const choix = [['public', 'Public'], ['friends', 'Amis'], ['private', 'Privé']];
  return panneau('confidentialite', 'Confidentialité', 'Contrôle précisément ce que ton profil social expose.', `
    <div class="settings-privacy-intro"><div class="settings-privacy-intro__eye" aria-hidden="true">${eyeIcon()}</div><div><span>VISIBILITÉ</span><strong>Ton jeu, tes règles.</strong><p>Chaque zone peut avoir un niveau de visibilité différent.</p></div></div>
    <div class="settings-list settings-list--privacy">
      ${ligneSegmentee('Profil public', 'Ton identité, ton niveau et ta faction.', 'privacy.profile', p.profile, choix)}
      ${ligneSegmentee('Historique de pronostics', 'Résultats, choix passés et précision.', 'privacy.predictions', p.predictions, choix)}
      ${ligneSegmentee('Clutch Room', 'Ta pièce, tes trophées et ta collection.', 'privacy.room', p.room, choix)}
      ${ligneSegmentee('Activité récente', 'Badges, level-up et événements sociaux.', 'privacy.activity', p.activity, choix)}
      ${ligneSwitch('Afficher mon statut en ligne', 'Permet à tes amis de voir quand tu es actif.', 'privacy.online', p.online)}
    </div>
  `);
}

function panneauAccessibilite(prefs) {
  const a = prefs.accessibility;
  return panneau('accessibilite', 'Accessibilité', 'Réduis les effets sans perdre l’identité de Clutch.', `
    <div class="settings-accessibility-preview">
      <div class="settings-accessibility-preview__mark">C</div>
      <div><span>APERÇU EN DIRECT</span><strong>Les changements s’appliquent immédiatement.</strong><p>Ces réglages sont mémorisés sur cet appareil.</p></div>
    </div>
    <div class="settings-list settings-list--switches settings-list--spaced">
      ${ligneSwitch('Réduire les mouvements', 'Limite les transitions, zooms et animations décoratives.', 'accessibility.reduceMotion', a.reduceMotion)}
      ${ligneSwitch('Réduire les flashs', 'Atténue les effets lumineux lors des récompenses.', 'accessibility.reduceFlashes', a.reduceFlashes)}
      ${ligneSwitch('Contraste renforcé', 'Accentue les bordures et les textes secondaires.', 'accessibility.contrast', a.contrast)}
      <div class="settings-row settings-row--stack">
        <div class="settings-row__copy"><strong>Taille du texte</strong><small>Ajuste l’échelle générale de l’interface.</small></div>
        ${segment('accessibility.textScale', String(a.textScale), [['90', '90 %'], ['100', '100 %'], ['110', '110 %'], ['125', '125 %']], 'data-text-scale')}
      </div>
    </div>
  `);
}

function panneauDonnees(prefs) {
  return panneau('donnees', 'Données & préférences', 'Ce qui reste local et ce qui personnalise ton expérience.', `
    <div class="settings-list settings-list--switches">
      ${ligneSwitch('Personnaliser mon Accueil', 'Utilise mes jeux suivis et mon activité pour prioriser le Hub.', 'personalization.home', prefs.personalization.home)}
      ${ligneSwitch('Nouveautés Clutch', 'Préférence marketing locale — aucun envoi n’est encore déclenché par ce réglage.', 'personalization.marketing', prefs.personalization.marketing)}
    </div>
    <div class="settings-data-actions">
      <article><span>EXPORT LOCAL</span><h3>Tes préférences Paramètres V2</h3><p>Télécharge un JSON contenant uniquement les réglages enregistrés sur cet appareil.</p><button class="btn btn--fantome" id="export-settings">Exporter mes préférences</button></article>
      <article><span>DIAGNOSTIC</span><h3>État technique de Clutch</h3><p>Vérifie la session, la configuration et la connexion aux services utilisés par l’application.</p><a class="btn btn--fantome" href="#/diagnostic">Ouvrir le diagnostic</a></article>
    </div>
    <div class="settings-danger-line"><div><strong>Réinitialiser les préférences locales</strong><small>Notifications, confidentialité, expérience et accessibilité reviendront aux valeurs par défaut.</small></div><button class="settings-text-danger" id="reset-settings">Réinitialiser</button></div>
  `);
}

function panneauSession(u) {
  return panneau('session', 'Session', 'Tes accès actifs sur cet appareil.', `
    <div class="settings-session-device">
      <div class="settings-session-device__icon" aria-hidden="true">${deviceIcon()}</div>
      <div><span>APPAREIL ACTUEL</span><strong>${esc(appareilCourant())}</strong><p>${esc(navigateurCourant())} · session utilisée maintenant</p></div>
      <div class="settings-status-pill settings-status-pill--ok"><i></i>Actuel</div>
    </div>
    <div class="settings-session-note"><span>i</span><p>Clutch ne dispose pas encore d’un gestionnaire multi-appareils côté serveur. La déconnexion ci-dessous ferme la session de ce navigateur.</p></div>
    <div class="settings-signout">
      <div><span>ZONE DE SESSION</span><h3>Se déconnecter de Clutch</h3><p>Ton profil, tes badges, ta faction et ta progression restent attachés à ton compte.</p></div>
      <button class="btn btn--danger" id="quitter">Se déconnecter</button>
    </div>
  `);
}

function panneau(id, titre, description, contenu, actif = false) {
  return `
    <section class="settings-panel${actif ? ' is-active' : ''}" id="settings-${id}" data-settings-panel="${id}" ${actif ? '' : 'hidden'}>
      <header class="settings-panel__head"><div><span>${esc(SECTIONS.find((s) => s[0] === id)?.[2] || '')}</span><h2>${esc(titre)}</h2><p>${esc(description)}</p></div><div class="settings-panel__number">${String(SECTIONS.findIndex((s) => s[0] === id) + 1).padStart(2, '0')}</div></header>
      <div class="settings-panel__body">${contenu}</div>
    </section>`;
}

function ligneInfo(titre, valeur, aide, action = '') {
  return `<div class="settings-row"><div class="settings-row__copy"><strong>${titre}</strong><small>${aide}</small></div><div class="settings-row__value"><span>${valeur}</span>${action}</div></div>`;
}

function ligneSwitch(titre, aide, path, actif) {
  return `<div class="settings-row"><div class="settings-row__copy"><strong>${esc(titre)}</strong><small>${esc(aide)}</small></div><button class="settings-switch${actif ? ' is-on' : ''}" type="button" role="switch" aria-checked="${actif ? 'true' : 'false'}" data-pref-path="${esc(path)}"><span></span></button></div>`;
}

function ligneSegmentee(titre, aide, path, valeur, choix) {
  return `<div class="settings-row settings-row--stack-mobile"><div class="settings-row__copy"><strong>${esc(titre)}</strong><small>${esc(aide)}</small></div>${segment(path, valeur, choix, 'data-pref-segment')}</div>`;
}

function segment(path, valeur, choix, attribut) {
  return `<div class="settings-segment" data-segment-path="${esc(path)}">${choix.map(([id, label]) => `<button type="button" ${attribut}="${esc(id)}" class="${String(valeur) === String(id) ? 'is-active' : ''}">${esc(label)}</button>`).join('')}</div>`;
}

function jeuChip(id, nom, actif) {
  return `<button class="settings-game${actif ? ' is-active' : ''}" type="button" data-game="${id}" aria-pressed="${actif ? 'true' : 'false'}"><i class="settings-game__dot settings-game__dot--${id}"></i><span>${esc(nom)}</span><b>${actif ? '✓' : '+'}</b></button>`;
}

function carteSaison() {
  if (!contexte.saisons?.length) return '';
  return `
    <div class="settings-season">
      <div><span class="settings-kicker">SAISON CONSULTÉE</span><h3>${esc(contexte.saison?.nom ?? 'Saison')}</h3><p>Le solde et le classement sont propres à chaque saison. Les saisons passées restent consultables.</p></div>
      <label><span>Afficher</span><select id="selecteur-saison">${contexte.saisons.map((s) => `<option value="${esc(s.id)}"${s.id === contexte.saison?.id ? ' selected' : ''}>${esc(s.nom)}${s.statut === 'terminee' ? ' · terminée' : s.statut === 'a_venir' ? ' · à venir' : ''}</option>`).join('')}</select></label>
    </div>`;
}

function heroFaction(favorite, cooldown) {
  if (!favorite) {
    return `<div class="settings-faction-hero settings-faction-hero--empty"><div class="settings-faction-hero__orb">?</div><div><span>AUCUNE FACTION</span><h2>Choisis ton camp</h2><p>Ton équipe favorite devient ta faction dans la guerre communautaire.</p></div></div>`;
  }
  const hue = teinteFaction(favorite.tag, favorite.nom);
  return `<div class="settings-faction-hero" style="--team-hue:${hue}"><div class="settings-faction-hero__energy" aria-hidden="true"></div><div class="settings-faction-hero__crest">${ecusson(favorite.tag, favorite.nom, 'm')}</div><div class="settings-faction-hero__copy"><span>TA FACTION</span><h2>${esc(favorite.nom)}</h2><p>${esc(nomJeu(favorite.jeu))} · ${esc(favorite.tag)}</p>${cooldown.actif ? `<small>Prochain changement : ${esc(dateComplete(cooldown.disponibleLe))}</small>` : '<small>Faction active · changement disponible</small>'}</div><div class="settings-faction-hero__tag">${esc(favorite.tag)}</div></div>`;
}

function equipeBouton(equipe, selectionId, favoriteId) {
  const hue = teinteFaction(equipe.tag, equipe.nom);
  const selection = equipe.id === selectionId;
  const actuelle = equipe.id === favoriteId;
  return `<button type="button" class="settings-team${selection ? ' is-selected' : ''}${actuelle ? ' is-current' : ''}" data-team-id="${esc(equipe.id)}" style="--team-hue:${hue}" aria-pressed="${selection ? 'true' : 'false'}"><span class="settings-team__crest">${ecusson(equipe.tag, equipe.nom, 'm')}</span><span class="settings-team__copy"><strong>${esc(equipe.tag)}</strong><small>${esc(equipe.nom)}</small></span>${actuelle ? '<i>ACTUELLE</i>' : ''}</button>`;
}

function apercuFaction(equipe, favorite, cooldown) {
  if (!equipe) return '';
  const actuelle = favorite?.id === equipe.id;
  const hue = teinteFaction(equipe.tag, equipe.nom);
  const verrouille = Boolean(favorite && cooldown.actif && !actuelle);
  return `<article class="settings-faction-preview" style="--team-hue:${hue}"><div class="settings-faction-preview__beam"></div><div class="settings-faction-preview__crest">${ecusson(equipe.tag, equipe.nom, 'm')}</div><div class="settings-faction-preview__copy"><span>${actuelle ? 'FACTION ACTUELLE' : 'APERÇU DE FACTION'}</span><strong>${esc(equipe.nom)}</strong><small>${esc(nomJeu(equipe.jeu))} · énergie ${esc(equipe.tag)}</small></div><div class="settings-faction-preview__state">${actuelle ? 'Actuelle' : verrouille ? 'Verrouillée' : 'Disponible'}</div></article>`;
}

function confirmationFaction(cible, favorite) {
  const premier = !favorite;
  return `<div class="settings-faction-confirm__inner" style="--team-hue:${teinteFaction(cible.tag, cible.nom)}"><span>${premier ? 'REJOINDRE UNE FACTION' : 'CONFIRMER LE TRANSFERT'}</span><h3>${premier ? `Rejoindre ${esc(cible.nom)} ?` : `${esc(favorite.nom)} → ${esc(cible.nom)}`}</h3><div class="settings-faction-rules"><p><b>01</b>Tes prochains pronostics compteront pour <strong>${esc(cible.tag)}</strong>.</p><p><b>02</b>Ton historique, tes badges et ta Room restent intacts.</p><p><b>03</b>Les prochaines récompenses communautaires suivront ta nouvelle faction.</p><p><b>04</b>Nouveau changement bloqué pendant <strong>${COOLDOWN_FACTION_JOURS} jours</strong>.</p></div><div class="settings-faction-confirm__actions"><button class="btn" id="confirmer-faction">${premier ? 'Rejoindre la faction' : 'Confirmer le changement'}</button><button class="btn btn--fantome" id="annuler-faction">Annuler</button></div></div>`;
}

function brancherNavigation(racine) {
  const ouvrir = (id) => {
    racine.querySelectorAll('[data-settings-tab]').forEach((b) => {
      const actif = b.dataset.settingsTab === id;
      b.classList.toggle('is-active', actif);
      b.setAttribute('aria-selected', actif ? 'true' : 'false');
    });
    racine.querySelectorAll('[data-settings-panel]').forEach((p) => {
      const actif = p.dataset.settingsPanel === id;
      p.hidden = !actif;
      p.classList.toggle('is-active', actif);
    });
    const panel = racine.querySelector(`[data-settings-panel="${id}"]`);
    if (panel && matchMedia('(max-width: 760px)').matches) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  racine.querySelectorAll('[data-settings-tab]').forEach((b) => b.addEventListener('click', () => ouvrir(b.dataset.settingsTab)));
}

function brancherRecherche(racine) {
  const champ = racine.querySelector('#settings-search');
  if (!champ) return;
  champ.addEventListener('input', () => {
    const q = normaliser(champ.value);
    const boutons = [...racine.querySelectorAll('[data-settings-tab]')];
    let premier = null;
    boutons.forEach((b) => {
      const section = SECTIONS.find((s) => s[0] === b.dataset.settingsTab);
      const match = !q || normaliser(section?.join(' ') || '').includes(q);
      b.hidden = !match;
      if (match && !premier) premier = b;
    });
    if (q && premier) premier.click();
  });
}

function brancherPreferences(racine, prefs, sauver) {
  racine.querySelectorAll('[data-pref-path]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const path = bouton.dataset.prefPath;
      const valeur = !Boolean(lirePath(prefs, path));
      ecrirePath(prefs, path, valeur);
      bouton.classList.toggle('is-on', valeur);
      bouton.setAttribute('aria-checked', valeur ? 'true' : 'false');
      sauver(prefs);
    });
  });

  racine.querySelectorAll('[data-pref-segment]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const parent = bouton.closest('[data-segment-path]');
      const path = parent?.dataset.segmentPath;
      if (!path) return;
      ecrirePath(prefs, path, bouton.dataset.prefSegment);
      activerSegment(parent, bouton);
      sauver(prefs);
    });
  });

  racine.querySelectorAll('[data-text-scale]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const parent = bouton.closest('[data-segment-path]');
      prefs.accessibility.textScale = bouton.dataset.textScale;
      activerSegment(parent, bouton);
      sauver(prefs);
    });
  });
}

function brancherExperience(racine, prefs, sauver, favorite) {
  racine.querySelectorAll('[data-game]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const id = bouton.dataset.game;
      const liste = new Set(prefs.experience.games || []);
      if (liste.has(id) && liste.size > 1) liste.delete(id);
      else liste.add(id);
      prefs.experience.games = [...liste];
      const actif = liste.has(id);
      bouton.classList.toggle('is-active', actif);
      bouton.setAttribute('aria-pressed', actif ? 'true' : 'false');
      bouton.querySelector('b').textContent = actif ? '✓' : '+';
      sauver(prefs);
    });
  });

  racine.querySelectorAll('[data-motion-mode]').forEach((bouton) => {
    bouton.addEventListener('click', () => {
      const parent = bouton.closest('[data-segment-path]');
      prefs.experience.motion = bouton.dataset.motionMode;
      activerSegment(parent, bouton);
      sauver(prefs);
    });
  });

  const range = racine.querySelector('#settings-sound');
  const output = racine.querySelector('#settings-sound-output');
  range?.addEventListener('input', () => { if (output) output.textContent = `${range.value}%`; });
  range?.addEventListener('change', () => { prefs.experience.sound = Number(range.value); sauver(prefs); });

  racine.querySelector('#enregistrer-auto')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    try {
      await api.definirPariAuto({
        mode: racine.querySelector('#auto-mode').value,
        mise: Number(racine.querySelector('#auto-mise').value),
      });
      toast('Prono par défaut enregistré.', 'succes');
      await majSolde();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (err) {
      toast(err.message, 'erreur');
      e.currentTarget.disabled = false;
    }
  });

  const autoMode = racine.querySelector('#auto-mode');
  if (autoMode && !favorite) {
    autoMode.addEventListener('change', () => {
      if (autoMode.value === 'favori') toast('Choisis d’abord une faction dans « Équipe & faction ».', 'erreur');
    });
  }
}

function brancherFaction(racine, equipes, favorite, cooldown) {
  const grille = racine.querySelector('#settings-team-grid');
  const apercu = racine.querySelector('#settings-faction-preview');
  const preparer = racine.querySelector('#preparer-faction');
  const confirmation = racine.querySelector('#faction-confirmation');
  if (!grille || !apercu || !preparer || !confirmation) return;

  let cible = favorite ?? equipes[0] ?? null;
  const trouver = (id) => equipes.find((e) => String(e.id) === String(id)) ?? null;

  const rafraichir = () => {
    grille.querySelectorAll('[data-team-id]').forEach((b) => {
      const selection = String(b.dataset.teamId) === String(cible?.id);
      b.classList.toggle('is-selected', selection);
      b.setAttribute('aria-pressed', selection ? 'true' : 'false');
    });
    apercu.innerHTML = apercuFaction(cible, favorite, cooldown);
    confirmation.hidden = true;
    confirmation.innerHTML = '';
    const identique = Boolean(favorite && cible?.id === favorite.id);
    const verrouille = Boolean(favorite && cooldown.actif && !identique);
    preparer.disabled = !cible || identique || verrouille;
    preparer.textContent = identique ? 'Faction actuelle' : verrouille ? 'Changement verrouillé' : favorite ? 'Préparer le changement' : 'Rejoindre cette faction';
  };

  grille.querySelectorAll('[data-team-id]').forEach((b) => b.addEventListener('click', () => { cible = trouver(b.dataset.teamId); rafraichir(); }));

  preparer.addEventListener('click', () => {
    if (!cible || favorite?.id === cible.id) return;
    confirmation.innerHTML = confirmationFaction(cible, favorite);
    confirmation.hidden = false;
    confirmation.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
    confirmation.querySelector('#annuler-faction')?.addEventListener('click', () => { confirmation.hidden = true; confirmation.innerHTML = ''; });
    confirmation.querySelector('#confirmer-faction')?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        await api.definirEquipeFavorite(cible.id);
        toast(`Faction rejointe : ${cible.nom}.`, 'succes');
        await majSolde();
        location.hash = '#/communaute';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (err) {
        toast(messageFaction(err), 'erreur');
        e.currentTarget.disabled = false;
      }
    });
  });
  rafraichir();
}

function brancherSaison(racine) {
  racine.querySelector('#selecteur-saison')?.addEventListener('change', async (e) => {
    await api.choisirSaison(e.target.value);
    toast('Saison changée.', 'succes');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

function brancherDonnees(racine, utilisateur, reset) {
  racine.querySelector('#export-settings')?.addEventListener('click', () => {
    const contenu = JSON.stringify({
      exported_at: new Date().toISOString(),
      user_id: utilisateur.id,
      preferences: preferencesParametres(utilisateur),
    }, null, 2);
    const blob = new Blob([contenu], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = 'clutch-parametres.json';
    lien.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    toast('Préférences exportées.', 'succes');
  });
  racine.querySelector('#reset-settings')?.addEventListener('click', reset);
}

function brancherSession(racine) {
  racine.querySelector('#quitter')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    await api.deconnexion();
    location.hash = '#/matchs';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
}

function marquerSauvegarde(racine) {
  const statut = racine.querySelector('#settings-save-status');
  if (!statut) return;
  statut.classList.add('is-saving');
  statut.querySelector('span').textContent = 'Enregistré';
  clearTimeout(marquerSauvegarde._timer);
  marquerSauvegarde._timer = setTimeout(() => {
    statut.classList.remove('is-saving');
    statut.querySelector('span').textContent = 'À jour';
  }, 1200);
}

function activerSegment(parent, bouton) {
  parent?.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === bouton));
}

function lirePath(obj, path) {
  return String(path).split('.').reduce((acc, cle) => acc?.[cle], obj);
}

function ecrirePath(obj, path, valeur) {
  const morceaux = String(path).split('.');
  const dernier = morceaux.pop();
  const cible = morceaux.reduce((acc, cle) => (acc[cle] ??= {}), obj);
  cible[dernier] = valeur;
}

function normaliser(texte) {
  return String(texte || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function messageFaction(err) {
  const msg = String(err?.message || 'Impossible de changer de faction.');
  const match = msg.match(/Changement de faction bloqué[^)]*/i);
  return match?.[0] ?? msg;
}

function dateComplete(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function dateCompte(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function initiales(nom) {
  const morceaux = String(nom || '?').trim().split(/[\s._-]+/).filter(Boolean);
  if (!morceaux.length) return '?';
  return morceaux.length === 1 ? morceaux[0].slice(0, 2).toUpperCase() : (morceaux[0][0] + morceaux[1][0]).toUpperCase();
}

function appareilCourant() {
  const ua = navigator.userAgent || '';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
  if (/Android/i.test(ua)) return 'Appareil Android';
  if (/Windows/i.test(ua)) return 'PC Windows';
  return navigator.platform || 'Cet appareil';
}

function navigateurCourant() {
  const ua = navigator.userAgent || '';
  if (/Edg\//.test(ua)) return 'Microsoft Edge';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  return 'Navigateur web';
}

function iconeSection(id) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[id] || ''}</svg>`;
}

function shieldIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 19 6v5c0 4.6-2.7 8-7 10-4.3-2-7-5.4-7-10V6Z"/><path d="m9 12 2 2 4-4"/></svg>';
}

function eyeIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
}

function deviceIcon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M8 20h8M10 16v4M14 16v4"/></svg>';
}
