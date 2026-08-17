/** Clutch — routeur et ossature globale. */
import * as api from './api.js';
import * as economyApi from './economy-api.js';
import { MODE_DEMO, NOM_APP } from './config.js';
import { esc, jeton, jetonVolt, toast } from './ui.js';
import { formaterFrags } from './core.js';

import { vueAccueil } from './views/accueil.js';
import { vueMatchs } from './views/matchs.js';
import { vueMatch } from './views/match.js';
import { vueLigues } from './views/ligues.js';
import { vueLigue } from './views/ligue.js';
import { vueProfil } from './views/profil.js';
import { vueCommunaute } from './views/communaute.js';
import { vueBoutique } from './views/boutique.js';
import { vueParametres } from './views/parametres.js';
import { vueCall } from './views/call.js';
import { vueAnalyste } from './views/analyste.js';
import { vueBadges } from './views/badges.js';
import { vueCartes } from './views/cartes.js';
import { vueAdmin } from './views/admin.js';
import { vueConnexion } from './views/connexion.js';
import { vueDiagnostic } from './views/diagnostic.js';

const ROUTES = [
  { motif: /^\/accueil$/, vue: vueAccueil, nav: 'accueil' },
  { motif: /^\/matchs$/, vue: vueMatchs, nav: 'matchs' },
  { motif: /^\/matchs\/(.+)$/, vue: vueMatch, nav: 'matchs' },
  { motif: /^\/ligues$/, vue: vueLigues, nav: 'ligues' },
  { motif: /^\/ligues\/(.+)$/, vue: vueLigue, nav: 'ligues' },
  { motif: /^\/classement$/, vue: (r) => vueLigues(r, 'global'), nav: 'ligues' },
  { motif: /^\/communaute$/, vue: vueCommunaute, nav: 'communaute' },
  { motif: /^\/boutique$/, vue: vueBoutique, nav: 'boutique' },
  { motif: /^\/profil$/, vue: vueProfil, nav: 'profil' },
  { motif: /^\/parametres$/, vue: vueParametres, nav: 'parametres' },
  { motif: /^\/call$/, vue: vueCall, nav: 'call' },
  { motif: /^\/analyste$/, vue: vueAnalyste, nav: 'profil' },
  { motif: /^\/badges$/, vue: vueBadges, nav: 'profil' },
  { motif: /^\/cartes$/, vue: vueCartes, nav: 'profil' },
  { motif: /^\/admin$/, vue: vueAdmin, nav: null },
  { motif: /^\/connexion$/, vue: vueConnexion, nav: null },
  { motif: /^\/diagnostic$/, vue: vueDiagnostic, nav: null },
];

const ICONES = {
  accueil: '<path d="M4 11.3 12 4l8 7.3"/><path d="M6.7 10.2v9.3h10.6v-9.3"/><path d="M10 19.5v-5.2h4v5.2"/><path d="M18.4 4.6v3.6"/>',
  matchs: '<path d="M4 7.5h16v11H4z"/><path d="M8 4.5v3M16 4.5v3M4 10.5h16"/><path d="m9 14 2 2 4-4"/>',
  ligues: '<path d="M7.5 3.6h9v4.2a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.4H4.6v1.2a3 3 0 0 0 3 3"/><path d="M16.5 5.4h2.9v1.2a3 3 0 0 1-3 3"/><path d="M10.2 12.3 9.6 20.4h4.8l-.6-8.1"/><path d="M7.6 20.4h8.8"/>',
  communaute: '<circle cx="9.3" cy="8.4" r="3.3"/><path d="M3.6 19.6c0-3.1 2.6-5.2 5.7-5.2s5.7 2.1 5.7 5.2"/><path d="M15.8 5.6a3.3 3.3 0 0 1 0 5.6"/><path d="M17.4 14.9c1.9.6 3 2.3 3 4.7"/>',
  boutique: '<path d="M5.8 7.8h12.4l-1 12.6H6.8z"/><path d="M9.2 7.8V6a2.8 2.8 0 0 1 5.6 0v1.8"/>',
  profil: '<circle cx="12" cy="8.6" r="5"/><path d="M8.6 12.9 7.2 20.8 12 18.3l4.8 2.5-1.4-7.9"/>',
};

