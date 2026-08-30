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

/**
 * Prime de connexion, en série de sept jours.
 *
 * Le montant grimpe tant que la série tient, et retombe au premier jour manqué.
 * L'idée n'est pas de distribuer des Frags mais de créer un rendez-vous : le
 * septième jour vaut trois fois et demie le premier, ce qui donne une raison
 * concrète de revenir un mardi où il n'y a aucun match intéressant.
 */
export const PRIME_PALIERS = [120, 150, 180, 210, 240, 280, 420];

/** Montant plancher : c'est aussi ce qu'on touche quand une condition manque. */
export const PRIME_BASE = PRIME_PALIERS[0];

/** Longueur de la série avant remise à zéro. */
export const PRIME_SERIE_MAX = PRIME_PALIERS.length;

/** Rétrocompatibilité : l'ancien nom du bonus fixe. */
export const BONUS_QUOTIDIEN = PRIME_BASE;

/** Filet de sécurité : en dessous de ce solde, la prime est doublée. */
export const SEUIL_FAILLITE = 100;

/**
 * Plafond de richesse. Au-dessus, la prime retombe au plancher.
 * Sans ça, le leader du classement encaisse chaque jour de quoi creuser
 * l'écart sans jamais prendre le moindre risque.
 */
export const PRIME_PLAFOND_SOLDE = 3000;

/**
 * À partir de ce jour de série, la bonification se mérite : il faut avoir misé
 * au moins une fois dans la fenêtre ci-dessous. C'est le garde-fou demandé —
 * se connecter ne doit pas être une stratégie de classement.
 */
export const PRIME_JOUR_MISE = 3;
export const PRIME_FENETRE_MISE_MS = 7 * 24 * 3600 * 1000;

/** Délai minimal entre deux primes, et délai au-delà duquel la série casse. */
export const PRIME_DELAI_MS = 24 * 3600 * 1000;
export const PRIME_FENETRE_SERIE_MS = 48 * 3600 * 1000;

/** Mise minimale et maximale par pari. */
export const MISE_MIN = 10;
export const MISE_MAX = 5000;

/** Coefficient K de la mise à jour Elo. */
export const ELO_K = 24;

/** Elo attribué à une équipe inconnue. */
export const ELO_DEFAUT = 1500;

