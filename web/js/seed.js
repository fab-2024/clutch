/**
 * Données de démonstration.
 *
 * Elles alimentent le mode démo (sans Supabase) et servent aussi de base au
 * fichier supabase/04_seed.sql. Les dates sont calculées relativement à
 * "maintenant" pour que la démo reste crédible quel que soit le jour.
 */

export const EQUIPES = [
  // --- League of Legends ---
  { id: 'lol-g2', jeu: 'lol', nom: 'G2 Esports', tag: 'G2', elo: 1712 },
  { id: 'lol-kc', jeu: 'lol', nom: 'Karmine Corp', tag: 'KC', elo: 1648 },
  { id: 'lol-fnc', jeu: 'lol', nom: 'Fnatic', tag: 'FNC', elo: 1601 },
  { id: 'lol-mkoi', jeu: 'lol', nom: 'Movistar KOI', tag: 'MKOI', elo: 1589 },
  { id: 'lol-vit', jeu: 'lol', nom: 'Team Vitality', tag: 'VIT', elo: 1544 },
  { id: 'lol-bds', jeu: 'lol', nom: 'Team BDS', tag: 'BDS', elo: 1498 },
  { id: 'lol-th', jeu: 'lol', nom: 'Team Heretics', tag: 'TH', elo: 1455 },
  { id: 'lol-sk', jeu: 'lol', nom: 'SK Gaming', tag: 'SK', elo: 1421 },
  { id: 'lol-gx', jeu: 'lol', nom: 'GiantX', tag: 'GX', elo: 1398 },
  { id: 'lol-rge', jeu: 'lol', nom: 'Rogue', tag: 'RGE', elo: 1472 },

  // --- Counter-Strike 2 ---
  { id: 'cs-vit', jeu: 'cs2', nom: 'Team Vitality', tag: 'VIT', elo: 1738 },
  { id: 'cs-navi', jeu: 'cs2', nom: 'Natus Vincere', tag: 'NAVI', elo: 1665 },
  { id: 'cs-spirit', jeu: 'cs2', nom: 'Team Spirit', tag: 'SPR', elo: 1691 },
  { id: 'cs-faze', jeu: 'cs2', nom: 'FaZe Clan', tag: 'FAZE', elo: 1612 },
  { id: 'cs-mouz', jeu: 'cs2', nom: 'MOUZ', tag: 'MOUZ', elo: 1587 },
  { id: 'cs-g2', jeu: 'cs2', nom: 'G2 Esports', tag: 'G2', elo: 1573 },
  { id: 'cs-falcons', jeu: 'cs2', nom: 'Team Falcons', tag: 'FLC', elo: 1541 },
  { id: 'cs-astralis', jeu: 'cs2', nom: 'Astralis', tag: 'AST', elo: 1466 },
  { id: 'cs-vp', jeu: 'cs2', nom: 'Virtus.pro', tag: 'VP', elo: 1489 },
  { id: 'cs-heroic', jeu: 'cs2', nom: 'Heroic', tag: 'HER', elo: 1432 },

  // --- Valorant ---
  { id: 'val-tl', jeu: 'valorant', nom: 'Team Liquid', tag: 'TL', elo: 1622 },
  { id: 'val-fnc', jeu: 'valorant', nom: 'Fnatic', tag: 'FNC', elo: 1704 },
  { id: 'val-kc', jeu: 'valorant', nom: 'Karmine Corp', tag: 'KC', elo: 1651 },
  { id: 'val-prx', jeu: 'valorant', nom: 'Paper Rex', tag: 'PRX', elo: 1683 },
  { id: 'val-sen', jeu: 'valorant', nom: 'Sentinels', tag: 'SEN', elo: 1558 },
  { id: 'val-drx', jeu: 'valorant', nom: 'DRX', tag: 'DRX', elo: 1596 },
  { id: 'val-g2', jeu: 'valorant', nom: 'G2 Esports', tag: 'G2', elo: 1534 },
  { id: 'val-t1', jeu: 'valorant', nom: 'T1', tag: 'T1', elo: 1512 },
  { id: 'val-nvg', jeu: 'valorant', nom: 'NAVI', tag: 'NAVI', elo: 1478 },
  { id: 'val-edg', jeu: 'valorant', nom: 'EDward Gaming', tag: 'EDG', elo: 1607 },
];

