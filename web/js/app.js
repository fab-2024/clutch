/**
 * Point d'entrée : routeur à base de hash, rendu de l'ossature (entête,
 * solde, navigation) et montage de la vue courante.
 *
 * Pas de framework : chaque vue est une fonction async qui reçoit le
 * conteneur et ses paramètres, et qui écrit dedans.
 */

import * as api from './api.js';
import { MODE_DEMO, NOM_APP } from './config.js';
import { esc, toast } from './ui.js';
import { formaterFrags } from './core.js';

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
  { motif: /^\/matchs$/, vue: vueMatchs, nav: 'matchs' },
  { motif: /^\/matchs\/(.+)$/, vue: vueMatch, nav: 'matchs' },
  { motif: /^\/ligues$/, vue: vueLigues, nav: 'ligues' },
  { motif: /^\/ligues\/(.+)$/, vue: vueLigue, nav: 'ligues' },
  // Le classement global n'a plus d'entrée à lui : il est devenu le premier
  // onglet de « Ligues ». L'adresse reste valide — les liens déjà partagés
  // dans un Discord ne doivent pas tomber sur une page introuvable.
  { motif: /^\/classement$/, vue: (r) => vueLigues(r, 'global'), nav: 'ligues' },
  { motif: /^\/communaute$/, vue: vueCommunaute, nav: 'communaute' },
  { motif: /^\/boutique$/, vue: vueBoutique, nav: 'boutique' },
  { motif: /^\/profil$/, vue: vueProfil, nav: 'profil' },
  { motif: /^\/parametres$/, vue: vueParametres, nav: 'parametres' },
  { motif: /^\/call$/, vue: vueCall, nav: 'call' },
  { motif: /^\/analyste$/, vue: vueAnalyste, nav: 'profil' },
  { motif: /^\/badges$/, vue: vueBadges, nav: 'profil' },
  { motif: /^\/cartes$/, vue: vueCartes, nav: 'profil' },
  { motif: /^\/admin$/, vue: vueAdmin, nav: 'admin' },
  { motif: /^\/connexion$/, vue: vueConnexion, nav: null },
  { motif: /^\/diagnostic$/, vue: vueDiagnostic, nav: null },
];

/* -------------------------------------------------------------------------
   NAVIGATION

   Cinq entrées, dessinées d'après la maquette : le calendrier, les
   classements, les communautés, la boutique et soi. Elles vivent dans une
   colonne à gauche sur ordinateur — toujours visible, on sait où on est —
   et dans une barre en bas du pouce sur téléphone.

   « Mon call » n'y figure pas : il ne se pose qu'avant le début d'un tournoi,
   donc lui donner une place permanente revenait à l'offrir à quelque chose
   d'indisponible neuf fois sur dix. Il vit en haut du calendrier tant qu'il
   est posable, et sur le profil une fois posé. Badges, cartes et profil
   d'analyste sont regroupés dans « Mon profil ».
   ------------------------------------------------------------------------- */

/** Icônes tracées à la main, en trait : aucune police d'icônes à télécharger. */
const ICONES = {
  matchs: '<path d="M3 10.6 12 3.2l9 7.4"/><path d="M5.8 9.4V20.4h12.4V9.4"/><path d="M9.6 20.4v-6h4.8v6"/>',
  ligues: '<path d="M7.5 3.6h9v4.2a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 5.4H4.6v1.2a3 3 0 0 0 3 3"/><path d="M16.5 5.4h2.9v1.2a3 3 0 0 1-3 3"/><path d="M10.2 12.3 9.6 20.4h4.8l-.6-8.1"/><path d="M7.6 20.4h8.8"/>',
  communaute: '<circle cx="9.3" cy="8.4" r="3.3"/><path d="M3.6 19.6c0-3.1 2.6-5.2 5.7-5.2s5.7 2.1 5.7 5.2"/><path d="M15.8 5.6a3.3 3.3 0 0 1 0 5.6"/><path d="M17.4 14.9c1.9.6 3 2.3 3 4.7"/>',
  boutique: '<path d="M5.8 7.8h12.4l-1 12.6H6.8z"/><path d="M9.2 7.8V6a2.8 2.8 0 0 1 5.6 0v1.8"/>',
  profil: '<circle cx="12" cy="8.6" r="5"/><path d="M8.6 12.9 7.2 20.8 12 18.3l4.8 2.5-1.4-7.9"/>',
  admin: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2M12 19.5v2M4.2 7.2l1.7 1M18.1 15.8l1.7 1M4.2 16.8l1.7-1M18.1 8.2l1.7-1"/>',
};

