/**
 * Clutch — moteur de cotes et règles du jeu.
 *
 * Ce fichier est la SEULE source de vérité côté client pour :
 *   - la conversion Elo -> probabilités
 *   - l'agrégation des probabilités de map vers des probabilités de série (BO1/BO3/BO5)
 *   - la construction des marchés et de leurs cotes
 *   - le règlement d'un pari et la mise à jour des Elo
 *
 * La même logique est réimplémentée en PL/pgSQL dans supabase/02_functions.sql,
 * qui fait autorité en production (on ne fait jamais confiance au navigateur
 * pour calculer une cote ou créditer un solde).
 *
 * Aucune dépendance externe. Testé par tests/odds.test.mjs.
 */

/** Marge de l'opérateur appliquée aux cotes (overround). 6 %. */
export const MARGE = 0.06;

/** Cote minimale servie. En dessous, le pari n'a plus d'intérêt. */
export const COTE_MIN = 1.01;

/** Cote maximale servie, pour éviter les jackpots absurdes sur un outsider extrême. */
export const COTE_MAX = 50;

/** Solde de départ offert à l'inscription. */
export const SOLDE_INITIAL = 1000;

/** Bonus quotidien réclamable une fois toutes les 24 h. */
export const BONUS_QUOTIDIEN = 200;

/** Filet de sécurité : en dessous de ce solde, le bonus est doublé. */
export const SEUIL_FAILLITE = 100;

/** Mise minimale et maximale par pari. */
export const MISE_MIN = 10;
export const MISE_MAX = 5000;

/** Coefficient K de la mise à jour Elo. */
export const ELO_K = 24;

/** Elo attribué à une équipe inconnue. */
export const ELO_DEFAUT = 1500;

export const JEUX = {
  lol: { id: 'lol', nom: 'League of Legends', court: 'LoL', couleur: '#c8963e' },
  cs2: { id: 'cs2', nom: 'Counter-Strike 2', court: 'CS2', couleur: '#e8a33d' },
  valorant: { id: 'valorant', nom: 'Valorant', court: 'VAL', couleur: '#ff4655' },
};

/* ------------------------------------------------------------------ */
/* Probabilités                                                        */
/* ------------------------------------------------------------------ */

/**
 * Probabilité que l'équipe A gagne UNE map contre l'équipe B, selon l'Elo.
 * Formule Elo classique : 1 / (1 + 10^((eloB - eloA) / 400)).
 * Bornée à [0.05, 0.95] : même le pire mismatch garde une part d'incertitude,
 * sinon les cotes explosent et un seul upset ruine la banque virtuelle.
 */
export function probaMap(eloA, eloB) {
  const p = 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
  return Math.min(0.95, Math.max(0.05, p));
}

/**
 * Distribution complète des scores possibles d'une série, à partir de la
 * probabilité de gagner une map. Retourne un tableau d'objets
 * { scoreA, scoreB, proba } dont la somme des probas vaut 1.
 *
 * Hypothèse assumée : les maps sont indépendantes et p est constant sur la
 * série. C'est faux dans la vraie vie (momentum, pick/ban, side advantage)
 * mais c'est le modèle standard et il est largement suffisant ici.
 */
export function distributionScores(p, format) {
  const q = 1 - p;
  if (format === 1) {
    return [
      { scoreA: 1, scoreB: 0, proba: p },
      { scoreA: 0, scoreB: 1, proba: q },
    ];
  }
  if (format === 3) {
    return [
      { scoreA: 2, scoreB: 0, proba: p * p },
      { scoreA: 2, scoreB: 1, proba: 2 * p * p * q },
      { scoreA: 1, scoreB: 2, proba: 2 * q * q * p },
      { scoreA: 0, scoreB: 2, proba: q * q },
    ];
  }
  if (format === 5) {
    return [
      { scoreA: 3, scoreB: 0, proba: Math.pow(p, 3) },
      { scoreA: 3, scoreB: 1, proba: 3 * Math.pow(p, 3) * q },
      { scoreA: 3, scoreB: 2, proba: 6 * Math.pow(p, 3) * q * q },
      { scoreA: 2, scoreB: 3, proba: 6 * Math.pow(q, 3) * p * p },
      { scoreA: 1, scoreB: 3, proba: 3 * Math.pow(q, 3) * p },
      { scoreA: 0, scoreB: 3, proba: Math.pow(q, 3) },
    ];
  }
  throw new Error(`Format de série non supporté : BO${format}`);
}

/** Probabilité que l'équipe A remporte la série (somme des scores gagnants). */
export function probaSerie(p, format) {
  return distributionScores(p, format)
    .filter((s) => s.scoreA > s.scoreB)
    .reduce((total, s) => total + s.proba, 0);
}

/* ------------------------------------------------------------------ */
/* Cotes                                                               */
/* ------------------------------------------------------------------ */

/**
 * Convertit une probabilité en cote décimale, marge comprise.
 * cote = 1 / (p * (1 + marge)) -> la somme des probabilités implicites
 * d'un marché vaut (1 + marge), c'est ce qui fait le "bénéfice" du système.
 */
export function coteDepuisProba(p, marge = MARGE) {
  if (p <= 0) return COTE_MAX;
  const cote = 1 / (p * (1 + marge));
  return arrondirCote(Math.min(COTE_MAX, Math.max(COTE_MIN, cote)));
}

