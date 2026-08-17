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
 * Le serveur recalcule toujours ces valeurs. Ce module sert à l'affichage,
 * au mode démo et aux tests — jamais à accorder des Frags en production.
 */

export const FRAGS_INITIAL = 1000;
export const FRAGS_K = 40;
export const FRAGS_K_PLACEMENTS = 60;
export const FRAGS_NB_PLACEMENTS = 5;
export const FRAGS_PROBA_MIN = 0.15;
export const FRAGS_PROBA_MAX = 0.85;
export const FRAGS_SOFT_RESET_CONSERVE = 0.4;

/** Convertit et valide une probabilité exprimée entre 0 et 1. */
export function normaliserProba(proba) {
  const p = Number(proba);
  if (!Number.isFinite(p) || p <= 0 || p >= 1) {
    throw new RangeError(`Probabilité invalide : ${proba}`);
  }
  return p;
}

/** Probabilité réellement utilisée pour le calcul des Frags. */
export function bornerProbaFrags(proba) {
  const p = normaliserProba(proba);
  return Math.min(FRAGS_PROBA_MAX, Math.max(FRAGS_PROBA_MIN, p));
}

/** K applicable au prochain pronostic classé. */
export function kFrags(nbPronosticsClasses = 0) {
  const n = Math.max(0, Math.trunc(Number(nbPronosticsClasses) || 0));
  return n < FRAGS_NB_PLACEMENTS ? FRAGS_K_PLACEMENTS : FRAGS_K;
}

/**
 * Delta de rating pour un pronostic résolu.
 *
 * Correct   : +K × (1 - p)
 * Incorrect : -K × p
 *
 * La perte arrondit d'abord la magnitude positive puis applique le signe.
 * PostgreSQL fait la même chose dans la migration V2 : cela évite le désaccord
 * JS/Postgres sur les demi-entiers négatifs (ex. -10,5).
 */
export function deltaFrags(proba, gagnant, { k = FRAGS_K } = {}) {
  const p = bornerProbaFrags(proba);
  const facteur = Number(k);
  if (!Number.isFinite(facteur) || facteur <= 0) {
    throw new RangeError(`Coefficient K invalide : ${k}`);
  }
  return gagnant
    ? Math.round(facteur * (1 - p))
    : -Math.round(facteur * p);
}

/**
 * Ce que l'interface peut annoncer AVANT validation : gain si juste / perte
 * si faux, à partir de la même probabilité figée que le serveur utilisera.
 */
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

/** Soft reset saisonnier : 1000 + 40 % de l'écart à 1000. */
export function softResetFrags(frags, {
  centre = FRAGS_INITIAL,
  conserve = FRAGS_SOFT_RESET_CONSERVE,
} = {}) {
  const score = Number(frags);
  if (!Number.isFinite(score)) throw new RangeError(`Score de Frags invalide : ${frags}`);
  return Math.round(centre + conserve * (score - centre));
}

/** Affichage compact du risque, par exemple « +26 / −14 💥 ». */
export function formaterProjectionFrags(projection) {
  const gain = Math.abs(Math.round(Number(projection?.gain) || 0));
  const perte = Math.abs(Math.round(Number(projection?.perte) || 0));
  return `+${gain} / −${perte} 💥`;
}