export const JEUX = {
  lol: { id: 'lol', nom: 'League of Legends', court: 'LoL', couleur: '#c8963e' },
  rocket_league: { id: 'rocket_league', nom: 'Rocket League', court: 'RL', couleur: '#35b8ff' },
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

/**
 * Formate un montant de Frags avec séparateur d'espace insécable.
 *
 * Le garde-fou sur les valeurs non numériques n'est pas de la coquetterie : une
 * donnée manquante affichait « NaN Frags » dans l'entête, ce qui ressemble à une
 * panne alors que c'est un champ absent. Un tiret dit la même chose sans
 * inquiéter — et sans masquer le problème pour autant.
 */
export function formaterFrags(n) {
  // `Number(null)` vaut 0 : sans ce test, un solde inconnu s'afficherait comme
  // un solde nul, ce qui n'est pas la même information.
  if (n === null || n === undefined || n === '') return '—';
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return Math.round(v).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');
}

/** Retour sur investissement d'un joueur, en pourcentage. */
export function roi(misesTotales, gainsTotaux) {
  if (!misesTotales) return 0;
  return ((gainsTotaux - misesTotales) / misesTotales) * 100;
}

/* ------------------------------------------------------------------ */
/* Prime de connexion en série                                         */
/* ------------------------------------------------------------------ */

/**
 * Série obtenue si le joueur réclame sa prime maintenant.
 *
 * Trois cas seulement : jamais réclamée (jour 1), réclamée il y a moins de
 * 48 h (jour suivant), réclamée il y a plus longtemps (retour au jour 1).
 * Une série complète repart aussi à 1 : la semaine est bouclée, on recommence.
 *
 * Cette fonction ne vérifie PAS le délai de 24 h — c'est au backend de le
 * faire, parce que lui seul connaît l'heure qui fait foi.
 */
export function serieApres(serieActuelle, dernierePrimeIso, maintenant = Date.now()) {
  if (!dernierePrimeIso) return 1;
  const ecart = maintenant - new Date(dernierePrimeIso).getTime();
  if (ecart >= PRIME_FENETRE_SERIE_MS) return 1;
  if ((serieActuelle || 0) >= PRIME_SERIE_MAX) return 1;
  return (serieActuelle || 0) + 1;
}

/**
 * Montant de la prime, une fois la série connue.
 *
 * L'ordre des règles compte : on part du palier de la série, on le rabote si
 * le joueur est déjà riche ou s'il ne mise pas, et le filet de faillite
 * s'applique en dernier — un joueur ruiné doit toujours pouvoir rejouer.
 */
export function montantPrime({ serie, solde, misesRecentes = 0 }) {
  const rang = Math.min(Math.max(serie || 1, 1), PRIME_SERIE_MAX);
  let montant = PRIME_PALIERS[rang - 1];
  if (solde >= PRIME_PLAFOND_SOLDE) montant = PRIME_BASE;
  if (rang >= PRIME_JOUR_MISE && !misesRecentes) montant = PRIME_BASE;
  if (solde < SEUIL_FAILLITE) montant *= 2;
  return Math.round(montant);
}

/** Millisecondes restantes avant la prochaine prime. 0 si elle est disponible. */
export function attentePrime(dernierePrimeIso, maintenant = Date.now()) {
  if (!dernierePrimeIso) return 0;
  const reste = PRIME_DELAI_MS - (maintenant - new Date(dernierePrimeIso).getTime());
  return reste > 0 ? reste : 0;
}

/* ------------------------------------------------------------------ */
/* Le call de la saison                                                */
/* ------------------------------------------------------------------ */

/** Mise autorisée sur le call. Plus haute que le minimum d'un pari : c'est un engagement. */
export const CALL_MISE_MIN = 50;
export const CALL_MISE_MAX = 2000;

/**
 * Cotes du vainqueur d'un événement, dérivées des Elo des équipes engagées.
 *
 * Le poids d'une équipe vaut 10^(Elo/400) : c'est la même échelle que la
 * formule Elo, transposée à un champ de plus de deux concurrents. La somme des
 * probabilités vaut 1, donc appliquer la marge habituelle donne le même
 * overround que sur un match.
 */
export function cotesEvenement(equipes) {
  if (!equipes?.length) return [];
  const poids = equipes.map((e) => Math.pow(10, (e.elo ?? ELO_DEFAUT) / 400));
  const total = poids.reduce((t, p) => t + p, 0);
  return equipes
    .map((e, i) => {
      const proba = poids[i] / total;
      return { ...e, proba, cote: coteDepuisProba(proba) };
    })
    .sort((a, b) => b.proba - a.proba);
}

/* ------------------------------------------------------------------ */
/* Rivalité de la semaine                                              */
/* ------------------------------------------------------------------ */

/** Empreinte entière stable d'une chaîne (FNV-1a 32 bits). */
export function empreinte(texte) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Identifiant de la semaine ISO courante, du type "2026-S33". */
export function semaineIso(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Jeudi de la semaine courante : c'est lui qui porte l'année ISO.
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const semaine = Math.ceil(((d - debutAnnee) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-S${String(semaine).padStart(2, '0')}`;
}

/** Lundi 00:00 (heure locale) de la semaine d'une date. */
export function debutSemaine(date = new Date()) {
  const d = new Date(date);
  const jour = (d.getDay() + 6) % 7; // lundi = 0
  d.setDate(d.getDate() - jour);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Le rival de la semaine : un joueur pris parmi les trois plus proches au
 * classement, choisi de façon déterministe à partir de l'identifiant et de la
 * semaine. Conséquences : le duel ne change pas d'une page à l'autre, il change
 * tout seul chaque lundi, et il ne demande aucune table.
 *
 * On regarde d'abord au-dessus : chasser est plus motivant que défendre.
 */
export function choisirRival(monId, classement, semaine = semaineIso()) {
  if (!Array.isArray(classement) || classement.length < 2) return null;
  const moi = classement.findIndex((l) => l.id === monId);
  if (moi < 0) return null;

  const voisins = [];
  for (let d = 1; d <= 3 && voisins.length < 3; d++) {
    if (moi - d >= 0) voisins.push(classement[moi - d]);
    if (voisins.length < 3 && moi + d < classement.length) voisins.push(classement[moi + d]);
  }
  if (!voisins.length) return null;
  return voisins[empreinte(`${monId}|${semaine}`) % voisins.length];
}

/** Bilan d'un lot de paris sur une période : mises, gains, bénéfice net. */
export function bilanPeriode(paris, depuis) {
  const seuil = depuis instanceof Date ? depuis.getTime() : new Date(depuis).getTime();
  const retenus = (paris || []).filter(
    (p) => new Date(p.cree_le).getTime() >= seuil && p.statut !== 'en_cours'
  );
  const mises = retenus.reduce((t, p) => t + p.mise, 0);
  const gains = retenus.reduce((t, p) => t + (p.gain || 0), 0);
  return {
    paris: retenus.length,
    gagnes: retenus.filter((p) => p.statut === 'gagne').length,
    mises,
    gains,
    net: gains - mises,
  };
}

/* ------------------------------------------------------------------ */
/* Prono par défaut (anti-décrochage)                                  */
/* ------------------------------------------------------------------ */

/** Modes du pari automatique, du plus prudent au plus large. */
export const PARI_AUTO_MODES = ['off', 'favori', 'tous'];

/** Mise automatique : volontairement basse, c'est un filet, pas une stratégie. */
export const PARI_AUTO_MISE_DEFAUT = 100;
export const PARI_AUTO_MISE_MIN = 10;
export const PARI_AUTO_MISE_MAX = 500;

/**
 * Le choix que prend le pari automatique : le favori du marché « vainqueur »,
 * c'est-à-dire la cote la plus basse.
 *
 * On ne cherche pas la valeur, on cherche à ne pas laisser un joueur sortir du
 * classement parce qu'il a oublié de miser. Le favori est le choix le moins
 * pénalisant, et il perd lentement à cause de la marge — ce qui est exactement
 * le comportement attendu d'un pari qu'on n'a pas voulu.
 */
export function choixAutomatique(marches) {
  const vainqueur = (marches || []).find((m) => m.cle === 'vainqueur');
  if (!vainqueur?.choix?.length) return null;
  return vainqueur.choix.reduce((meilleur, c) => (c.cote < meilleur.cote ? c : meilleur));
}

/** Un match est-il éligible au pari automatique pour ce joueur ? */
export function eligibleAuPariAuto({ mode, equipeFavoriteId, match }) {
  if (!PARI_AUTO_MODES.includes(mode) || mode === 'off') return false;
  if (mode === 'tous') return true;
  if (!equipeFavoriteId) return false;
  return match.equipe_a_id === equipeFavoriteId || match.equipe_b_id === equipeFavoriteId;
}

/* ------------------------------------------------------------------ */
/* Profil d'analyste                                                   */
/* ------------------------------------------------------------------ */

/** Tranches de cote, pour distinguer le joueur prudent du chasseur d'upset. */
export const TRANCHES_COTE = [
  { cle: 'favori', libelle: 'Favoris (cote < 1,80)', min: 0, max: 1.8 },
  { cle: 'equilibre', libelle: 'Équilibrés (1,80 à 3,00)', min: 1.8, max: 3 },
  { cle: 'outsider', libelle: 'Outsiders (cote > 3,00)', min: 3, max: Infinity },
];

export function trancheCote(cote) {
  return TRANCHES_COTE.find((t) => cote >= t.min && cote < t.max)?.cle ?? 'outsider';
}

/** Agrège un lot de paris réglés selon une clé, et calcule le retour sur mise. */
export function agreger(paris, cle) {
  const groupes = new Map();
  for (const p of paris) {
    const k = typeof cle === 'function' ? cle(p) : p[cle];
    if (k === null || k === undefined) continue;
    const g = groupes.get(k) ?? { cle: k, paris: 0, gagnes: 0, mises: 0, gains: 0 };
    g.paris++;
    if (p.statut === 'gagne') g.gagnes++;
    g.mises += p.mise;
    g.gains += p.gain || 0;
    groupes.set(k, g);
  }
  return [...groupes.values()]
    .map((g) => ({ ...g, net: g.gains - g.mises, roi: roi(g.mises, g.gains) }))
    .sort((a, b) => b.paris - a.paris);
}

/** Nombre de paris en dessous duquel un écart de ROI ne veut rien dire. */
export const SEUIL_SIGNIFICATIF = 5;

/**
 * Les constats du profil d'analyste.
 *
 * Règle de prudence : on ne commente jamais un groupe de moins de cinq paris.
 * Sur trois paris, un ROI de +180 % ne dit rien du joueur, il dit qu'il a eu de
 * la chance — et lui faire croire l'inverse serait le pire service à lui rendre.
 */
export function constatsAnalyste(detail, { seuil = SEUIL_SIGNIFICATIF } = {}) {
  const constats = [];
  const retenus = (liste) => (liste || []).filter((g) => g.paris >= seuil);

  const extremes = (liste, nom) => {
    const l = retenus(liste);
    if (l.length < 2) return null;
    const trie = [...l].sort((a, b) => b.roi - a.roi);
    const haut = trie[0];
    const bas = trie[trie.length - 1];
    if (haut.roi - bas.roi < 20) return null;
    return { nom, haut, bas };
  };

  for (const [liste, nom, formate] of [
    [detail.par_format, 'format', (c) => `BO${c}`],
    [detail.par_jeu, 'jeu', (c) => ({ lol: 'LoL', rocket_league: 'RL', valorant: 'Valorant' })[c] ?? c],
    [detail.par_marche, 'marché', (c) => c.replace('_', ' ')],
    [detail.par_cote, 'niveau de cote', (c) => TRANCHES_COTE.find((t) => t.cle === c)?.libelle ?? c],
  ]) {
    const e = extremes(liste, nom);
    if (!e) continue;
    constats.push({
      cle: nom,
      texte:
        `Tu es à ${signe(e.haut.roi)} % de retour sur les ${formate(e.haut.cle)} ` +
        `et à ${signe(e.bas.roi)} % sur les ${formate(e.bas.cle)}. ` +
        (e.haut.roi > 0 && e.bas.roi < 0
          ? `C'est là que se joue ton résultat : ${formate(e.bas.cle)} te coûte ce que ${formate(e.haut.cle)} te rapporte.`
          : `L'écart est net, même si les deux vont dans le même sens.`),
    });
  }

  // Le biais du supporter : il est le plus fréquent, et le plus coûteux.
  const fav = detail.equipe_favorite;
  if (fav?.avec?.paris >= seuil && fav?.sans?.paris >= seuil) {
    const ecart = fav.avec.roi - fav.sans.roi;
    if (Math.abs(ecart) >= 15) {
      constats.push({
        cle: 'equipe_favorite',
        texte:
          ecart < 0
            ? `Tu perds ${Math.abs(Math.round(ecart))} points de retour sur les matchs de ${fav.nom} ` +
              `par rapport au reste. C'est le biais du supporter, et il se corrige en misant moins, pas mieux.`
            : `Tu es meilleur sur ${fav.nom} que sur le reste (${Math.round(ecart)} points d'écart). ` +
              `Tu connais cette équipe : c'est un avantage réel, exploite-le.`,
      });
    }
  }

  if (!constats.length) {
    constats.push({
      cle: 'vide',
      texte:
        `Pas encore assez de paris réglés pour dire quoi que ce soit d'honnête. ` +
        `Il en faut au moins ${seuil} dans une même catégorie avant qu'un écart signifie autre chose que du hasard.`,
    });
  }
  return constats;
}

