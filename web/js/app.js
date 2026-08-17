/** Clutch — routeur et ossature globale. */
import * as api from './api.js';
import * as economyApi from './economy-api.js';
import { MODE_DEMO, NOM_APP } from './config.js';
import { esc, jeton, jetonVolt, toast } from './ui.js';
import { formaterFrags, progressionNiveau } from './core.js';
import { MetaChip, Avatar } from './components-v4.js';
import { evaluerBadgesV2, xpDetailleeV2 } from './badges-v2.js';

import { vueAccueil } from './views/accueil.js';
import { vueMatchs } from './views/matchs.js';
import { vueMatch } from './views/match.js';
import { vueLigues } from './views/ligues.js';
import { vueLigue } from './views/ligue.js';
import { vueProfil } from './views/profil.js';
import { vueCommunaute } from './views/communaute.js';
import { vueSocial } from './views/social.js';
import { vueRoom } from './views/room.js';
import { vueBoutique } from './views/boutique.js';
import { vueParametres } from './views/parametres.js';
import { vueCall } from './views/call.js';
import { vueAnalyste } from './views/analyste.js';
import { vueBadges } from './views/badges.js';
import { vueCartes } from './views/cartes.js';
import { vueAdmin } from './views/admin.js';
import { vueConnexion } from './views/connexion.js';
import { vueDiagnostic } from './views/diagnostic.js';
import { vueOnboarding, onboardingTermine } from './views/onboarding.js';

const ROUTES = [
  { motif: /^\/onboarding$/, vue: vueOnboarding, nav: 'onboarding', mobile: null, desktop: null },
  { motif: /^\/accueil$/, vue: vueAccueil, nav: 'accueil', mobile: 'hub' },
  { motif: /^\/matchs$/, vue: vueMatchs, nav: 'matchs', mobile: 'matchs' },
  { motif: /^\/matchs\/(.+)$/, vue: vueMatch, nav: 'matchs', mobile: 'matchs' },

  { motif: /^\/social$/, vue: (r) => vueSocial(r, 'ligues'), nav: 'social', desktop: 'ligues', mobile: 'social' },
  { motif: /^\/social\/(ligues|faction|amis)$/, vue: vueSocial, nav: 'social', desktop: 'ligues', mobile: 'social' },
  { motif: /^\/amis$/, vue: (r) => vueSocial(r, 'amis'), nav: 'social', desktop: 'ligues', mobile: 'social' },
  { motif: /^\/ligues$/, vue: vueLigues, nav: 'ligues', mobile: 'social' },
  { motif: /^\/ligues\/(.+)$/, vue: vueLigue, nav: 'ligues', mobile: 'social' },
  { motif: /^\/classement$/, vue: (r) => vueLigues(r, 'global'), nav: 'ligues', mobile: 'social' },
  { motif: /^\/communaute$/, vue: vueCommunaute, nav: 'communaute', mobile: 'social' },

  { motif: /^\/room$/, vue: vueRoom, nav: 'room', mobile: 'room' },
  { motif: /^\/boutique$/, vue: vueBoutique, nav: 'boutique', mobile: 'room' },

  { motif: /^\/profil$/, vue: vueProfil, nav: 'profil', mobile: 'moi' },
  { motif: /^\/parametres$/, vue: vueParametres, nav: 'parametres', mobile: 'moi' },
  { motif: /^\/call$/, vue: vueCall, nav: 'call', mobile: 'moi' },
  { motif: /^\/analyste$/, vue: vueAnalyste, nav: 'profil', mobile: 'moi' },
  { motif: /^\/badges$/, vue: vueBadges, nav: 'profil', mobile: 'moi' },
  { motif: /^\/cartes$/, vue: vueCartes, nav: 'profil', mobile: 'moi' },
  { motif: /^\/admin$/, vue: vueAdmin, nav: null, mobile: null },
  { motif: /^\/connexion$/, vue: vueConnexion, nav: 'auth', mobile: null, desktop: null },
  { motif: /^\/diagnostic$/, vue: vueDiagnostic, nav: null, mobile: null },
];

