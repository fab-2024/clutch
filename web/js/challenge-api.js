/** Phase 8 — client RPC for friend challenges. */
import { MODE_DEMO, SUPABASE_ANON_KEY, SUPABASE_URL } from './config.js';

const BASE = SUPABASE_URL.trim().replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
const SESSION_KEY = 'clutch.session';

export function sessionCourante() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

export function estConnecte() {
  return Boolean(sessionCourante()?.access_token);
}

export async function rpcDefi(nom, args = {}, { anonOk = false } = {}) {
  if (MODE_DEMO) throw new Error('Les défis nécessitent Supabase.');
  const session = sessionCourante();
  if (!anonOk && !session?.access_token) throw new Error('Connecte-toi pour continuer.');
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
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Le moteur de défis ne répond pas.');
    throw new Error('Impossible de joindre le moteur de défis.');
  } finally {
    clearTimeout(timeout);
  }

  const texte = await reponse.text();
  let donnees = null;
  try { donnees = texte ? JSON.parse(texte) : null; }
  catch { donnees = { message: texte }; }
  if (!reponse.ok) {
    const erreur = new Error(donnees?.message || donnees?.hint || `Erreur ${reponse.status}`);
    erreur.status = reponse.status;
    erreur.code = donnees?.code;
    throw erreur;
  }
  return donnees;
}

export const creerDefi = (matchId) => rpcDefi('clutch_creer_defi_match', { p_match_id: matchId });
export const lireDefi = (token) => rpcDefi('clutch_defi_match_public', { p_token: token }, { anonOk: true });
export const accepterDefi = (token) => rpcDefi('clutch_accepter_defi_match', { p_token: token });
export const annulerDefi = (token) => rpcDefi('clutch_annuler_defi_match', { p_token: token });
export const mesDefis = (limite = 30) => rpcDefi('clutch_mes_defis_match', { p_limite: limite });
export const duelResultat = (matchId) => rpcDefi('clutch_duel_resultat_match', { p_match_id: matchId });

export const placerPronoDefi = ({ matchId, choix, conviction }) => rpcDefi('placer_pronostic_classe_v2', {
  p_match_id: matchId,
  p_choix: choix,
  p_conviction: conviction,
});