function signe(n) {
  const v = Math.round(n);
  return v >= 0 ? `+${v}` : `${v}`;
}

/* ------------------------------------------------------------------ */
/* La note à vie                                                       */
/* ------------------------------------------------------------------ */

/** Note de départ, et sensibilité de la mise à jour. */
export const NOTE_INITIALE = 1000;
export const NOTE_K = 16;

/** En dessous, la note n'est pas affichée : elle ne veut encore rien dire. */
export const NOTE_MIN_PARIS = 10;

/**
 * Probabilité réelle derrière une cote, marge retirée.
 *
 * La cote servie intègre 6 % de marge : sa probabilité implicite est donc
 * surestimée. Si on notait les joueurs dessus, tout le monde dériverait vers le
 * bas, y compris un joueur parfait — la note mesurerait la marge, pas le
 * jugement. On la retire.
 */
export function probaSansMarge(cote, marge = MARGE) {
  return Math.min(1, Math.max(0, 1 / (cote * (1 + marge))));
}

/**
 * Nouvelle note après un pari réglé.
 *
 * C'est un Elo joué contre le marché : on gagne des points en ayant raison
 * quand le marché te donnait peu de chances, on en perd en ayant tort sur un
 * favori. La mise n'entre PAS dans le calcul — la note mesure la justesse du
 * jugement, pas le courage ni le volume. Sans ça, elle récompenserait celui
 * qui mise gros, ce que le classement au solde fait déjà.
 */
