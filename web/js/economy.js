/**
 * Clutch Economy V2 — moteur de score compétitif.
 *
 * Règles verrouillées :
 *   - les Frags sont un rating, jamais une monnaie ;
 *   - aucun montant de Frags n'est engagé ou dépensé ;
 *   - le delta dépend uniquement de la probabilité figée et du résultat ;
 *   - les probabilités de scoring sont bornées à 15–85 % ;
 *   - les 5 premiers pronostics classés utilisent K=60, puis K=40 ;
 *   - une nouvelle saison compresse le rating vers 1000, sans reset brutal.
 *
 * Le serveur Supabase est l'autorité : ce module sert à l'affichage et aux
 * tests. Le règlement réel est effectué par les fonctions de 18_economie_v2.sql.
 */

export const FRAGS_INITIAL = 1000;
export const FRAGS_K = 40;
export const FRAGS_K_PLACEMENTS = 60;
export const FRAGS_NB_PLACEMENTS = 5;
export const FRAGS_PROBA_MIN = 0.15;
export const FRAGS_PROBA_MAX = 0.85;
export const FRAGS_SOFT_RESET_CONSERVE = 0.4;

export function normaliserProba(proba) {
  const p = Number(proba);
  if (!Number.isFinite(p) || p <= 0 || p >= 1) {
    throw new RangeError(`Probabilité invalide : ${proba}`);
  }
  return p;
}

export function bornerProbaFrags(proba) {
  const p = normaliserProba(proba);
  return Math.min(FRAGS_PROBA_MAX, Math.max(FRAGS_PROBA_MIN, p));
}

export function kFrags(nbPronosticsClasses = 0) {
  const n = Math.max(0, Math.trunc(Number(nbPronosticsClasses) || 0));
  return n < FRAGS_NB_PLACEMENTS ? FRAGS_K_PLACEMENTS : FRAGS_K;
}

/** Arrondi half-up stable, y compris face aux erreurs binaires JS. */
function arrondirMagnitude(valeur) {
  return Math.floor(Number(valeur) + 0.5 + Number.EPSILON * 16);
}

export function deltaFrags(proba, gagnant, { k = FRAGS_K } = {}) {
  const p = bornerProbaFrags(proba);
  const facteur = Number(k);
  if (!Number.isFinite(facteur) || facteur <= 0) {
    throw new RangeError(`Coefficient K invalide : ${k}`);
  }
  return gagnant
    ? arrondirMagnitude(facteur * (1 - p))
    : -arrondirMagnitude(facteur * p);
}

export function projectionFrags(proba, { nbPronosticsClasses = 0, k = null } = {}) {
  const probaOriginale = normaliserProba(proba);
  const probaScoring = bornerProbaFrags(probaOriginale);
  const facteur = k == null ? kFrags(nbPronosticsClasses) : Number(k);
  return {
    proba: probaOriginale,
    proba_scoring: probaScoring,
    k: facteur,
    gain: deltaFrags(probaScoring, true, { k: facteur }),
    perte: deltaFrags(probaScoring, false, { k: facteur }),
  };
}

export function softResetFrags(frags, {
  centre = FRAGS_INITIAL,
  conserve = FRAGS_SOFT_RESET_CONSERVE,
} = {}) {
  const score = Number(frags);
  if (!Number.isFinite(score)) throw new RangeError(`Score de Frags invalide : ${frags}`);
  return arrondirMagnitude(centre + conserve * (score - centre));
}

export function formaterProjectionFrags(projection) {
  const gain = Math.abs(Math.round(Number(projection?.gain) || 0));
  const perte = Math.abs(Math.round(Number(projection?.perte) || 0));
  return `+${gain} / −${perte} 💥`;
}