const icone = (cle) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[cle] ?? ''}</svg>`;

const LIENS = [
  { href: '#/accueil', libelle: 'Accueil', court: 'Accueil', cle: 'accueil' },
  { href: '#/matchs', libelle: 'Matchs', court: 'Matchs', cle: 'matchs' },
  { href: '#/ligues', libelle: 'Ligues', court: 'Ligues', cle: 'ligues' },
  { href: '#/communaute', libelle: 'Communauté', court: 'Commu.', cle: 'communaute' },
  { href: '#/boutique', libelle: 'Boutique', court: 'Shop', cle: 'boutique' },
  { href: '#/profil', libelle: 'Mon profil', court: 'Moi', cle: 'profil' },
];

export const contexte = { utilisateur: null, admin: false, saison: null, saisons: [], frags: null };

function chemin() {
  const h = location.hash.replace(/^#/, '');
  return h || '/accueil';
}

async function rafraichirEntete(navActive) {
  contexte.saisons = await api.listerSaisons();
  contexte.saison = await api.saisonCourante();
  contexte.utilisateur = await api.utilisateurCourant();
  contexte.admin = await api.estAdmin();
  contexte.frags = null;

  if (contexte.utilisateur && contexte.saison?.id && !MODE_DEMO) {
    contexte.frags = await economyApi.etatFrags(contexte.saison.id).catch(() => null);
  }

  document.getElementById('nav-laterale').innerHTML = LIENS.map((l) => `<a class="lateral__lien${l.cle === navActive ? ' actif' : ''}" href="${l.href}"${l.cle === navActive ? ' aria-current="page"' : ''}><span class="lateral__icone">${icone(l.cle)}</span><span>${l.libelle}</span></a>`).join('');
  document.getElementById('onglets').innerHTML = LIENS.map((l) => `<a href="${l.href}"${l.cle === navActive ? ' class="actif" aria-current="page"' : ''}><span class="onglets__icone">${icone(l.cle)}</span><span class="onglets__libelle">${l.court}</span></a>`).join('');

  const droite = document.getElementById('entete-droite');
  // En production, aucun fallback vers l'ancienne bankroll : une panne du RPC
  // ne doit jamais ressusciter `participations.solde` comme monnaie de jeu.
  const fragsAffiches = contexte.frags?.frags ?? (MODE_DEMO ? contexte.utilisateur?.solde : null) ?? 1000;
  const statutFrags = contexte.frags?.provisoire ? ' · placement provisoire' : '';
  droite.innerHTML = contexte.utilisateur
    ? `<div class="soldes">
         <div class="solde" title="Frags — ton rating compétitif de ${esc(contexte.saison?.nom ?? 'la saison')}${esc(statutFrags)}. Ils ne se dépensent jamais.">
           ${jeton(19)}<span class="solde__valeur">${esc(formaterFrags(fragsAffiches))}</span><span class="solde__unite">Frags</span>
         </div>
         <a class="solde solde--volts" href="#/boutique" id="solde-volts" title="Volts — la seule monnaie dépensable dans la Boutique. Ton classement n'en dépend pas.">
           ${jetonVolt(19)}<span class="solde__valeur">—</span><span class="solde__unite">Volts</span>
         </a>
       </div>
       <a class="avatar${navActive === 'profil' ? ' actif' : ''}" href="#/profil" title="${esc(contexte.utilisateur.pseudo ?? 'Mon profil')}" aria-label="Mon profil">${esc(initiales(contexte.utilisateur.pseudo || contexte.utilisateur.email || '?'))}</a>`
    : '<a class="btn btn--petit" href="#/connexion">Jouer</a>';

  if (contexte.utilisateur) remplirSoldeVolts();
}

async function remplirSoldeVolts() {
  try {
    const solde = await api.soldeVolts();
    const cible = document.querySelector('#solde-volts .solde__valeur');
    if (cible) cible.textContent = formaterFrags(solde ?? 0);
  } catch {
    // La monnaie cosmétique ne doit jamais bloquer l'app.
  }
}

function initiales(nom) {
  const mots = String(nom).trim().split(/[\s._-]+/).filter(Boolean);
  if (!mots.length) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
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
  const route = ROUTES.find((r) => r.motif.test(p));
  const contenu = conteneurNeuf();
  if (!route) {
    contenu.innerHTML = '<div class="vide"><h3>Page introuvable</h3><p><a href="#/accueil">Retour à l’accueil</a></p></div>';
    return;
  }
  contenu.innerHTML = '<div class="chargement"><span class="spinner"></span></div>';
  try {
    await rafraichirEntete(route.nav);
  } catch (e) {
    console.error('[Clutch] échec du chargement initial', e);
    if (route.vue !== vueDiagnostic) {
      contenu.innerHTML = ecranPanne(e);
      return;
    }
  }
  const params = (p.match(route.motif) || []).slice(1).map(decodeURIComponent);
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
  await rafraichirEntete(route?.nav);
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