export function majNote(note, cote, gagnant) {
  const attendu = probaSansMarge(cote);
  const reel = gagnant ? 1 : 0;
  return Math.round((note ?? NOTE_INITIALE) + NOTE_K * (reel - attendu));
}

/** Note recalculée depuis zéro sur un historique complet. */
export function noteDepuisParis(paris, depart = NOTE_INITIALE) {
  return (paris || [])
    .filter((p) => p.statut === 'gagne' || p.statut === 'perdu')
    .reduce((note, p) => majNote(note, p.cote, p.statut === 'gagne'), depart);
}

/* ------------------------------------------------------------------ */
/* Les trois classements                                               */
/* ------------------------------------------------------------------ */

/** Minimum de paris réglés pour figurer au classement du retour sur mise. */
export const CLASSEMENT_MIN_PARIS = 10;

export const MODES_CLASSEMENT = [
  {
    cle: 'solde',
    libelle: 'Solde',
    aide: 'Le classement de la saison. Il repart de zéro à chaque nouvelle saison.',
  },
  {
    cle: 'roi',
    libelle: 'Retour sur mise',
    aide: `Qui parie le mieux, indépendamment du volume. À partir de ${CLASSEMENT_MIN_PARIS} paris réglés.`,
  },
  {
    cle: 'note',
    libelle: 'Note à vie',
    aide: 'Une note qui traverse les saisons. Avoir raison contre le marché la fait monter.',
  },
];

/**
 * Trie un classement selon le mode demandé, et écarte ceux dont l'échantillon
 * est trop maigre. Un joueur avec un seul pari gagné à 40 afficherait
 * +3 900 % de retour : le laisser en tête ruinerait la crédibilité du tableau.
 */
export function trierClassement(lignes, mode = 'solde', { minParis = CLASSEMENT_MIN_PARIS } = {}) {
  const l = [...(lignes || [])];
  if (mode === 'roi') {
    return l
      .filter((x) => (x.paris ?? 0) >= minParis)
      .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0) || (b.paris ?? 0) - (a.paris ?? 0));
  }
  if (mode === 'note') {
    return l
      .filter((x) => (x.note_paris ?? 0) >= NOTE_MIN_PARIS)
      .sort((a, b) => (b.note ?? 0) - (a.note ?? 0) || (b.note_paris ?? 0) - (a.note_paris ?? 0));
  }
  return l.sort((a, b) => (b.solde ?? 0) - (a.solde ?? 0) || (b.gagnes ?? 0) - (a.gagnes ?? 0));
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

