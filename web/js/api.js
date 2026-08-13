/**
 * Couche d'accès aux données.
 *
 * Expose une API unique à toute l'interface, et choisit tout seul son backend :
 *   - MODE DÉMO   -> store.js (localStorage), si config.js n'a pas de clés
 *   - PRODUCTION  -> Supabase, via son API REST et ses fonctions RPC
 *
 * L'interface (les vues) ne sait pas lequel des deux tourne. C'est ce qui
 * permet de développer et de démontrer le produit sans serveur, puis de
 * basculer en production en collant deux clés dans config.js.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY, MODE_DEMO, ADMINS } from './config.js';
import * as demo from './store.js';
import { evaluerBadges, carteMeritee } from './core.js';

/* ------------------------------------------------------------------ */
/* Client Supabase minimal (aucune dépendance, ~80 lignes)             */
/* ------------------------------------------------------------------ */

/**
 * Adresse de base, normalisée. Le tableau de bord Supabase affiche deux
 * adresses très proches — la « Project URL » (https://xxx.supabase.co) et le
 * « RESTful endpoint » (https://xxx.supabase.co/rest/v1/) — et coller la
 * seconde produisait une URL en double, illisible à déboguer. On rattrape
 * donc le cas plutôt que de le sanctionner.
 */
export const BASE = SUPABASE_URL.trim()
  .replace(/\/+$/, '')
  .replace(/\/rest\/v1$/, '')
  .replace(/\/auth\/v1$/, '');

const CLE_SESSION = 'clutch.session';

/** Au-delà, on considère que Supabase ne répondra pas. */
const DELAI_MAX_MS = 12000;

/**
 * fetch avec délai d'attente. Sans ça, une requête qui n'aboutit jamais
 * (projet en pause, réseau filtré, DNS qui pend) laisse l'interface bloquée
 * sur son indicateur de chargement, pour toujours.
 */
async function fetchLimite(url, options = {}, delai = DELAI_MAX_MS) {
  const minuteur = new AbortController();
  const stop = setTimeout(() => minuteur.abort(), delai);
  try {
    return await fetch(url, { ...options, signal: minuteur.signal });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(
        `Supabase n'a pas répondu en ${delai / 1000} secondes. ` +
          'Le projet est probablement en pause : ouvre-le sur supabase.com pour le réveiller.'
      );
    }
    throw e;
  } finally {
    clearTimeout(stop);
  }
}

function session() {
  try {
    return JSON.parse(localStorage.getItem(CLE_SESSION) || 'null');
  } catch {
    return null;
  }
}

function poserSession(s) {
  if (s) localStorage.setItem(CLE_SESSION, JSON.stringify(s));
  else localStorage.removeItem(CLE_SESSION);
}

/**
 * Les chemins qui ne doivent JAMAIS déclencher un rafraîchissement de session :
 * ce sont ceux qui servent précisément à en obtenir une. Sans cette liste, le
 * rafraîchissement s'appellerait lui-même à l'infini.
 */
const SANS_RAFRAICHISSEMENT = /^\/auth\/v1\/(token|signup|otp)/;

