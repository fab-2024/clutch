/**
 * Accès réseau minimal aux RPC Economy V2.
 *
 * On garde volontairement cette couche séparée de api.js pendant la migration
 * de l'ancien moteur de mise. api.js reste le fallback legacy ; cette couche
 * ne connaît que les pronostics classés et le rating de Frags.
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
  if (MODE_DEMO) {
    throw new Error('Economy V2 nécessite Supabase dans cette première étape de migration.');
  }

  // utilisateurCourant() réutilise le mécanisme de refresh déjà éprouvé de
  // api.js. On relit ensuite le token actualisé dans localStorage.
  await api.utilisateurCourant().catch(() => null);
  const session = sessionCourante();
  const jeton = session?.access_token || SUPABASE_ANON_KEY;

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

  if (!reponse.ok) {
    const message = donnees?.message || donnees?.hint || `Erreur ${reponse.status}`;
    throw new Error(message);
  }
  return donnees;
}

export async function etatFrags(saisonId = null) {
  const saison = saisonId ? { id: saisonId } : await api.saisonCourante();
  if (!saison?.id) return null;
  return rpc('clutch_etat_frags', { p_saison_id: saison.id });
}

export async function projectionMatchFrags(matchId) {
  return rpc('clutch_projection_match_frags', { p_match_id: matchId });
}

export async function placerPronosticClasse({ matchId, choix }) {
  return rpc('placer_pronostic_classe', {
    p_match_id: matchId,
    p_choix: choix,
  });
}

export async function mesPronosticsClasses(saisonId = null) {
  const saison = saisonId ? { id: saisonId } : await api.saisonCourante();
  if (!saison?.id) return [];
  return (await rpc('clutch_mes_pronostics_classes', { p_saison_id: saison.id })) ?? [];
}

export async function classementFrags(saisonId = null) {
  const saison = saisonId ? { id: saisonId } : await api.saisonCourante();
  if (!saison?.id) return [];
  return (await rpc('clutch_classement_frags', { p_saison_id: saison.id })) ?? [];
}

export async function classementLigueFrags(ligueId, saisonId = null) {
  const saison = saisonId ? { id: saisonId } : await api.saisonCourante();
  if (!saison?.id) return [];
  return (
    (await rpc('clutch_classement_ligue_frags', {
      p_ligue_id: ligueId,
      p_saison_id: saison.id,
    })) ?? []
  );
}

export async function rivaliteFrags({ saisonId = null, ligueId = null } = {}) {
  const saison = saisonId ? { id: saisonId } : await api.saisonCourante();
  if (!saison?.id) return null;
  return rpc('clutch_rivalite_frags', {
    p_saison_id: saison.id,
    p_ligue_id: ligueId,
  });
}
