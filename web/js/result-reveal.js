import { xpDetailleeV2 } from './badges-v2.js';

export function xpResultat(statut) {
  const gagne = statut === 'gagne';
  if (!gagne && statut !== 'perdu') return 0;
  return xpDetailleeV2({
    badges: [],
    recap: { paris: 1, gagnes: gagne ? 1 : 0 },
  }).total;
}

export function mouvementRang(avant, apres) {
  const a = Number(avant);
  const b = Number(apres);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) {
    return { disponible: false, delta: 0, monte: false, descend: false, stable: false };
  }
  return {
    disponible: true,
    delta: a - b,
    monte: b < a,
    descend: b > a,
    stable: b === a,
  };
}

export function equipeChoisie(resultat) {
  if (!resultat) return '';
  return resultat.choix === 'a' ? resultat.equipe_a : resultat.equipe_b;
}

export function tagChoisi(resultat) {
  if (!resultat) return '';
  return resultat.choix === 'a' ? resultat.tag_a : resultat.tag_b;
}

export function equipeGagnante(resultat) {
  if (!resultat) return '';
  return Number(resultat.score_a) > Number(resultat.score_b)
    ? resultat.equipe_a
    : resultat.equipe_b;
}

export function presentationResultat(resultat) {
  const gagne = resultat?.statut === 'gagne';
  const perdu = resultat?.statut === 'perdu';
  if (!gagne && !perdu) throw new RangeError(`Statut de résultat invalide : ${resultat?.statut}`);
  const rang = mouvementRang(resultat.rang_avant, resultat.rang_apres);
  return {
    gagne,
    perdu,
    tone: gagne ? 'win' : 'loss',
    headline: gagne ? 'TU L’AVAIS VU.' : 'CELLE-LÀ T’A ÉCHAPPÉ.',
    kicker: gagne ? 'PRONO VALIDÉ' : 'VERDICT FINAL',
    equipe: equipeChoisie(resultat),
    gagnant: equipeGagnante(resultat),
    deltaFrags: Number(resultat.delta_frags ?? 0),
    xp: xpResultat(resultat.statut),
    rang,
  };
}