/**
 * Les saisons découpent le jeu en périodes. À chaque nouvelle saison, tous les
 * joueurs repartent avec le même solde : c'est ce qui permet à quelqu'un qui
 * arrive en retard de jouer sa chance, au lieu de courir derrière un écart
 * impossible à combler.
 */
export function construireSaisons(maintenant = Date.now()) {
  const jour = 24 * 3600 * 1000;
  return [
    {
      id: 'saison-ete-2026',
      nom: 'Saison 1 — Été 2026',
      debut: new Date(maintenant - 30 * jour).toISOString(),
      fin: new Date(maintenant + 45 * jour).toISOString(),
      solde_initial: 1000,
    },
    {
      id: 'saison-automne-2026',
      nom: 'Saison 2 — Automne 2026',
      debut: new Date(maintenant + 46 * jour).toISOString(),
      fin: new Date(maintenant + 140 * jour).toISOString(),
      solde_initial: 1000,
    },
  ];
}

export const EVENEMENTS = [
  { id: 'lec-summer', jeu: 'lol', nom: 'LEC Summer Split', tier: 'S' },
  { id: 'lfl-summer', jeu: 'lol', nom: 'LFL Summer Split', tier: 'A' },
  { id: 'blast-bounty', jeu: 'cs2', nom: 'BLAST Bounty', tier: 'S' },
  { id: 'esl-pro', jeu: 'cs2', nom: 'ESL Pro League', tier: 'S' },
  { id: 'vct-masters', jeu: 'valorant', nom: 'VCT Masters', tier: 'S' },
  { id: 'vct-emea', jeu: 'valorant', nom: 'VCT EMEA League', tier: 'A' },
];

/** Générateur pseudo-aléatoire déterministe (mulberry32), pour une démo stable. */
function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const AFFICHES = [
  // [event, equipe_a, equipe_b, format, décalage en heures depuis maintenant]
  ['lec-summer', 'lol-g2', 'lol-kc', 3, 3],
  ['lec-summer', 'lol-fnc', 'lol-vit', 3, 5.5],
  ['blast-bounty', 'cs-vit', 'cs-navi', 3, 2],
  ['vct-masters', 'val-fnc', 'val-prx', 3, 7],
  ['lec-summer', 'lol-mkoi', 'lol-bds', 3, 26],
  ['esl-pro', 'cs-spirit', 'cs-faze', 3, 24.5],
  ['vct-emea', 'val-kc', 'val-tl', 3, 28],
  ['lfl-summer', 'lol-th', 'lol-sk', 1, 30],
  ['blast-bounty', 'cs-mouz', 'cs-g2', 3, 49],
  ['vct-masters', 'val-drx', 'val-sen', 3, 51],
  ['lec-summer', 'lol-rge', 'lol-gx', 3, 52],
  ['esl-pro', 'cs-falcons', 'cs-astralis', 3, 72],
  ['vct-emea', 'val-g2', 'val-t1', 3, 74],
  ['lec-summer', 'lol-g2', 'lol-fnc', 5, 96],
  ['blast-bounty', 'cs-vit', 'cs-spirit', 5, 100],
  ['vct-masters', 'val-edg', 'val-nvg', 3, 120],
  ['lfl-summer', 'lol-kc', 'lol-vit', 3, 122],
  ['esl-pro', 'cs-vp', 'cs-heroic', 3, 144],
];