async function sb(chemin, { methode = 'GET', corps = null, entetes = {} } = {}) {
  // Un jeton d'accès Supabase vit une heure. On le rafraîchit ici, avant
  // CHAQUE requête, et pas seulement dans utilisateurCourant().
  //
  // C'était le bug : passé une heure, toutes les autres requêtes partaient
  // encore avec le jeton périmé, Supabase répondait 401 « JWT expired », et
  // l'application accusait la clé publique — qui n'y était pour rien. Le
  // symptôme était d'autant plus déroutant que « Ma session » restait au vert :
  // elle, elle passait bien par le rafraîchissement.
  const s = SANS_RAFRAICHISSEMENT.test(chemin) ? session() : await sessionValide();
  let reponse;
  try {
    reponse = await fetchLimite(`${BASE}${chemin}`, {
      method: methode,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${s?.access_token || SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        ...entetes,
      },
      body: corps ? JSON.stringify(corps) : undefined,
    });
  } catch (e) {
    // La requête n'a même pas abouti : mauvaise URL, projet en pause, réseau
    // filtré, ou délai dépassé. Le message brut du navigateur
    // ("Failed to fetch") ne dit rien à personne.
    if (/n'a pas répondu/.test(e.message)) throw e; // délai dépassé, message déjà clair
    throw new Error(
      `Impossible de joindre Supabase à l'adresse ${BASE} — ` +
        'vérifie SUPABASE_URL dans config.js, et que le projet ne soit pas en pause sur supabase.com'
    );
  }
  const texte = await reponse.text();
  let donnees = null;
  try {
    donnees = texte ? JSON.parse(texte) : null;
  } catch {
    donnees = { message: texte.slice(0, 200) };
  }

  if (!reponse.ok) {
    const detail = donnees?.message || donnees?.error_description || donnees?.hint || '';
    const erreur = new Error(`${explication(reponse.status, detail)}${detail ? ` (${detail})` : ''}`);
    erreur.statut = reponse.status;
    erreur.chemin = chemin;
    throw erreur;
  }
  return donnees;
}

/**
 * Traduit un code HTTP Supabase en cause probable. Sans ça, un « Erreur 404 »
 * ne dit rien à quelqu'un qui n'a pas écrit le code.
 */
function explication(statut, detail = '') {
  if (/signups? not allowed|signup_disabled/i.test(detail)) {
    return 'Les inscriptions sont désactivées : active-les dans Authentication → Sign In / Providers';
  }
  if (/email logins are disabled|email_provider_disabled/i.test(detail)) {
    return "La connexion par e-mail est désactivée : active le fournisseur Email dans Authentication → Sign In / Providers";
  }
  if (statut === 429 || /only request this after|rate limit|too many/i.test(detail)) {
    return "Trop de demandes : Supabase ne laisse partir que quelques e-mails par heure. Crée plutôt ton compte avec un mot de passe, ça n'envoie aucun e-mail.";
  }
  if (/invalid login credentials/i.test(detail)) {
    return 'Adresse ou mot de passe incorrect.';
  }
  if (/email not confirmed|email_not_confirmed/i.test(detail)) {
    return (
      "Ce compte existe mais n'est pas confirmé. La confirmation par e-mail est encore " +
      'activée dans Supabase : désactive « Confirm email » dans Authentication → ' +
      'Sign In / Providers → Email, puis confirme ce compte à la main dans Authentication → Users.'
    );
  }
  if (/user already registered/i.test(detail)) {
    return 'Un compte existe déjà avec cette adresse : connecte-toi plutôt.';
  }
  if (/password should be at least/i.test(detail)) {
    return 'Mot de passe trop court : 6 caractères minimum.';
  }
  if (/redirect|not allowed/i.test(detail) && statut === 400) {
    return "Adresse de retour non autorisée : ajoute l'adresse de ton site dans Authentication → URL Configuration";
  }
  if (/error sending|smtp/i.test(detail)) {
    return "Supabase n'a pas pu envoyer l'e-mail. Le service gratuit n'écrit qu'aux adresses de l'équipe du projet : utilise l'adresse de ton compte Supabase, ou configure un SMTP.";
  }
  if (/jwt expired|token is expired/i.test(detail)) {
    return 'Ta session a expiré. Recharge la page : elle se renouvellera toute seule. Si le message revient, déconnecte-toi puis reconnecte-toi.';
  }
  if (statut === 401) return 'Clé Supabase refusée : vérifie SUPABASE_ANON_KEY dans config.js';
  if (statut === 403) return 'Accès refusé par les règles de sécurité : 03_securite.sql a-t-il été exécuté ?';
  if (statut === 404) return "Table ou fonction absente : les fichiers SQL n'ont pas tous été exécutés";
  if (statut === 400 && /does not exist|schema cache/i.test(detail)) {
    return 'La base ne correspond pas au code : réexécute les fichiers SQL 01 à 04 dans l\'ordre';
  }
  if (/infinite recursion detected in policy/i.test(detail)) {
    return (
      'Règles de sécurité en boucle dans la base : exécute supabase/07_correctif_rls.sql ' +
      "dans le SQL Editor. Tant qu'elles bouclent, aucune table n'est lisible."
    );
  }
  if (statut >= 500) return 'Supabase ne répond pas correctement (projet en pause ?)';
  return `Erreur ${statut}`;
}

/**
 * Session valide, rafraîchie si le jeton d'accès arrive à expiration.
 * Un jeton Supabase vit une heure : sans ce rafraîchissement, l'utilisateur
 * se retrouve déconnecté au bout d'une heure, sans comprendre pourquoi.
 */
async function sessionValide() {
  const s = session();
  if (!s) return null;
  const marge = 60; // secondes
  if (s.expires_at && s.expires_at > Date.now() / 1000 + marge) return s;
  if (!s.refresh_token) {
    poserSession(null);
    return null;
  }
  try {
    const r = await sb('/auth/v1/token?grant_type=refresh_token', {
      methode: 'POST',
      corps: { refresh_token: s.refresh_token },
    });
    poserSession({
      access_token: r.access_token,
      refresh_token: r.refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + (r.expires_in || 3600),
    });
    return session();
  } catch {
    poserSession(null);
    return null;
  }
}

/**
 * Après un clic sur le lien reçu par e-mail, Supabase renvoie vers le site
 * avec les jetons dans l'adresse (#access_token=...). Sans cette fonction,
 * l'application les ignore : on clique sur le lien, et il ne se passe rien.
 *
 * Retourne { ok: true }, { erreur: '...' } ou null s'il n'y a rien à traiter.
 */
export function capterRetourAuth() {
  const brut = location.hash.replace(/^#\/?/, '');
  if (!/access_token=|error_description=|error=/.test(brut)) return null;

  const params = new URLSearchParams(brut);
  const nettoyer = () =>
    history.replaceState(null, '', `${location.pathname}${location.search}#/matchs`);

  const erreur = params.get('error_description') || params.get('error');
  if (erreur) {
    nettoyer();
    return { erreur: decodeURIComponent(erreur.replace(/\+/g, ' ')) };
  }

  const access_token = params.get('access_token');
  if (!access_token) return null;

  poserSession({
    access_token,
    refresh_token: params.get('refresh_token'),
    expires_at:
      Number(params.get('expires_at')) ||
      Math.floor(Date.now() / 1000) + Number(params.get('expires_in') || 3600),
  });
  nettoyer();
  return { ok: true };
}

const rest = (chemin, options) => sb(`/rest/v1${chemin}`, options);
const rpc = (nom, args = {}) => sb(`/rest/v1/rpc/${nom}`, { methode: 'POST', corps: args });

/* ------------------------------------------------------------------ */
/* API publique                                                        */
/* ------------------------------------------------------------------ */

export const estDemo = MODE_DEMO;

export async function utilisateurCourant() {
  if (MODE_DEMO) return demo.utilisateurCourant();
  const s = await sessionValide();
  if (!s) return null;
  try {
    const profils = await rest('/profils?select=*&limit=1');
    return profils?.[0] ?? null;
  } catch {
    poserSession(null);
    return null;
  }
}

/** Ouvre une session à partir d'une réponse d'authentification Supabase. */
function ouvrirSession(r) {
  if (!r?.access_token) return false;
  poserSession({
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (r.expires_in || 3600),
  });
  return true;
}

/**
 * Création de compte par mot de passe.
 *
 * C'est la voie principale, et non le lien par e-mail : le service d'envoi
 * intégré de Supabase est plafonné à quelques messages par heure, ce qui rend
 * impossible l'inscription d'un groupe d'amis le même soir. Avec « Confirm
 * email » désactivé côté Supabase, l'inscription ouvre la session
 * immédiatement, sans le moindre e-mail.
 */
export async function inscription({ email, motDePasse, pseudo, equipeFavoriteId = null }) {
  if (MODE_DEMO) return demo.connexion(pseudo || email, { equipeFavoriteId });
  const retour = encodeURIComponent(`${location.origin}${location.pathname}`);
  const r = await sb(`/auth/v1/signup?redirect_to=${retour}`, {
    methode: 'POST',
    corps: { email: email.trim(), password: motDePasse, data: { pseudo: pseudo?.trim() || undefined } },
  });
  if (!ouvrirSession(r)) return { enAttenteEmail: true }; // la confirmation par e-mail est activée

  // Le profil est créé par un trigger côté base : on ne peut renseigner
  // l'équipe préférée qu'ensuite. Un échec ici ne doit pas bloquer
  // l'inscription — le joueur pourra toujours la choisir sur son profil.
  if (equipeFavoriteId) {
    try {
      await definirEquipeFavorite(equipeFavoriteId);
    } catch (e) {
      console.warn('[Clutch] équipe préférée non enregistrée à l’inscription', e);
    }
  }
  return { ok: true };
}

/** Connexion par mot de passe. */
export async function connexionMotDePasse({ email, motDePasse }) {
  if (MODE_DEMO) return demo.connexion(email);
  const r = await sb('/auth/v1/token?grant_type=password', {
    methode: 'POST',
    corps: { email: email.trim(), password: motDePasse },
  });
  if (!ouvrirSession(r)) throw new Error('Réponse inattendue de Supabase.');
  return { ok: true };
}

/** En production : envoi d'un lien magique par e-mail. En démo : pseudo direct. */
export async function connexion(identifiant) {
  if (MODE_DEMO) return demo.connexion(identifiant);
  // redirect_to indique à Supabase l'adresse de retour du lien. Sans ça, il
  // utilise la « Site URL » du projet, souvent restée sur localhost.
  const retour = encodeURIComponent(`${location.origin}${location.pathname}`);
  await sb(`/auth/v1/otp?redirect_to=${retour}`, {
    methode: 'POST',
    corps: { email: identifiant.trim(), create_user: true },
  });
  return { enAttenteEmail: true };
}

export async function deconnexion() {
  if (MODE_DEMO) return demo.deconnexion();
  poserSession(null);
}

export async function reinitialiser() {
  if (MODE_DEMO) return demo.reinitialiser();
  throw new Error('Indisponible en production.');
}

export async function estAdmin() {
  const u = await utilisateurCourant();
  if (!u) return false;
  if (MODE_DEMO) return true; // en démo, tout le monde peut voir l'admin
  return ADMINS.includes(u.email);
}

/* --- Saisons --- */

const CLE_SAISON = 'clutch.saison';

export async function listerSaisons() {
  if (MODE_DEMO) return demo.listerSaisons();
  return rest('/v_saisons?select=*&order=debut.asc');
}

/** Saison choisie, sinon celle en cours, sinon la plus récente. */
export async function saisonCourante() {
  if (MODE_DEMO) return demo.saisonCourante();
  const toutes = await listerSaisons();
  if (!toutes?.length) return null; // base vide : 04_donnees.sql n'a pas tourné
  const choisie = toutes.find((s) => s.id === localStorage.getItem(CLE_SAISON));
  return choisie ?? toutes.find((s) => s.statut === 'en_cours') ?? toutes[toutes.length - 1];
}

export async function choisirSaison(id) {
  if (MODE_DEMO) return demo.choisirSaison(id);
  localStorage.setItem(CLE_SAISON, id);
  return saisonCourante();
}

export async function palmares() {
  if (MODE_DEMO) return demo.palmares();
  return rpc('palmares');
}

/* --- Matchs --- */

export async function listerMatchs(filtres) {
  if (MODE_DEMO) return demo.listerMatchs(filtres);
  const { jeu, statut = 'a_venir', equipe } = filtres || {};
  const saison = filtres?.saison ?? (await saisonCourante())?.id;
  let q = `/v_matchs?select=*&order=debut.asc`;
  if (saison) q += `&saison_id=eq.${encodeURIComponent(saison)}`;
  if (statut) q += `&statut=eq.${statut}`;
  if (jeu) q += `&jeu=eq.${jeu}`;
  if (equipe) {
    const e = encodeURIComponent(equipe);
    q += `&or=(equipe_a_id.eq.${e},equipe_b_id.eq.${e})`;
  }
  return rest(q);
}

export async function lireMatch(id) {
  if (MODE_DEMO) return demo.lireMatch(id);
  const r = await rest(`/v_matchs?select=*&id=eq.${id}&limit=1`);
  return r?.[0] ?? null;
}

export async function cotesDuMatch(id) {
  if (MODE_DEMO) return demo.cotesDuMatch(id);
  return rpc('cotes_du_match', { p_match_id: id });
}

/* --- Paris --- */

export async function placerPari(args) {
  if (MODE_DEMO) return demo.placerPari(args);
  return rpc('placer_pari', {
    p_match_id: args.matchId,
    p_marche: args.marche,
    p_choix: args.choix,
    p_mise: args.mise,
  });
}

export async function mesParis(options) {
  if (MODE_DEMO) return demo.mesParis(options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rest(`/v_mes_paris?select=*&saison_id=eq.${saison}&order=cree_le.desc`);
}

/* --- Règlement --- */

export async function reglerMatch(matchId, scoreA, scoreB) {
  if (MODE_DEMO) return demo.reglerMatch(matchId, scoreA, scoreB);
  return rpc('regler_match', { p_match_id: matchId, p_score_a: scoreA, p_score_b: scoreB });
}

/* --- Prime de connexion --- */

export async function reclamerPrime() {
  if (MODE_DEMO) return demo.reclamerPrime();
  return rpc('reclamer_prime', { p_saison_id: (await saisonCourante())?.id });
}

export async function etatPrime() {
  if (MODE_DEMO) return demo.etatPrime();
  return rpc('etat_prime', { p_saison_id: (await saisonCourante())?.id });
}

/* --- Équipe préférée --- */

export async function listerEquipes(filtres) {
  if (MODE_DEMO) return demo.listerEquipes(filtres);
  let q = '/equipes?select=id,jeu,nom,tag,elo&order=nom.asc';
  if (filtres?.jeu) q += `&jeu=eq.${filtres.jeu}`;
  return rest(q);
}

export async function definirEquipeFavorite(equipeId) {
  if (MODE_DEMO) return demo.definirEquipeFavorite(equipeId);
  const u = await utilisateurCourant();
  if (!u) throw new Error('Connecte-toi.');
  await rest(`/profils?id=eq.${u.id}`, {
    methode: 'PATCH',
    corps: { equipe_favorite_id: equipeId || null },
    entetes: { Prefer: 'return=minimal' },
  });
  return utilisateurCourant();
}

/* --- Le call de la saison --- */

export async function listerEvenementsSaison(options) {
  if (MODE_DEMO) return demo.listerEvenementsSaison(options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rest(`/v_evenements_saison?select=*&saison_id=eq.${encodeURIComponent(saison)}&order=debut.asc`);
}

export async function cotesEvenement(eventId, options) {
  if (MODE_DEMO) return demo.cotesEvenement(eventId, options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rpc('cotes_evenement', { p_event_id: eventId, p_saison_id: saison });
}

export async function monCall(options) {
  if (MODE_DEMO) return demo.monCall(options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rpc('mon_call', { p_saison_id: saison });
}

export async function placerCall({ eventId, equipeId, mise }) {
  if (MODE_DEMO) return demo.placerCall({ eventId, equipeId, mise });
  return rpc('placer_call', { p_event_id: eventId, p_equipe_id: equipeId, p_mise: mise });
}

export async function reglerEvenement(eventId, equipeId, options) {
  if (MODE_DEMO) return demo.reglerEvenement(eventId, equipeId, options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rpc('regler_evenement', {
    p_event_id: eventId,
    p_equipe_id: equipeId,
    p_saison_id: saison,
  });
}

/* --- Rivalité de la semaine --- */

export async function rivaliteSemaine(options) {
  if (MODE_DEMO) return demo.rivaliteSemaine(options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rpc('rivalite_semaine', { p_saison_id: saison, p_ligue_id: options?.ligue ?? null });
}

/* --- Ligues --- */

export async function creerLigue(nom) {
  if (MODE_DEMO) return demo.creerLigue(nom);
  return rpc('creer_ligue', { p_nom: nom });
}

export async function rejoindreLigue(code) {
  if (MODE_DEMO) return demo.rejoindreLigue(code);
  return rpc('rejoindre_ligue', { p_code: code });
}

export async function mesLigues() {
  if (MODE_DEMO) return demo.mesLigues();
  return rest('/v_mes_ligues?select=*');
}

export async function lireLigue(id) {
  if (MODE_DEMO) return demo.lireLigue(id);
  const r = await rest(`/ligues?select=*&id=eq.${id}&limit=1`);
  return r?.[0] ?? null;
}

export async function classementLigue(id, options) {
  if (MODE_DEMO) return demo.classementLigue(id, options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rpc('classement_ligue', { p_ligue_id: id, p_saison_id: saison });
}

export async function classementGlobal(options) {
  if (MODE_DEMO) return demo.classementGlobal(options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rpc('classement_global', { p_saison_id: saison });
}

export async function statistiques(options) {
  if (MODE_DEMO) return demo.statistiques(options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rpc('mes_statistiques', { p_saison_id: saison });
}


/* ------------------------------------------------------------------ */
/* Diagnostic                                                          */
/* ------------------------------------------------------------------ */

/**
 * Étapes du diagnostic, exposées une par une pour que la page puisse les
 * afficher au fur et à mesure : si l'une d'elles traîne, on voit quand même
 * le résultat des précédentes.
 */
export function etapesDiagnostic() {
  const etapes = [
    {
      libelle: 'Configuration',
      aide: 'Colle tes deux clés dans web/js/config.js, puis redéploie.',
      executer: async () => {
        if (MODE_DEMO) throw new Error('Aucune clé Supabase : le site tourne en mode démo.');
        if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(BASE)) {
          throw new Error(
            `SUPABASE_URL a une forme inattendue : ${SUPABASE_URL}. ` +
              'Elle doit être la « Project URL », de la forme https://abcdefgh.supabase.co — ' +
              "sans /rest/v1/ à la fin, et sans l'adresse du tableau de bord."
          );
        }
        return SUPABASE_URL === BASE ? BASE : `${BASE} (corrigée depuis « ${SUPABASE_URL} »)`;
      },
    },
  ];

  if (MODE_DEMO) return etapes;

  etapes.push(
    {
      libelle: 'Connexion à Supabase',
      aide: 'Ouvre ton projet sur supabase.com : un projet gratuit se met en pause après une semaine sans activité.',
      executer: async () => {
        // On interroge une vraie table PUBLIQUE, avec la clé publique et rien
        // d'autre — surtout pas la session du joueur. Ce test doit dire une
        // seule chose : « le projet répond et la clé est bonne ». L'ancienne
        // version tapait la racine /rest/v1/, qui répond 401 même en bonne
        // santé : le diagnostic accusait la clé à chaque fois.
        let r;
        try {
          r = await fetchLimite(`${BASE}/rest/v1/equipes?select=id&limit=1`, {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          });
        } catch (e) {
          if (/n'a pas répondu/.test(e.message)) throw e;
          throw new Error(`Aucune réponse de ${BASE} : adresse erronée, ou projet en pause.`);
        }
        if (!r.ok) {
          const detail = (await r.text()).slice(0, 200);
          throw new Error(explication(r.status, detail));
        }
        return 'le projet répond et la clé publique est acceptée';
      },
    },
    {
      libelle: 'Clé acceptée',
      aide: "Reprends la clé « anon public » (ou « Publishable key ») dans Project Settings → API. Surtout pas la clé service_role.",
      executer: async () => {
        const r = await rest('/equipes?select=id&limit=1');
        return 'la clé publique est valide';
      },
    },
    {
      libelle: 'Tables installées (01_schema.sql)',
      aide: 'Exécute 01_schema.sql dans le SQL Editor de Supabase, et attends le message vert.',
      executer: async () => {
        const r = await rest('/equipes?select=id&limit=1');
        return r.length ? 'équipes présentes' : 'tables créées, mais vides';
      },
    },
    {
      libelle: 'Saisons et calendrier (04_donnees.sql)',
      aide: 'Exécute 04_donnees.sql dans le SQL Editor de Supabase.',
      executer: async () => {
        const s = await rest('/v_saisons?select=*');
        if (!s.length) throw new Error('Aucune saison en base.');
        const m = await rest('/v_matchs?select=id&limit=1');
        if (!m.length) throw new Error('Aucun match en base.');
        return `${s.length} saison(s), calendrier rempli`;
      },
    },
    {
      libelle: 'Moteur de cotes (02_fonctions.sql)',
      aide: 'Exécute 02_fonctions.sql dans le SQL Editor de Supabase.',
      executer: async () => {
        const m = await rest('/v_matchs?select=id&statut=eq.a_venir&limit=1');
        if (!m.length) throw new Error('Aucun match à venir pour tester.');
        const cotes = await rpc('cotes_du_match', { p_match_id: m[0].id });
        return `${cotes.length} marché(s) calculé(s)`;
      },
    },
    {
      libelle: 'Ma session',
      aide: "Normal si tu n'es pas encore connecté : clique sur « Jouer ».",
      executer: async () => {
        const u = await utilisateurCourant();
        if (!u) throw new Error('Pas connecté.');
        return `connecté en tant que ${u.pseudo || u.email}`;
      },
    }
  );

  return etapes;
}

/* ------------------------------------------------------------------ */
/* Palier 1 bis — prono par défaut, défi de ligue, profil d'analyste    */
/* ------------------------------------------------------------------ */

/* --- Prono par défaut --- */

export async function definirPariAuto({ mode, mise }) {
  if (MODE_DEMO) return demo.definirPariAuto({ mode, mise });
  const u = await utilisateurCourant();
  if (!u) throw new Error('Connecte-toi.');
  await rest(`/profils?id=eq.${u.id}`, {
    methode: 'PATCH',
    corps: { pari_auto_mode: mode, pari_auto_mise: mise },
    entetes: { Prefer: 'return=minimal' },
  });
  return utilisateurCourant();
}

export async function rattraperParisAuto(options) {
  if (MODE_DEMO) return demo.rattraperParisAuto(options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rpc('rattraper_paris_auto', { p_saison_id: saison });
}

/* --- Défi de ligue --- */

export async function defiLigue(ligueId, options) {
  if (MODE_DEMO) return demo.defiLigue(ligueId, options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rpc('defi_ligue', { p_ligue_id: ligueId, p_saison_id: saison });
}

export async function tirerDefi(ligueId, options) {
  if (MODE_DEMO) return demo.tirerDefi(ligueId, options);
  return rpc('tirer_defi', { p_ligue_id: ligueId });
}

export async function classementDefi(ligueId, options) {
  if (MODE_DEMO) return demo.classementDefi(ligueId, options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rpc('classement_defi', { p_ligue_id: ligueId, p_saison_id: saison });
}

/* --- Profil d'analyste --- */

export async function statistiquesDetaillees(options) {
  if (MODE_DEMO) return demo.statistiquesDetaillees(options);
  const saison = options?.saison ?? (await saisonCourante())?.id;
  return rpc('mes_statistiques_detaillees', { p_saison_id: saison });
}

/* ------------------------------------------------------------------ */
/* Palier 2 — badges et cartes partageables                            */
/* ------------------------------------------------------------------ */

/**
 * Les règles de badges vivent UNIQUEMENT dans core.js.
 *
 * Le serveur ne renvoie que le récapitulatif chiffré ; c'est le navigateur qui
 * applique le catalogue. Réécrire vingt et une règles en PL/pgSQL aurait créé
 * deux vérités qui auraient divergé dès le premier badge ajouté — et un badge
 * n'est ni de l'argent ni un droit : rien n'oblige à le calculer côté serveur.
 */
export async function mesBadges() {
  if (MODE_DEMO) return demo.mesBadges();
  const recap = await rpc('recap_badges');
  if (!recap) return null;
  return { recap, badges: evaluerBadges(recap) };
}

/**
 * Même principe pour les cartes : on demande les paris gagnés, et le seuil de
 * « ça mérite une carte » est appliqué par core.js. Aucune requête nouvelle.
 */
export async function mesCartes() {
  if (MODE_DEMO) return demo.mesCartes();
  const saison = (await saisonCourante())?.id;
  const gagnes = await rest(
    `/v_mes_paris?select=*&statut=eq.gagne&saison_id=eq.${encodeURIComponent(saison)}&order=gain.desc`
  );
  return (gagnes || []).filter(carteMeritee);
}

/* ------------------------------------------------------------------ */
/* Création de compétition (console d'administration)                  */
/* ------------------------------------------------------------------ */

export async function listerEvenements(filtres) {
  if (MODE_DEMO) return demo.listerEvenements(filtres);
  let q = '/evenements?select=*&order=nom.asc';
  if (filtres?.jeu) q += `&jeu=eq.${filtres.jeu}`;
  return rest(q);
}

export async function creerEvenement(args) {
  if (MODE_DEMO) return demo.creerEvenement(args);
  return rpc('creer_evenement', { p_nom: args.nom, p_jeu: args.jeu, p_tier: args.tier ?? 'A' });
}

export async function creerEquipe(args) {
  if (MODE_DEMO) return demo.creerEquipe(args);
  return rpc('creer_equipe', {
    p_nom: args.nom, p_tag: args.tag, p_jeu: args.jeu, p_elo: Math.round(Number(args.elo)),
  });
}

export async function creerMatch(args) {
  if (MODE_DEMO) return demo.creerMatch(args);
  const saison = args.saison ?? (await saisonCourante())?.id;
  return rpc('creer_match', {
    p_event_id: args.eventId,
    p_equipe_a: args.equipeAId,
    p_equipe_b: args.equipeBId,
    p_format: Number(args.format),
    p_debut: new Date(args.debut).toISOString(),
    p_saison_id: saison,
  });
}

export async function annulerMatch(matchId, options) {
  if (MODE_DEMO) return demo.annulerMatch(matchId, options);
  return rpc('annuler_match', { p_match_id: matchId, p_motif: options?.motif ?? '' });
}
