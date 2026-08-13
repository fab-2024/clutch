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

/* ------------------------------------------------------------------ */
/* Client Supabase minimal (aucune dépendance, ~80 lignes)             */
/* ------------------------------------------------------------------ */

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

async function sb(chemin, { methode = 'GET', corps = null, entetes = {} } = {}) {
  const s = session();
  let reponse;
  try {
    reponse = await fetchLimite(`${SUPABASE_URL}${chemin}`, {
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
      `Impossible de joindre Supabase à l'adresse ${SUPABASE_URL} — ` +
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
  if (statut === 401) return 'Clé Supabase refusée : vérifie SUPABASE_ANON_KEY dans config.js';
  if (statut === 403) return 'Accès refusé par les règles de sécurité : 03_securite.sql a-t-il été exécuté ?';
  if (statut === 404) return "Table ou fonction absente : les fichiers SQL n'ont pas tous été exécutés";
  if (statut === 400 && /does not exist|schema cache/i.test(detail)) {
    return 'La base ne correspond pas au code : réexécute les fichiers SQL 01 à 04 dans l\'ordre';
  }
  if (statut >= 500) return 'Supabase ne répond pas correctement (projet en pause ?)';
  return `Erreur ${statut}`;
}

const rest = (chemin, options) => sb(`/rest/v1${chemin}`, options);
const rpc = (nom, args = {}) => sb(`/rest/v1/rpc/${nom}`, { methode: 'POST', corps: args });

/* ------------------------------------------------------------------ */
/* API publique                                                        */
/* ------------------------------------------------------------------ */

export const estDemo = MODE_DEMO;

export async function utilisateurCourant() {
  if (MODE_DEMO) return demo.utilisateurCourant();
  const s = session();
  if (!s) return null;
  try {
    const profils = await rest('/profils?select=*&limit=1');
    return profils?.[0] ?? null;
  } catch {
    poserSession(null);
    return null;
  }
}

/** En production : envoi d'un lien magique par e-mail. En démo : pseudo direct. */
export async function connexion(identifiant) {
  if (MODE_DEMO) return demo.connexion(identifiant);
  await sb('/auth/v1/otp', {
    methode: 'POST',
    corps: { email: identifiant, create_user: true },
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
  const { jeu, statut = 'a_venir' } = filtres || {};
  const saison = filtres?.saison ?? (await saisonCourante())?.id;
  let q = `/v_matchs?select=*&order=debut.asc`;
  if (saison) q += `&saison_id=eq.${encodeURIComponent(saison)}`;
  if (statut) q += `&statut=eq.${statut}`;
  if (jeu) q += `&jeu=eq.${jeu}`;
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

/* --- Prime --- */

export async function reclamerPrime() {
  if (MODE_DEMO) return demo.reclamerPrime();
  return rpc('reclamer_prime', { p_saison_id: (await saisonCourante())?.id });
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
        if (!/^https:\/\/.+\.supabase\.co/.test(SUPABASE_URL)) {
          throw new Error(
            `SUPABASE_URL a une forme inattendue : ${SUPABASE_URL}. ` +
              "Elle doit ressembler à https://abcdefgh.supabase.co (et non à l'adresse du tableau de bord)."
          );
        }
        return SUPABASE_URL;
      },
    },
  ];

  if (MODE_DEMO) return etapes;

  etapes.push(
    {
      libelle: 'Connexion à Supabase',
      aide: 'Ouvre ton projet sur supabase.com : un projet gratuit se met en pause après une semaine sans activité.',
      executer: async () => {
        let r;
        try {
          r = await fetchLimite(`${SUPABASE_URL}/rest/v1/`, { headers: { apikey: SUPABASE_ANON_KEY } });
        } catch (e) {
          if (/n'a pas répondu/.test(e.message)) throw e;
          throw new Error(`Aucune réponse de ${SUPABASE_URL} : adresse erronée, ou projet en pause.`);
        }
        if (!r.ok && r.status !== 404) throw new Error(explication(r.status));
        return `réponse ${r.status}`;
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
