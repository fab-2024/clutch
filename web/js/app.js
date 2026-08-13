/**
 * Point d'entrée : routeur à base de hash, rendu de l'ossature (entête,
 * solde, navigation) et montage de la vue courante.
 *
 * Pas de framework : chaque vue est une fonction async qui reçoit le
 * conteneur et ses paramètres, et qui écrit dedans.
 */

import * as api from './api.js';
import { MODE_DEMO, NOM_APP } from './config.js';
import { frags, toast } from './ui.js';

import { vueMatchs } from './views/matchs.js';
import { vueMatch } from './views/match.js';
import { vueLigues } from './views/ligues.js';
import { vueLigue } from './views/ligue.js';
import { vueClassement } from './views/classement.js';
import { vueProfil } from './views/profil.js';
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
  { motif: /^\/classement$/, vue: vueClassement, nav: 'classement' },
  { motif: /^\/profil$/, vue: vueProfil, nav: 'profil' },
  { motif: /^\/call$/, vue: vueCall, nav: 'call' },
  { motif: /^\/analyste$/, vue: vueAnalyste, nav: 'profil' },
  { motif: /^\/badges$/, vue: vueBadges, nav: 'profil' },
  { motif: /^\/cartes$/, vue: vueCartes, nav: 'profil' },
  { motif: /^\/admin$/, vue: vueAdmin, nav: 'admin' },
  { motif: /^\/connexion$/, vue: vueConnexion, nav: null },
  { motif: /^\/diagnostic$/, vue: vueDiagnostic, nav: null },
];

/**
 * Quatre entrées, pas sept.
 *
 * « Mon call » a quitté le menu : il ne se pose qu'avant le début d'un tournoi,
 * donc lui donner la place la plus chère de l'écran revenait à l'offrir à
 * quelque chose d'indisponible neuf fois sur dix. Il vit désormais en haut du
 * calendrier tant qu'il est posable, et sur le profil une fois posé.
 *
 * Badges, cartes et profil d'analyste étaient des culs-de-sac que personne
 * n'aurait découverts : ils sont regroupés sous « Moi ».
 */
const LIENS = [
  { href: '#/matchs', libelle: 'Matchs', cle: 'matchs', icone: '◇' },
  { href: '#/ligues', libelle: 'Ligues', cle: 'ligues', icone: '◈' },
  { href: '#/classement', libelle: 'Classement', cle: 'classement', icone: '▲' },
  { href: '#/profil', libelle: 'Moi', cle: 'profil', icone: '●' },
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
  if (contexte.admin) liens.push({ href: '#/admin', libelle: 'Admin', cle: 'admin', icone: '⚙' });

  document.getElementById('onglets').innerHTML = liens
    .map(
      (l) => `<a href="${l.href}"${l.cle === navActive ? ' class="actif"' : ''}>
        <span class="onglets__pastille" aria-hidden="true"></span>
        <span>${l.libelle}</span>
      </a>`
    )
    .join('');

  const droite = document.getElementById('entete-droite');
  const selecteur = !contexte.saisons.length
    ? ''
    : `
    <select class="selecteur-saison" id="selecteur-saison" aria-label="Choisir la saison">
      ${contexte.saisons
        .map(
          (s) =>
            `<option value="${s.id}"${s.id === contexte.saison?.id ? ' selected' : ''}>${s.nom}${
              s.statut === 'terminee' ? ' (terminée)' : s.statut === 'a_venir' ? ' (à venir)' : ''
            }</option>`
        )
        .join('')}
    </select>`;

  droite.innerHTML =
    selecteur +
    (contexte.utilisateur
      ? `<div class="solde" title="Solde de la saison en cours. Monnaie fictive, sans valeur.">
           <span class="solde__valeur">${frags(contexte.utilisateur.solde).split(' ').slice(0, -1).join(' ')}</span>
           <span class="solde__unite">Frags</span>
         </div>`
      : `<a class="btn btn--petit" href="#/connexion">Jouer</a>`);

  document.getElementById('selecteur-saison')?.addEventListener('change', async (e) => {
    await api.choisirSaison(e.target.value);
    router();
  });
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
  return `<div class="encart encart--alerte" style="margin-bottom:20px">${texte}</div>`;
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
