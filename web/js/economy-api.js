/**
 * Accès réseau aux RPC Economy V2.
 * Supabase est l'autorité : cette couche transporte les données, elle ne
 * calcule jamais elle-même un rating de Frags.
 */
import * as api from './api.js';
import { MODE_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const BASE = SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const CLE_SESSION = 'clutch.session';

function sessionCourante() {
  try {
    return JSON.parse(localStorage.getItem(CLE_SESSION) || 'null');
  } catch {
    return null;
  }
}

async function rpc(nom, args = {}) {
  if (MODE_DEMO) throw new Error('Economy V2 nécessite Supabase.');

  await api.utilisateurCourant().catch(() => null);
  const jeton = sessionCourante()?.access_token || SUPABASE_ANON_KEY;
  const controleur = new AbortController();
  const timeout = setTimeout(() => controleur.abort(), 12000);

  let reponse;
  try {
    reponse = await fetch(`${BASE}/rest/v1/rpc/${nom}`, {
      method: 'POST',
      signal: controleur.signal,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jeton}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Le moteur de classement ne répond pas.');
    throw new Error('Impossible de joindre le moteur de classement.');
  } finally {
    clearTimeout(timeout);
  }

  const texte = await reponse.text();
  let donnees = null;
  try {
    donnees = texte ? JSON.parse(texte) : null;
  } catch {
    donnees = { message: texte };
  }
  if (!reponse.ok) throw new Error(donnees?.message || donnees?.hint || `Erreur ${reponse.status}`);
  return donnees;
}

async function saisonIdOuCourante(saisonId) {
  if (saisonId) return saisonId;
  return (await api.saisonCourante())?.id ?? null;
}

export async function etatFrags(saisonId = null) {
  const id = await saisonIdOuCourante(saisonId);
  return id ? rpc('clutch_etat_frags', { p_saison_id: id }) : null;
}

export async function projectionMatchFrags(matchId) {
  return rpc('clutch_projection_match_frags', { p_match_id: matchId });
}

export async function placerPronosticClasse({ matchId, choix }) {
  return rpc('placer_pronostic_classe', { p_match_id: matchId, p_choix: choix });
}

export async function mesPronosticsClasses(saisonId = null) {
  const id = await saisonIdOuCourante(saisonId);
  return id ? (await rpc('clutch_mes_pronostics_classes', { p_saison_id: id })) ?? [] : [];
}

export async function classementFrags(saisonId = null) {
  const id = await saisonIdOuCourante(saisonId);
  return id ? (await rpc('clutch_classement_frags', { p_saison_id: id })) ?? [] : [];
}

export async function classementLigueFrags(ligueId, saisonId = null) {
  const id = await saisonIdOuCourante(saisonId);
  return id
    ? (await rpc('clutch_classement_ligue_frags', { p_ligue_id: ligueId, p_saison_id: id })) ?? []
    : [];
}

export async function rivaliteFrags({ saisonId = null, ligueId = null } = {}) {
  const id = await saisonIdOuCourante(saisonId);
  return id ? rpc('clutch_rivalite_frags', { p_saison_id: id, p_ligue_id: ligueId }) : null;
}