const RESULTATS = [
  // matchs déjà joués : [event, a, b, format, heures dans le passé, scoreA, scoreB]
  ['lec-summer', 'lol-kc', 'lol-bds', 3, -20, 2, 0],
  ['blast-bounty', 'cs-navi', 'cs-g2', 3, -26, 2, 1],
  ['vct-masters', 'val-prx', 'val-sen', 3, -44, 2, 1],
  ['lec-summer', 'lol-vit', 'lol-sk', 3, -48, 2, 1],
  ['esl-pro', 'cs-faze', 'cs-astralis', 3, -70, 2, 0],
  ['vct-emea', 'val-kc', 'val-g2', 3, -74, 1, 2],
];

export function construireMatchs(maintenant = Date.now()) {
  const alea = rng(20260812);
  const matchs = [];

  RESULTATS.forEach(([ev, a, b, format, h, sa, sb], i) => {
    matchs.push({
      id: `m-fini-${i}`,
      event_id: ev,
      jeu: EVENEMENTS.find((e) => e.id === ev).jeu,
      saison_id: 'saison-ete-2026',
      equipe_a_id: a,
      equipe_b_id: b,
      format,
      debut: new Date(maintenant + h * 3600 * 1000).toISOString(),
      statut: 'termine',
      score_a: sa,
      score_b: sb,
    });
  });

  AFFICHES.forEach(([ev, a, b, format, h], i) => {
    const jitter = Math.round(alea() * 40) - 20; // ± 20 min de réalisme
    matchs.push({
      id: `m-${i}`,
      event_id: ev,
      jeu: EVENEMENTS.find((e) => e.id === ev).jeu,
      saison_id: 'saison-ete-2026',
      equipe_a_id: a,
      equipe_b_id: b,
      format,
      debut: new Date(maintenant + (h * 60 + jitter) * 60 * 1000).toISOString(),
      statut: 'a_venir',
      score_a: null,
      score_b: null,
    });
  });

  return matchs.sort((x, y) => new Date(x.debut) - new Date(y.debut));
}

/**
 * Joueurs fictifs, pour que le classement ne soit pas vide en démo.
 * Leur solde est donné par saison : en saison 2, tout le monde repart à 1 000,
 * ce qui rend visible l'intérêt du système dès la démo.
 */
export const RIVAUX = [
  { id: 'u-nova', pseudo: 'NovaKill', note: 1064, note_paris: 24, equipe_favorite_id: 'lol-kc', soldes: { 'saison-ete-2026': 2340, 'saison-automne-2026': 1000 }, paris: 24, gagnes: 11 },
  { id: 'u-shiro', pseudo: 'Shirooo', note: 1012, note_paris: 31, equipe_favorite_id: 'cs-vit', soldes: { 'saison-ete-2026': 1875, 'saison-automne-2026': 1000 }, paris: 31, gagnes: 13 },
  { id: 'u-mika', pseudo: 'MikaFPS', note: 987, note_paris: 18, equipe_favorite_id: 'val-kc', soldes: { 'saison-ete-2026': 1620, 'saison-automne-2026': 1000 }, paris: 18, gagnes: 7 },
  { id: 'u-drex', pseudo: 'Drexx', note: 1031, note_paris: 27, equipe_favorite_id: 'lol-g2', soldes: { 'saison-ete-2026': 1105, 'saison-automne-2026': 1000 }, paris: 27, gagnes: 9 },
  { id: 'u-lena', pseudo: 'Lena.exe', note: 1005, note_paris: 22, equipe_favorite_id: 'val-fnc', soldes: { 'saison-ete-2026': 940, 'saison-automne-2026': 1000 }, paris: 22, gagnes: 8 },
  { id: 'u-tibo', pseudo: 'TiboOTP', note: 958, note_paris: 35, equipe_favorite_id: 'cs-navi', soldes: { 'saison-ete-2026': 610, 'saison-automne-2026': 1000 }, paris: 35, gagnes: 11 },
];