/**
 * Le catalogue.
 *
 * Trois principes, tenus sans exception :
 *
 *  1. AUCUN badge ne récompense le volume. « 100 paris posés » flatterait
 *     celui qui clique, pas celui qui voit juste — et pousserait exactement
 *     au comportement qu'on ne veut pas.
 *  2. Tout se CALCULE, rien ne se stocke. Un badge est une lecture des paris
 *     déjà réglés : impossible de désynchroniser, rien à migrer, et un badge
 *     retiré disparaît proprement.
 *  3. Chaque règle est une fonction pure d'un même récapitulatif, donc
 *     testable une par une.
 *
 * `test` reçoit le récapitulatif produit par `recapPourBadges()`.
 */
export const BADGES = [
  // --- L'audace, quand elle paie ---
  { cle: 'outsider', nom: 'Outsider', famille: 'Audace',
    description: 'Gagner un pari à une cote de 3,00 ou plus.',
    test: (s) => s.cote_max_gagnee >= 3 },
  { cle: 'contre_pied', nom: 'Contre-pied', famille: 'Audace',
    description: 'Gagner un pari à une cote de 5,00 ou plus.',
    test: (s) => s.cote_max_gagnee >= 5 },
  { cle: 'braquage', nom: 'Braquage', famille: 'Audace',
    description: 'Gagner un pari à une cote de 10,00 ou plus.',
    test: (s) => s.cote_max_gagnee >= 10 },
  { cle: 'tapis', nom: 'Tapis', famille: 'Audace',
    description: `Gagner un pari d'au moins ${SOLDE_INITIAL / 2} Frags de mise.`,
    test: (s) => s.mise_max_gagnee >= SOLDE_INITIAL / 2 },

  // --- La précision ---
  { cle: 'horloger', nom: 'Horloger', famille: 'Précision',
    description: 'Trouver un score exact en maps.',
    test: (s) => s.scores_exacts >= 1 },
  { cle: 'chirurgien', nom: 'Chirurgien', famille: 'Précision',
    description: 'Trouver cinq scores exacts.',
    test: (s) => s.scores_exacts >= 5 },
  { cle: 'lecteur', nom: 'Lecteur de série', famille: 'Précision',
    description: 'Gagner trois paris sur le nombre de maps.',
    test: (s) => s.total_maps_gagnes >= 3 },
  { cle: 'sans_faute', nom: 'Sans faute', famille: 'Précision',
    description: 'Enchaîner cinq paris gagnants.',
    test: (s) => s.plus_longue_serie >= 5 },

  // --- La rentabilité, seul juge de paix ---
  { cle: 'dans_le_vert', nom: 'Dans le vert', famille: 'Rentabilité',
    description: 'Retour sur mise positif sur au moins 20 paris réglés.',
    test: (s) => s.paris >= 20 && s.roi > 0 },
  { cle: 'analyste', nom: 'Analyste', famille: 'Rentabilité',
    description: 'Retour sur mise d’au moins 20 % sur 20 paris réglés.',
    test: (s) => s.paris >= 20 && s.roi >= 20 },
  { cle: 'requin', nom: 'Requin', famille: 'Rentabilité',
    description: 'Retour sur mise d’au moins 50 % sur 30 paris réglés.',
    test: (s) => s.paris >= 30 && s.roi >= 50 },
  { cle: 'banquier', nom: 'Banquier', famille: 'Rentabilité',
    description: 'Cumuler 2 000 Frags de bénéfice net.',
    test: (s) => s.net >= 2000 },

  // --- La régularité, mais pas l'acharnement ---
  { cle: 'assidu', nom: 'Assidu', famille: 'Régularité',
    description: 'Boucler une série de sept jours de connexion.',
    test: (s) => s.serie_prime_max >= PRIME_SERIE_MAX },
  { cle: 'habitue', nom: 'Habitué', famille: 'Régularité',
    description: 'Avoir misé sur deux saisons différentes.',
    test: (s) => s.saisons_jouees >= 2 },
  { cle: 'marathonien', nom: 'Marathonien', famille: 'Régularité',
    description: 'Avoir misé sur vingt journées différentes.',
    test: (s) => s.jours_actifs >= 20 },

  // --- La connaissance du terrain ---
  { cle: 'polyglotte', nom: 'Polyglotte', famille: 'Connaissance',
    description: 'Miser sur les trois jeux.',
    test: (s) => s.jeux_joues >= 3 },
  { cle: 'specialiste', nom: 'Spécialiste', famille: 'Connaissance',
    description: 'Vingt paris réglés sur un même jeu.',
    test: (s) => s.paris_jeu_max >= 20 },
  { cle: 'visionnaire', nom: 'Visionnaire', famille: 'Connaissance',
    description: 'Réussir son call de la saison.',
    test: (s) => s.calls_gagnes >= 1 },
  { cle: 'selectionneur', nom: 'Sélectionneur', famille: 'Connaissance',
    description: 'Choisir son équipe préférée.',
    test: (s) => s.a_equipe_favorite },

  // --- Le social ---
  { cle: 'fondateur', nom: 'Fondateur', famille: 'Social',
    description: 'Créer une ligue.',
    test: (s) => s.ligues_creees >= 1 },
  { cle: 'recruteur', nom: 'Recruteur', famille: 'Social',
    description: 'Réunir cinq joueurs dans une de ses ligues.',
    test: (s) => s.plus_grande_ligue >= 5 },
];