const icone = (cle) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[cle] ?? ''}</svg>`;

const LIENS = [
  { href: '#/matchs', libelle: 'Matchs', court: 'Matchs', cle: 'matchs' },
  { href: '#/ligues', libelle: 'Ligues', court: 'Ligues', cle: 'ligues' },
  { href: '#/communaute', libelle: 'Communauté', court: 'Commu.', cle: 'communaute' },
  { href: '#/boutique', libelle: 'Boutique', court: 'Boutique', cle: 'boutique' },
  { href: '#/profil', libelle: 'Mon profil', court: 'Moi', cle: 'profil' },
];

export const contexte = { utilisateur: null, admin: false, saison: null, saisons: [] };

function chemin() {
  const h = location.hash.replace(/^#/, '');
  return h || '/matchs';
}

async function rafraichirEntete(navActive) {
  contexte.saisons = await api.listerSaisons();
  contexte.saison = await api.saisonCourante();
  contexte.utilisateur = await api.utilisateurCourant();
  contexte.admin = await api.estAdmin();
  await rattraperUneFois();

  const liens = [...LIENS];
  if (contexte.admin) liens.push({ href: '#/admin', libelle: 'Admin', court: 'Admin', cle: 'admin' });

  // Deux rendus du même menu : la colonne de gauche et la barre du bas. C'est
  // le CSS qui décide lequel s'affiche, selon la largeur de l'écran.
  document.getElementById('nav-laterale').innerHTML = liens
    .map(
      (l) => `<a class="lateral__lien${l.cle === navActive ? ' actif' : ''}" href="${l.href}"${
        l.cle === navActive ? ' aria-current="page"' : ''
      }>
        <span class="lateral__icone">${icone(l.cle)}</span>
        <span>${l.libelle}</span>
      </a>`
    )
    .join('');

  document.getElementById('onglets').innerHTML = liens
    .map(
      (l) => `<a href="${l.href}"${l.cle === navActive ? ' class="actif" aria-current="page"' : ''}>
        <span class="onglets__icone">${icone(l.cle)}</span>
        <span class="onglets__libelle">${l.court}</span>
      </a>`
    )
    .join('');

  // L'en-tête ne porte plus que l'essentiel : combien j'ai, et qui je suis.
  // Le sélecteur de saison est parti dans les paramètres — on en change trois
  // fois par an, il n'avait rien à faire sur toutes les pages.
  const droite = document.getElementById('entete-droite');
  droite.innerHTML = contexte.utilisateur
    ? `<div class="solde" title="Solde de ${esc(contexte.saison?.nom ?? 'la saison')}. Monnaie fictive, sans valeur.">
         <span class="solde__valeur">${esc(formaterFrags(contexte.utilisateur.solde))}</span>
         <span class="solde__unite">Frags</span>
       </div>
       <a class="avatar${navActive === 'profil' ? ' actif' : ''}" href="#/profil"
          title="${esc(contexte.utilisateur.pseudo ?? 'Mon profil')}" aria-label="Mon profil">${esc(
            initiales(contexte.utilisateur.pseudo || contexte.utilisateur.email || '?')
          )}</a>`
    : `<a class="btn btn--petit" href="#/connexion">Jouer</a>`;
}

/** « NovaKill » → « NO », « Pierre Louis » → « PL ». */
function initiales(nom) {
  const mots = String(nom).trim().split(/[\s._-]+/).filter(Boolean);
  if (!mots.length) return '?';
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

/**
 * Rattrapage des paris automatiques, une seule fois par chargement de page.
 *
 * Sans ça, un joueur qui a activé le prono par défaut ne verrait sa mise
 * qu'après le règlement du match. Un échec ici ne doit jamais empêcher
 * l'application de s'afficher : c'est un confort, pas une dépendance.
 */
let rattrapageFait = false;
async function rattraperUneFois() {
  if (rattrapageFait || !contexte.utilisateur) return;
  if ((contexte.utilisateur.pari_auto_mode ?? 'off') === 'off') return;
  rattrapageFait = true;
  try {
    const r = await api.rattraperParisAuto();
    const poses = r?.poses ?? 0;
    if (poses) {
      toast(`${poses} pari(s) posé(s) automatiquement sur les matchs commencés.`, 'succes');
      contexte.utilisateur = await api.utilisateurCourant();
    }
  } catch (e) {
    console.warn('[Clutch] rattrapage des paris automatiques impossible', e);
  }
}

/** Bandeau affiché quand on consulte une saison qui n'est pas en cours. */
export function bandeauSaison() {
  const s = contexte.saison;
  if (!s || s.statut === 'en_cours') return '';
  const texte =
    s.statut === 'terminee'
      ? `<strong>${s.nom} est terminée.</strong> Tu consultes des résultats figés : plus aucune mise n'est possible.`
      : `<strong>${s.nom} n'a pas encore commencé.</strong> Les soldes repartiront à zéro à son ouverture.`;
  return `<div class="encart encart--alerte" style="margin-bottom:20px">${texte}
    <a href="#/parametres">Changer de saison</a></div>`;
}