const ICONES = {
  accueil: '<path d="M4 11.3 12 4l8 7.3"/><path d="M6.7 10.2v9.3h10.6v-9.3"/><path d="M10 19.5v-5.2h4v5.2"/><path d="M18.4 4.6v3.6"/>',
  matchs: '<path d="M4 7.5h16v11H4z"/><path d="M8 4.5v3M16 4.5v3M4 10.5h16"/><path d="m9 14 2 2 4-4"/>',
  ligues: '<path d="M7.5 3.6h9v4.2a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.4H4.6v1.2a3 3 0 0 0 3 3"/><path d="M16.5 5.4h2.9v1.2a3 3 0 0 1-3 3"/><path d="M10.2 12.3 9.6 20.4h4.8l-.6-8.1"/><path d="M7.6 20.4h8.8"/>',
  communaute: '<circle cx="9.3" cy="8.4" r="3.3"/><path d="M3.6 19.6c0-3.1 2.6-5.2 5.7-5.2s5.7 2.1 5.7 5.2"/><path d="M15.8 5.6a3.3 3.3 0 0 1 0 5.6"/><path d="M17.4 14.9c1.9.6 3 2.3 3 4.7"/>',
  boutique: '<path d="M5.8 7.8h12.4l-1 12.6H6.8z"/><path d="M9.2 7.8V6a2.8 2.8 0 0 1 5.6 0v1.8"/>',
  profil: '<circle cx="12" cy="8.6" r="5"/><path d="M8.6 12.9 7.2 20.8 12 18.3l4.8 2.5-1.4-7.9"/>',
  room: '<path d="M4.2 9.2 12 4.8l7.8 4.4v10H4.2z"/><path d="M8.2 19.2v-6.4h7.6v6.4"/><path d="M9.6 9.7 12 11l2.4-1.3"/>',
  social: '<circle cx="8.6" cy="8.2" r="3"/><circle cx="16.4" cy="9.4" r="2.5"/><path d="M3.7 19c0-3 2.2-5 4.9-5s4.9 2 4.9 5"/><path d="M13.8 14.8c.8-.7 1.7-1 2.8-1 2.3 0 4 1.7 4 4.3"/>',
  moi: '<circle cx="12" cy="8.2" r="3.8"/><path d="M5.5 20c.5-4.1 3-6.2 6.5-6.2s6 2.1 6.5 6.2"/>',
};