export const FAMILLES_BADGES = [...new Set(BADGES.map((b) => b.famille))];

/**
 * Récapitulatif d'un joueur, seule entrée des règles de badges.
 *
 * Le calcul se fait sur les paris RÉGLÉS. On le construit une fois, et les
 * vingt et une règles le relisent : ajouter un badge ne coûte alors qu'une
 * ligne, et jamais une requête de plus.
 */
export function recapPourBadges({
  paris = [],
  calls = [],
  serie_prime_max = 0,
  ligues = [],
  ligues_creees = 0,
  a_equipe_favorite = false,
} = {}) {
  const regles = paris.filter((p) => p.statut === 'gagne' || p.statut === 'perdu');
  const gagnes = regles.filter((p) => p.statut === 'gagne');
  const mises = regles.reduce((t, p) => t + p.mise, 0);
  const gains = regles.reduce((t, p) => t + (p.gain || 0), 0);

  // Ordre chronologique, pour la plus longue série de paris gagnants.
  const chronologie = [...regles].sort((a, b) => new Date(a.cree_le) - new Date(b.cree_le));
  let serie = 0;
  let plusLongueSerie = 0;
  for (const p of chronologie) {
    serie = p.statut === 'gagne' ? serie + 1 : 0;
    if (serie > plusLongueSerie) plusLongueSerie = serie;
  }

  const parJeu = new Map();
  for (const p of regles) {
    if (!p.jeu) continue;
    parJeu.set(p.jeu, (parJeu.get(p.jeu) ?? 0) + 1);
  }

  return {
    paris: regles.length,
    gagnes: gagnes.length,
    mises,
    gains,
    net: gains - mises,
    roi: roi(mises, gains),
    cote_max_gagnee: gagnes.reduce((m, p) => Math.max(m, p.cote), 0),
    mise_max_gagnee: gagnes.reduce((m, p) => Math.max(m, p.mise), 0),
    scores_exacts: gagnes.filter((p) => p.marche === 'score_exact').length,
    total_maps_gagnes: gagnes.filter((p) => p.marche === 'total_maps').length,
    plus_longue_serie: plusLongueSerie,
    jours_actifs: new Set(regles.map((p) => String(p.cree_le).slice(0, 10))).size,
    saisons_jouees: new Set(regles.map((p) => p.saison_id)).size,
    jeux_joues: parJeu.size,
    paris_jeu_max: Math.max(0, ...parJeu.values()),
    calls_gagnes: (calls || []).filter((c) => c.statut === 'gagne').length,
    serie_prime_max,
    ligues_creees,
    plus_grande_ligue: Math.max(0, ...(ligues || []).map((l) => l.nb_membres ?? 0)),
    a_equipe_favorite: Boolean(a_equipe_favorite),
  };
}

/** Évalue le catalogue et retourne chaque badge avec son état. */
export function evaluerBadges(recap) {
  return BADGES.map((b) => {
    let obtenu = false;
    try {
      obtenu = Boolean(b.test(recap));
    } catch {
      obtenu = false; // une règle qui casse ne doit jamais casser la page
    }
    return { cle: b.cle, nom: b.nom, famille: b.famille, description: b.description, obtenu };
  });
}

/* ------------------------------------------------------------------ */
/* Cartes « je l'avais dit »                                           */
/* ------------------------------------------------------------------ */

/** Seuils au-delà desquels un pari gagné mérite sa carte. */
export const CARTE_COTE_MIN = 2.5;
export const CARTE_GAIN_MIN = 1000;

/**
 * Un pari gagné mérite-t-il d'être affiché ?
 *
 * Deux portes d'entrée : la cote (tu avais raison contre tout le monde) ou le
 * gain (tu y es allé). Un favori gagné à 1,20 pour 50 Frags n'intéresse
 * personne, et une carte qu'on peut produire pour n'importe quoi ne vaut plus
 * rien — la rareté est le seul ingrédient qui fasse partager.
 */
export function carteMeritee(pari) {
  if (!pari || pari.statut !== 'gagne') return false;
  return pari.cote >= CARTE_COTE_MIN || (pari.gain ?? 0) >= CARTE_GAIN_MIN;
}

/** Le texte d'une carte, séparé de son dessin pour rester testable. */
export function texteCarte(pari, pseudo) {
  const affiche = pari.match
    ? `${pari.match.equipe_a} — ${pari.match.equipe_b}`
    : [pari.equipe_a, pari.equipe_b].filter(Boolean).join(' — ');
  return {
    accroche: 'JE L’AVAIS DIT',
    pseudo: pseudo || 'Un joueur',
    affiche,
    pari: pari.libelle_choix,
    marche: pari.libelle_marche,
    cote: Number(pari.cote).toFixed(2),
    mise: Math.round(pari.mise),
    gain: Math.round(pari.gain ?? pari.mise * pari.cote),
    date: new Date(pari.cree_le).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
  };
}

/* ------------------------------------------------------------------ */
/* Création de compétition (console d'administration)                  */
/* ------------------------------------------------------------------ */