/**
 * Rend un conteneur NEUF à chaque vue.
 *
 * Les vues attachent leurs écouteurs sur le conteneur, pas sur les éléments
 * qu'elles créent — c'est ce que fait surClic(), et c'est la bonne pratique
 * pour du HTML régénéré. Mais remplacer innerHTML ne détruit pas les écouteurs
 * du conteneur lui-même : à la deuxième visite d'un écran, ils s'empilaient, et
 * un seul clic déclenchait le gestionnaire deux fois.
 *
 * Conséquence concrète, trouvée par le test de bout en bout : le bouton
 * « Annuler ce match » sautait sa confirmation et annulait au premier clic.
 * Cloner le nœud emporte tous ses écouteurs avec lui.
 */
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
    contenu.innerHTML = `<div class="vide"><h3>Page introuvable</h3><p><a href="#/matchs">Retour aux matchs</a></p></div>`;
    return;
  }

  contenu.innerHTML = '<div class="chargement"><span class="spinner"></span></div>';

  // Tout ce qui suit peut échouer si Supabase ne répond pas. Sans ce filet,
  // l'utilisateur reste devant un rond qui tourne sans jamais savoir pourquoi.
  try {
    await rafraichirEntete(route.nav);
  } catch (e) {
    console.error('[Clutch] échec du chargement initial', e);
    // Le diagnostic doit rester accessible même quand la base est injoignable :
    // c'est précisément là qu'on en a besoin.
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

/** Écran affiché quand l'application ne peut pas se charger. */
function ecranPanne(erreur) {
  return `
    <div class="carte" style="max-width:640px;margin:40px auto;border-color:var(--danger)">
      <h2>Le site n'arrive pas à joindre sa base de données</h2>
      <p style="color:var(--texte-doux)">Message renvoyé par Supabase :</p>
      <div class="encart encart--alerte" style="margin-bottom:18px">${erreur.message}</div>
      <p style="color:var(--texte-doux);font-size:0.9rem">
        La page <a href="#/diagnostic">diagnostic</a> teste chaque étape une par une
        et te dit précisément laquelle bloque.
      </p>
      <a class="btn" href="#/diagnostic">Lancer le diagnostic</a>
    </div>`;
}

/** Redemande à l'ossature de se mettre à jour (après un pari, une prime...). */
export async function majSolde() {
  const p = chemin();
  const route = ROUTES.find((r) => r.motif.test(p));
  await rafraichirEntete(route?.nav);
}

function init() {
  document.title = `${NOM_APP} — le prono esport entre potes`;

  // Un clic sur le lien reçu par e-mail nous ramène ici avec les jetons dans
  // l'adresse. On les récupère AVANT le premier rendu, sinon l'utilisateur
  // atterrit sur une page « introuvable » alors qu'il vient de se connecter.
  const retour = api.capterRetourAuth?.();
  if (retour?.ok) toast('Connexion réussie, bienvenue !', 'succes');
  if (retour?.erreur) toast(retour.erreur, 'erreur');

  if (MODE_DEMO) {
    const bandeau = document.getElementById('bandeau-demo');
    bandeau.hidden = false;
    document.getElementById('reset-demo').addEventListener('click', async () => {
      await api.reinitialiser();
      toast('Démo réinitialisée.', 'succes');
      location.hash = '#/matchs';
      router();
    });
  }

  window.addEventListener('hashchange', router);
  router();
}

init();
