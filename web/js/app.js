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
import { vueAdmin } from './views/admin.js';
import { vueConnexion } from './views/connexion.js';

const ROUTES = [
  { motif: /^\/matchs$/, vue: vueMatchs, nav: 'matchs' },
  { motif: /^\/matchs\/(.+)$/, vue: vueMatch, nav: 'matchs' },
  { motif: /^\/ligues$/, vue: vueLigues, nav: 'ligues' },
  { motif: /^\/ligues\/(.+)$/, vue: vueLigue, nav: 'ligues' },
  { motif: /^\/classement$/, vue: vueClassement, nav: 'classement' },
  { motif: /^\/profil$/, vue: vueProfil, nav: 'profil' },
  { motif: /^\/admin$/, vue: vueAdmin, nav: 'admin' },
  { motif: /^\/connexion$/, vue: vueConnexion, nav: null },
];

const LIENS = [
  { href: '#/matchs', libelle: 'Matchs', cle: 'matchs' },
  { href: '#/ligues', libelle: 'Mes ligues', cle: 'ligues' },
  { href: '#/classement', libelle: 'Classement', cle: 'classement' },
  { href: '#/profil', libelle: 'Mes paris', cle: 'profil' },
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

  const nav = document.getElementById('nav');
  const liens = [...LIENS];
  if (contexte.admin) liens.push({ href: '#/admin', libelle: 'Admin', cle: 'admin' });
  nav.innerHTML = liens
    .map((l) => `<a href="${l.href}"${l.cle === navActive ? ' class="actif"' : ''}>${l.libelle}</a>`)
    .join('');

  const droite = document.getElementById('entete-droite');
  const selecteur = `
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

  document.getElementById('selecteur-saison').addEventListener('change', async (e) => {
    await api.choisirSaison(e.target.value);
    router();
  });
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

async function router() {
  const p = chemin();
  const route = ROUTES.find((r) => r.motif.test(p));
  const contenu = document.getElementById('contenu');

  if (!route) {
    contenu.innerHTML = `<div class="vide"><h3>Page introuvable</h3><p><a href="#/matchs">Retour aux matchs</a></p></div>`;
    return;
  }

  contenu.innerHTML = '<div class="chargement"><span class="spinner"></span></div>';
  await rafraichirEntete(route.nav);

  const params = (p.match(route.motif) || []).slice(1).map(decodeURIComponent);
  try {
    await route.vue(contenu, ...params);
  } catch (e) {
    console.error(e);
    contenu.innerHTML = `<div class="vide"><h3>Oups</h3><p>${e.message}</p></div>`;
  }
  document.getElementById('nav')?.classList.remove('ouvert');
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/** Redemande à l'ossature de se mettre à jour (après un pari, une prime...). */
export async function majSolde() {
  const p = chemin();
  const route = ROUTES.find((r) => r.motif.test(p));
  await rafraichirEntete(route?.nav);
}

function init() {
  document.title = `${NOM_APP} — le prono esport entre potes`;

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

  document.getElementById('burger').addEventListener('click', (e) => {
    const nav = document.getElementById('nav');
    const ouvert = nav.classList.toggle('ouvert');
    e.currentTarget.setAttribute('aria-expanded', String(ouvert));
  });

  window.addEventListener('hashchange', router);
  router();
}

init();