export const FORMATS = [1, 3, 5];

/** Elo de départ d'une équipe qu'on vient de créer, et bornes acceptées. */
export const ELO_MIN = 1000;
export const ELO_MAX = 2200;

/** Transforme un nom libre en identifiant stable, lisible et sans accent. */
export function identifiant(prefixe, nom) {
  const base = String(nom || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `${prefixe}-${base || Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Valide un match avant création. Retourne un tableau de messages : vide si
 * tout va bien.
 *
 * On refuse une date passée : un match créé après son coup d'envoi serait
 * immédiatement fermé aux mises, et personne ne comprendrait pourquoi.
 */
export function validerMatch({ eventId, equipeAId, equipeBId, format, debut }, maintenant = Date.now()) {
  const erreurs = [];
  if (!eventId) erreurs.push('Choisis un tournoi.');
  if (!equipeAId || !equipeBId) erreurs.push('Choisis les deux équipes.');
  if (equipeAId && equipeAId === equipeBId) erreurs.push('Une équipe ne joue pas contre elle-même.');
  if (!FORMATS.includes(Number(format))) erreurs.push('Format attendu : BO1, BO3 ou BO5.');
  const t = new Date(debut).getTime();
  if (!Number.isFinite(t)) erreurs.push('Date de début invalide.');
  else if (t <= maintenant) erreurs.push('La date doit être dans le futur, sinon les mises sont fermées d’emblée.');
  return erreurs;
}

/** Valide une équipe avant création. */
export function validerEquipe({ nom, tag, jeu, elo }) {
  const erreurs = [];
  if (!String(nom || '').trim()) erreurs.push('Donne un nom à l’équipe.');
  if (!/^[A-Za-z0-9.]{2,6}$/.test(String(tag || '').trim())) {
    erreurs.push('Le tag fait 2 à 6 caractères, sans espace.');
  }
  if (!JEUX[jeu]) erreurs.push('Jeu inconnu.');
  const e = Number(elo);
  if (!Number.isFinite(e) || e < ELO_MIN || e > ELO_MAX) {
    erreurs.push(`L’Elo de départ doit être entre ${ELO_MIN} et ${ELO_MAX}.`);
  }
  return erreurs;
}

/* =========================================================================
   COMMUNAUTÉS — la jauge d'élixir

   Une communauté, c'est l'ensemble des joueurs qui ont choisi la même équipe
   préférée. Sa jauge se remplit avec les inscriptions : un joueur de plus qui
   met Karmine en favorite, et la jauge de Karmine monte d'un cran.

   Le choix qui compte ici est celui des paliers. Une jauge unique sur 10 000
   paraît vide et le reste : à cinq membres, elle affiche 0 %, ce qui dit
   « vous n'êtes rien » à ceux qui viennent d'arriver. Des paliers successifs
   racontent l'inverse — la première marche est à dix membres, elle se franchit
   le premier soir, et il y en a toujours une suivante.
   ========================================================================= */

export const PALIERS_COMMUNAUTE = [
  { seuil: 10, nom: 'Fiole' },
  { seuil: 50, nom: 'Flacon' },
  { seuil: 100, nom: 'Bombonne' },
  { seuil: 500, nom: 'Cuve' },
  { seuil: 1000, nom: 'Citerne' },
  { seuil: 5000, nom: 'Réservoir' },
  { seuil: 10000, nom: 'Océan' },
];

/**
 * Où en est une communauté de `membres` personnes.
 *
 * Renvoie le palier visé, le plancher dont on part, et la progression entre
 * les deux — pas la progression depuis zéro : une communauté de 520 membres
 * qui vise 1 000 doit lire « 4 % de la Citerne », pas « 52 % ».
 */
export function palierCommunaute(membres) {
  const n = Math.max(0, Math.floor(Number(membres) || 0));
  const dernier = PALIERS_COMMUNAUTE[PALIERS_COMMUNAUTE.length - 1];

  if (n >= dernier.seuil) {
    return {
      membres: n, niveau: PALIERS_COMMUNAUTE.length, nom: dernier.nom,
      plancher: dernier.seuil, objectif: dernier.seuil,
      progression: 1, restant: 0, max: true,
    };
  }

  const index = PALIERS_COMMUNAUTE.findIndex((p) => n < p.seuil);
  const palier = PALIERS_COMMUNAUTE[index];
  const plancher = index === 0 ? 0 : PALIERS_COMMUNAUTE[index - 1].seuil;
  return {
    membres: n, niveau: index + 1, nom: palier.nom,
    plancher, objectif: palier.seuil,
    progression: (n - plancher) / (palier.seuil - plancher),
    restant: palier.seuil - n, max: false,
  };
}

/* ------------------------------------------------------------------ */
/* Le niveau et l'expérience                                           */
/* ------------------------------------------------------------------ */

/**
 * La règle qui rend un niveau acceptable dans ce produit :
 * AUCUNE ACTION UNITAIRE NE DONNE D'XP.
 *
 * Poser un pronostic n'en donne jamais. L'XP ne tombe que sur des
 * événements déjà accomplis, dont chacun a déjà passé le test du volume :
 * un badge (un test vérifie que 500 pronostics médiocres n'en décrochent
 * aucun), une saison terminée avec assez de pronostics réglés, un palier
 * de note à vie franchi (la mise n'entre pas dans le calcul de la note),
 * un call réussi (un pari long, posé une fois).
 *
 * Le niveau occupe alors une place que rien d'autre n'occupe : c'est le
 * seul compteur cumulatif, permanent et monotone. Les Frags sont
 * saisonniers, les Volts se dépensent, la note est un instantané, le rang
 * change chaque semaine, les badges sont binaires. Le niveau, c'est la
 * carrière.
 *
 * Et il ne se stocke pas : tout est dérivé de données déjà en base. Un
 * Volt est de l'argent, un niveau est une lecture.
 */

export const XP_SAISON = 500;
export const XP_PALIER_NOTE = 250;
export const XP_CALL = 300;
export const XP_PAS_DE_NOTE = 25;

export const XP_RARETE = { commun: 200, exigeant: 400, rare: 800 };

/** La rareté de chaque badge, qui fixe son XP. */
export const RARETE_BADGE = {
  outsider: 'commun',      contre_pied: 'exigeant', braquage: 'rare',       tapis: 'exigeant',
  horloger: 'commun',      chirurgien: 'exigeant',  lecteur: 'exigeant',    sans_faute: 'rare',
  dans_le_vert: 'commun',  analyste: 'exigeant',    requin: 'rare',         banquier: 'exigeant',
  assidu: 'commun',        habitue: 'commun',       marathonien: 'rare',
  polyglotte: 'commun',    specialiste: 'exigeant', visionnaire: 'rare',    selectionneur: 'exigeant',
  fondateur: 'commun',     recruteur: 'exigeant',
};

export const xpDuBadge = (cle) => XP_RARETE[RARETE_BADGE[cle] ?? 'commun'];

/** Les titres, par bandes de cinq niveaux. */
export const TITRES = [
  { min: 30, nom: 'Légende' },
  { min: 25, nom: 'Vétéran' },
  { min: 20, nom: 'Expert des Frags' },
  { min: 15, nom: 'Fin renard' },
  { min: 10, nom: 'Analyste' },
  { min: 5,  nom: 'Habitué' },
  { min: 0,  nom: 'Recrue' },
];

export const titreDuNiveau = (n) => TITRES.find((t) => n >= t.min).nom;

/** XP cumulée nécessaire pour atteindre le niveau n. */
export const xpPourNiveau = (n) => 30 * n * n;

/** Le niveau atteint avec une XP donnée. */
export const niveauDepuisXp = (xp) => Math.floor(Math.sqrt(Math.max(0, xp) / 30));

/**
 * Le détail de l'XP, source par source. On renvoie le détail et pas
 * seulement le total : un compteur qu'on ne sait pas expliquer ne motive
 * personne, et le joueur doit pouvoir lire d'où viennent ses points.
 */
export function xpDetaillee({ badges = [], recap = {}, note = null, note_paris = 0 } = {}) {
  const parBadges = badges
    .filter((b) => b.obtenu)
    .reduce((t, b) => t + xpDuBadge(b.cle), 0);

  const parSaisons = (recap.saisons_jouees ?? 0) * XP_SAISON;
  const parCalls = (recap.calls_gagnes ?? 0) * XP_CALL;

  // La note ne compte qu'au-dessus du minimum de paris réglés : en dessous
  // elle ne veut rien dire, et c'est déjà la règle du classement.
  const paliersNote =
    note != null && note_paris >= NOTE_MIN_PARIS
      ? Math.max(0, Math.floor((note - NOTE_INITIALE) / XP_PAS_DE_NOTE))
      : 0;
  const parNote = paliersNote * XP_PALIER_NOTE;

  const total = parBadges + parSaisons + parCalls + parNote;

  return {
    total,
    sources: [
      { cle: 'badges',  libelle: 'Badges décrochés',   xp: parBadges,  detail: `${badges.filter((b) => b.obtenu).length} badge(s)` },
      { cle: 'saisons', libelle: 'Saisons terminées',  xp: parSaisons, detail: `${recap.saisons_jouees ?? 0} saison(s)` },
      { cle: 'note',    libelle: 'Paliers de note',    xp: parNote,    detail: `${paliersNote} palier(s)` },
      { cle: 'calls',   libelle: 'Calls réussis',      xp: parCalls,   detail: `${recap.calls_gagnes ?? 0} call(s)` },
    ].filter((s) => s.xp > 0),
  };
}

/** Tout ce qu'il faut pour dessiner la barre de niveau. */
export function progressionNiveau(xp) {
  const niveau = niveauDepuisXp(xp);
  const bas = xpPourNiveau(niveau);
  const haut = xpPourNiveau(niveau + 1);
  return {
    xp,
    niveau,
    titre: titreDuNiveau(niveau),
    dansLeNiveau: xp - bas,
    pourLeSuivant: haut - bas,
    restant: haut - xp,
    part: (xp - bas) / (haut - bas),
  };
}