const icone = (cle) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[cle] ?? ''}</svg>`;

const LIENS_DESKTOP = [
  { href: '#/accueil', libelle: 'Accueil', cle: 'accueil' },
  { href: '#/matchs', libelle: 'Matchs', cle: 'matchs' },
  { href: '#/ligues', libelle: 'Ligues', cle: 'ligues' },
  { href: '#/communaute', libelle: 'Communauté', cle: 'communaute' },
  { href: '#/room', libelle: 'Room', cle: 'room' },
  { href: '#/boutique', libelle: 'Boutique', cle: 'boutique' },
  { href: '#/profil', libelle: 'Mon profil', cle: 'profil' },
];

const LIENS_MOBILE = [
  { href: '#/accueil', libelle: 'Hub', cle: 'hub', icone: 'accueil' },
  { href: '#/matchs', libelle: 'Matchs', cle: 'matchs', icone: 'matchs' },
  { href: '#/social/ligues', libelle: 'Social', cle: 'social', icone: 'social' },
  { href: '#/room', libelle: 'Room', cle: 'room', icone: 'room', classe: 'mobile-nav__room' },
  { href: '#/profil', libelle: 'Moi', cle: 'moi', icone: 'moi' },
];

export const contexte = { utilisateur: null, admin: false, saison: null, saisons: [], frags: null, entete: null };

function chemin() {
  const h = location.hash.replace(/^#/, '');
  return h || '/accueil';
}

function ecranPourNav(nav) {
  if (nav === 'onboarding') return 'onboarding';
  if (nav === 'auth') return 'auth';
  if (nav === 'accueil') return 'hub';
  if (nav === 'matchs') return 'matchs';
  if (nav === 'ligues' || nav === 'communaute' || nav === 'social') return 'social';
  if (nav === 'room') return 'room';
  if (nav === 'boutique') return 'vault';
  if (['profil', 'parametres', 'call', 'analyste', 'badges', 'cartes'].includes(nav)) return 'moi';
  return 'system';
}

function mobilePourNav(nav) {
  const ecran = ecranPourNav(nav);
  if (ecran === 'vault') return 'room';
  return ['hub', 'matchs', 'social', 'room', 'moi'].includes(ecran) ? ecran : null;
}

async function chargerContexteEntete(navActive) {
  const extra = {};
  if (!contexte.utilisateur) return extra;

  if (navActive === 'accueil' || navActive === 'profil') {
    try {
      const bruts = await api.mesBadges();
      const badges = evaluerBadgesV2(bruts?.recap ?? {});
      const detail = xpDetailleeV2({ badges, recap: bruts?.recap ?? {} });
      extra.niveau = progressionNiveau(detail.total);
      extra.serie = Number(bruts?.recap?.serie_jours_actifs_max ?? 0);
    } catch {
      // Le header reste utilisable même si la progression est indisponible.
    }
  }

  if (navActive === 'ligues' || navActive === 'communaute' || navActive === 'social') {
    try {
      const communautes = await api.classementCommunautes();
      const idx = communautes.findIndex((c) => c.moi);
      if (idx >= 0) extra.faction = { nom: communautes[idx].nom, rang: idx + 1 };
    } catch {
      // Le social retombe sur le rating si la faction n'est pas disponible.
    }
  }

  return extra;
}

async function rafraichirEntete(navActive, desktopActive = navActive, mobileActive = mobilePourNav(navActive)) {
  contexte.saisons = await api.listerSaisons();
  contexte.saison = await api.saisonCourante();
  contexte.utilisateur = await api.utilisateurCourant();
  contexte.admin = await api.estAdmin();
  contexte.frags = null;

  if (contexte.utilisateur && contexte.saison?.id && !MODE_DEMO) {
    contexte.frags = await economyApi.etatFrags(contexte.saison.id).catch(() => null);
  }
  contexte.entete = await chargerContexteEntete(navActive);

  document.getElementById('nav-laterale').innerHTML = LIENS_DESKTOP.map((l) => `<a class="lateral__lien${l.cle === desktopActive ? ' actif' : ''}" href="${l.href}"${l.cle === desktopActive ? ' aria-current="page"' : ''}><span class="lateral__icone">${icone(l.cle)}</span><span>${l.libelle}</span></a>`).join('');
  document.getElementById('onglets').innerHTML = LIENS_MOBILE.map((l) => `<a class="mobile-nav__item${l.classe ? ` ${l.classe}` : ''}${l.cle === mobileActive ? ' actif' : ''}" href="${l.href}"${l.cle === mobileActive ? ' aria-current="page"' : ''}><span class="onglets__icone">${icone(l.icone)}</span><span class="onglets__libelle">${l.libelle}</span></a>`).join('');

  const droite = document.getElementById('entete-droite');
  if (!contexte.utilisateur) {
    if (navActive === 'onboarding') {
      droite.innerHTML = '<a class="btn btn--petit btn--fantome" href="#/connexion">Se connecter</a>';
    } else if (navActive === 'auth') {
      droite.innerHTML = '<a class="btn btn--petit btn--fantome" href="#/onboarding">Découvrir Clutch</a>';
    } else if (onboardingTermine()) {
      droite.innerHTML = '<a class="btn btn--petit" href="#/connexion">Créer mon profil</a>';
    } else {
      droite.innerHTML = '<a class="btn btn--petit" href="#/onboarding">Découvrir</a>';
    }
    return;
  }

  const pseudo = contexte.utilisateur.pseudo || contexte.utilisateur.email || '?';
  const rating = contexte.frags?.frags ?? (MODE_DEMO ? contexte.utilisateur?.solde : null) ?? 1000;
  const provisoire = contexte.frags?.provisoire ? 'Placement' : 'Saison';
  const niveau = contexte.entete?.niveau;
  const serie = contexte.entete?.serie ?? 0;
  const faction = contexte.entete?.faction;

  let contenu = '';
  if (navActive === 'accueil') {
    contenu = `${MetaChip({ label: 'Niveau', value: niveau ? `${niveau.niveau} · ${niveau.titre}` : '—', tone: 'muted' })}${MetaChip({ label: 'Série', value: `${serie} j`, tone: serie >= 3 ? 'volt' : 'default' })}`;
  } else if (navActive === 'matchs') {
    contenu = `${MetaChip({ label: provisoire, value: `${formaterFrags(rating)} Frags`, icon: jeton(16), title: 'Rating compétitif saisonnier — non dépensable.' })}`;
  } else if (navActive === 'ligues' || navActive === 'communaute' || navActive === 'social') {
    contenu = faction
      ? MetaChip({ label: 'Faction', value: `#${faction.rang} · ${faction.nom}`, tone: 'volt' })
      : MetaChip({ label: 'Rating', value: `${formaterFrags(rating)} Frags`, icon: jeton(16) });
  } else if (navActive === 'room' || navActive === 'boutique') {
    contenu = MetaChip({ label: 'Volts', value: '—', icon: jetonVolt(16), href: '#/boutique', tone: 'volt', id: 'solde-volts', title: 'Monnaie cosmétique uniquement.' });
  } else if (navActive === 'profil') {
    contenu = MetaChip({ label: 'Identité', value: niveau ? `Niv. ${niveau.niveau}` : 'Profil', tone: 'muted' });
  }

  droite.innerHTML = `<div class="context-header"><div class="context-header__label"><small>${esc(ecranPourNav(navActive))}</small><strong>${esc(contexte.saison?.nom ?? 'Clutch')}</strong></div>${contenu}${Avatar({ name: pseudo, className: mobileActive === 'moi' ? 'actif' : '' })}</div>`;

  if (navActive === 'room' || navActive === 'boutique') remplirSoldeVolts();
}

