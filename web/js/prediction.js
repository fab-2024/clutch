/**
 * Phase 5 — conviction helpers for competitive predictions.
 *
 * Frags remain a rating, never a spendable balance. Conviction only changes
 * the K used to settle one prediction; it never withdraws or locks Frags.
 */
import { bornerProbaFrags, deltaFrags } from './economy.js';

export const CONVICTIONS = Object.freeze({
  faible: Object.freeze({
    id: 'faible',
    label: 'Faible',
    description: 'Je tente le call.',
    multiplicateur: 0.75,
    symbole: '◇',
  }),
  normal: Object.freeze({
    id: 'normal',
    label: 'Normal',
    description: 'Mon choix.',
    multiplicateur: 1,
    symbole: '◆',
  }),
  fort: Object.freeze({
    id: 'fort',
    label: 'Fort',
    description: "J'assume complètement.",
    multiplicateur: 1.5,
    symbole: '⚡⚡',
  }),
});

export const CONVICTION_PAR_DEFAUT = 'normal';

export function normaliserConviction(conviction = CONVICTION_PAR_DEFAUT) {
  const cle = String(conviction || '').trim().toLowerCase();
  if (!Object.hasOwn(CONVICTIONS, cle)) {
    throw new RangeError(`Conviction invalide : ${conviction}`);
  }
  return cle;
}

export function convictionInfo(conviction = CONVICTION_PAR_DEFAUT) {
  return CONVICTIONS[normaliserConviction(conviction)];
}

export function kEffectifConviction(k, conviction = CONVICTION_PAR_DEFAUT) {
  const base = Number(k);
  if (!Number.isFinite(base) || base <= 0) {
    throw new RangeError(`Coefficient K invalide : ${k}`);
  }
  return Math.max(1, Math.round(base * convictionInfo(conviction).multiplicateur));
}

export function projectionConviction(proba, {
  k,
  conviction = CONVICTION_PAR_DEFAUT,
} = {}) {
  const cle = normaliserConviction(conviction);
  const info = CONVICTIONS[cle];
  const probaScoring = bornerProbaFrags(proba);
  const kEffectif = kEffectifConviction(k, cle);
  return {
    conviction: cle,
    multiplicateur: info.multiplicateur,
    proba_scoring: probaScoring,
    k_base: Number(k),
    k_effectif: kEffectif,
    gain: deltaFrags(probaScoring, true, { k: kEffectif }),
    perte: deltaFrags(probaScoring, false, { k: kEffectif }),
  };
}

export function projectionsConviction(proba, { k } = {}) {
  return Object.fromEntries(Object.keys(CONVICTIONS).map((conviction) => [
    conviction,
    projectionConviction(proba, { k, conviction }),
  ]));
}