/** Arrondi à 2 décimales, sans flottement binaire. */
export function arrondirCote(c) {
  return Math.round(c * 100) / 100;
}

/** Probabilité implicite d'une cote (utile pour l'affichage "x % de chances"). */
export function probaImplicite(cote) {
  return 1 / cote;
}

/* ------------------------------------------------------------------ */
/* Marchés                                                             */
/* ------------------------------------------------------------------ */

/**
 * Construit tous les marchés disponibles pour un match.
 *
 * @param {{format:number, elo_a:number, elo_b:number, equipe_a:string, equipe_b:string}} match
 * @returns {Array<{cle:string, libelle:string, aide:string, choix:Array}>}
 */
export function marchesDuMatch(match) {
  const p = probaMap(match.elo_a, match.elo_b);
  const format = match.format;
  const dist = distributionScores(p, format);
  const marches = [];

  // --- Marché 1 : vainqueur du match ---
  const pA = probaSerie(p, format);
  marches.push({
    cle: 'vainqueur',
    libelle: 'Vainqueur du match',
    aide: 'Qui remporte la série ?',
    choix: [
      { cle: 'a', libelle: match.equipe_a, proba: pA, cote: coteDepuisProba(pA) },
      { cle: 'b', libelle: match.equipe_b, proba: 1 - pA, cote: coteDepuisProba(1 - pA) },
    ],
  });

  // --- Marché 2 : score exact en maps ---
  marches.push({
    cle: 'score_exact',
    libelle: 'Score exact en maps',
    aide: 'Le score final de la série, map par map.',
    choix: dist.map((s) => ({
      cle: `${s.scoreA}-${s.scoreB}`,
      libelle: `${s.scoreA} – ${s.scoreB}`,
      proba: s.proba,
      cote: coteDepuisProba(s.proba),
    })),
  });

  // --- Marché 3 : nombre total de maps (uniquement si la série peut varier) ---
  if (format > 1) {
    const mapsMin = Math.ceil(format / 2); // 2 pour un BO3, 3 pour un BO5
    const seuil = mapsMin + 0.5;
    const pCourt = dist
      .filter((s) => s.scoreA + s.scoreB <= mapsMin)
      .reduce((t, s) => t + s.proba, 0);
    marches.push({
      cle: 'total_maps',
      libelle: 'Nombre de maps jouées',
      aide: `La série ira-t-elle au-delà de ${mapsMin} maps ?`,
      choix: [
        {
          cle: 'under',
          libelle: `Moins de ${seuil} maps`,
          proba: pCourt,
          cote: coteDepuisProba(pCourt),
        },
        {
          cle: 'over',
          libelle: `Plus de ${seuil} maps`,
          proba: 1 - pCourt,
          cote: coteDepuisProba(1 - pCourt),
        },
      ],
    });
  }

  return marches;
}

/** Retrouve un choix précis (marché + sélection) dans les marchés d'un match. */
export function trouverChoix(match, cleMarche, cleChoix) {
  const marche = marchesDuMatch(match).find((m) => m.cle === cleMarche);
  if (!marche) return null;
  const choix = marche.choix.find((c) => c.cle === cleChoix);
  if (!choix) return null;
  return { marche, choix };
}

/* ------------------------------------------------------------------ */
/* Règlement                                                           */
/* ------------------------------------------------------------------ */

/**
 * Un pari est-il gagnant, au vu du score final ?
 * Retourne true (gagné), false (perdu) ou null (marché non reconnu).
 */
export function pariGagnant(marche, choix, scoreA, scoreB) {
  switch (marche) {
    case 'vainqueur':
      return choix === 'a' ? scoreA > scoreB : scoreB > scoreA;
    case 'score_exact':
      return choix === `${scoreA}-${scoreB}`;
    case 'total_maps': {
      const total = scoreA + scoreB;
      const mapsMin = Math.max(scoreA, scoreB);
      return choix === 'under' ? total <= mapsMin : total > mapsMin;
    }
    default:
      return null;
  }
}

/** Gain rendu au joueur : la mise multipliée par la cote figée à la prise du pari. */
export function gainPari(mise, cote, gagnant) {
  return gagnant ? Math.round(mise * cote) : 0;
}

/**
 * Nouveaux Elo après un match.
 * Le résultat réel est pondéré par l'écart de maps : gagner 2-0 déplace
 * davantage le classement que gagner 2-1, ce qui rend le modèle un peu plus
 * réactif sans complexifier la formule.
 */
export function majElo(eloA, eloB, scoreA, scoreB) {
  const total = scoreA + scoreB;
  const reelA = total === 0 ? 0.5 : scoreA / total;
  const attenduA = probaMap(eloA, eloB);
  const delta = ELO_K * (reelA - attenduA);
  return {
    elo_a: Math.round(eloA + delta),
    elo_b: Math.round(eloB - delta),
  };
}

/* ------------------------------------------------------------------ */
/* Divers                                                              */
/* ------------------------------------------------------------------ */

/** Génère un code d'invitation de ligue lisible (sans I, O, 0, 1 ambigus). */
export function genererCodeLigue() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

/** Formate un montant de Frags avec séparateur d'espace insécable. */
export function formaterFrags(n) {
  return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
}

/** Retour sur investissement d'un joueur, en pourcentage. */
export function roi(misesTotales, gainsTotaux) {
  if (!misesTotales) return 0;
  return ((gainsTotaux - misesTotales) / misesTotales) * 100;
}
