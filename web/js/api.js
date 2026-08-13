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
  const reponse = await fetch(`${SUPABASE_URL}${chemin}`, {
    method: methode,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${s?.access_token || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      ...entetes,
    },
    body: corps ? JSON.stringify(corps) : undefined,
  });
  const texte = await reponse.text();
  const donnees = texte ? JSON.parse(texte) : null;
  if (!reponse.ok) {
    throw new Error(donnees?.message || donnees?.error_description || `Erreur ${reponse.status}`);
  }
  return donnees;
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
    const profils = await rest('/profils?select=*&limite=1');
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
  if (saison) q += `&saison_id=eq.${saison}`;
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