async function remplirSoldeVolts() {
  try {
    const solde = await api.soldeVolts();
    const cible = document.querySelector('#solde-volts strong');
    if (cible) cible.textContent = formaterFrags(solde ?? 0);
  } catch {
    // La monnaie cosmétique ne doit jamais bloquer l'app.
  }
}

export function bandeauSaison() {
  const s = contexte.saison;
  if (!s || s.statut === 'en_cours') return '';
  const texte = s.statut === 'terminee'
    ? `<strong>${s.nom} est terminée.</strong> Tu consultes des résultats figés : plus aucun pronostic classé n'est possible.`
    : `<strong>${s.nom} n'a pas encore commencé.</strong> Le classement saisonnier s'activera à son ouverture.`;
  return `<div class="encart encart--alerte" style="margin-bottom:20px">${texte}<a href="#/parametres">Changer de saison</a></div>`;
}

function conteneurNeuf() {
  const ancien = document.getElementById('contenu');
  const neuf = ancien.cloneNode(false);
  ancien.replaceWith(neuf);
  return neuf;
}

async function router() {
  const p = chemin();
  const entreeSansHash = !location.hash;
  const route = ROUTES.find((r) => r.motif.test(p));
  const contenu = conteneurNeuf();
  if (!route) {
    document.body.dataset.screen = 'system';
    contenu.innerHTML = '<div class="vide"><h3>Page introuvable</h3><p><a href="#/accueil">Retour à l’accueil</a></p></div>';
    return;
  }

  document.body.dataset.screen = ecranPourNav(route.nav);
  contenu.innerHTML = '<div class="chargement"><span class="spinner"></span></div>';
  try {
    await rafraichirEntete(route.nav, route.desktop ?? route.nav, route.mobile ?? mobilePourNav(route.nav));
  } catch (e) {
    console.error('[Clutch] échec du chargement initial', e);
    if (route.vue !== vueDiagnostic) {
      contenu.innerHTML = ecranPanne(e);
      return;
    }
  }

  if (entreeSansHash && !contexte.utilisateur && !onboardingTermine() && route.nav === 'accueil') {
    location.hash = '#/onboarding';
    return;
  }
  if (contexte.utilisateur && (route.nav === 'onboarding' || route.nav === 'auth')) {
    location.hash = '#/accueil';
    return;
  }

  const params = (p.match(route.motif) || []).slice(1).filter((v) => v !== undefined).map(decodeURIComponent);
  try {
    await route.vue(contenu, ...params);
  } catch (e) {
    console.error('[Clutch] échec du rendu de la vue', e);
    contenu.innerHTML = ecranPanne(e);
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function ecranPanne(erreur) {
  return `<div class="carte" style="max-width:640px;margin:40px auto;border-color:var(--danger)"><h2>Le site n'arrive pas à joindre sa base de données</h2><p style="color:var(--texte-doux)">Message renvoyé par Supabase :</p><div class="encart encart--alerte" style="margin-bottom:18px">${esc(erreur.message ?? String(erreur))}</div><p style="color:var(--texte-doux);font-size:0.9rem">La page <a href="#/diagnostic">diagnostic</a> teste chaque étape une par une.</p><a class="btn" href="#/diagnostic">Lancer le diagnostic</a></div>`;
}

// Nom historique conservé pour les imports existants. En V2 il rafraîchit le
// rating Frags et les Volts ; aucune bankroll n'est rechargée.
export async function majSolde() {
  const p = chemin();
  const route = ROUTES.find((r) => r.motif.test(p));
  await rafraichirEntete(route?.nav, route?.desktop ?? route?.nav, route?.mobile ?? mobilePourNav(route?.nav));
}

function init() {
  document.title = `${NOM_APP} — le prono esport entre potes`;
  const retour = api.capterRetourAuth?.();
  if (retour?.ok) toast('Connexion réussie, bienvenue !', 'succes');
  if (retour?.erreur) toast(retour.erreur, 'erreur');
  if (MODE_DEMO) {
    const bandeau = document.getElementById('bandeau-demo');
    bandeau.hidden = false;
    document.getElementById('reset-demo').addEventListener('click', async () => {
      await api.reinitialiser();
      toast('Démo réinitialisée.', 'succes');
      location.hash = '#/accueil';
      router();
    });
  }
  window.addEventListener('hashchange', router);
  router();
}

init();