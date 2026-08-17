/**
 * Communautés V3 — source de vérité visuelle des mutations.
 *
 * La Fiole est la forme de départ. Le premier vrai seuil (10 supporters)
 * débloque donc le Flacon, puis chaque seuil remplace définitivement la forme
 * précédente. Le backend peut fournir `niveau_atteint` pour garantir qu'une
 * mutation déjà acquise ne redescend jamais si des membres quittent la faction.
 */

export const FORMES_COMMUNAUTE = [
  {
    niveau: 1,
    code: 'I',
    nom: 'Fiole',
    seuil: 0,
    recompense: 0,
    phrase: 'Le noyau vient de s’allumer.',
    lore: 'Une première étincelle existe. La faction n’est encore qu’un petit noyau, mais son énergie a déjà une forme.',
  },
  {
    niveau: 2,
    code: 'II',
    nom: 'Flacon',
    seuil: 10,
    recompense: 200,
    phrase: 'L’élixir commence à tenir sa charge.',
    lore: 'Le noyau est devenu une réserve stable. La faction peut désormais accumuler de l’énergie sans la perdre.',
  },
  {
    niveau: 3,
    code: 'III',
    nom: 'Bombonne',
    seuil: 50,
    recompense: 300,
    phrase: 'La faction devient impossible à ignorer.',
    lore: 'La réserve prend du volume. Ce n’est plus un groupe isolé : la faction commence à peser dans le réseau Clutch.',
  },
  {
    niveau: 4,
    code: 'IV',
    nom: 'Calice',
    seuil: 100,
    recompense: 500,
    phrase: 'Le récipient devient un véritable artefact.',
    lore: 'L’énergie cesse d’être seulement stockée. Elle laisse une brume persistante et transforme le récipient en relique de faction.',
  },
  {
    niveau: 5,
    code: 'V',
    nom: 'Alambic',
    seuil: 500,
    recompense: 750,
    phrase: 'La charge se raffine au lieu de simplement grossir.',
    lore: 'La faction entre en transmutation. L’élixir tourne sur lui-même, se concentre et produit une énergie plus dense.',
  },
  {
    niveau: 6,
    code: 'VI',
    nom: 'Cornue',
    seuil: 1000,
    recompense: 1000,
    phrase: 'Le réacteur devient instable — dans le bon sens.',
    lore: 'La charge déborde de son contenant. La Cornue pulse, craque et réagit à chaque nouvelle arrivée comme un organisme vivant.',
  },
  {
    niveau: 7,
    code: 'VII',
    nom: 'Océan',
    seuil: 5000,
    recompense: 1500,
    phrase: 'La faction est devenue son propre environnement.',
    lore: 'Il n’y a plus vraiment de récipient : l’énergie collective est assez vaste pour devenir un monde à part entière.',
  },
];

/** Cap terminal : après le déblocage de l’Océan, sa profondeur continue à croître. */
export const SATURATION_OCEAN = 10000;

export const COOLDOWN_FACTION_JOURS = 7;
export const COOLDOWN_FACTION_MS = COOLDOWN_FACTION_JOURS * 24 * 60 * 60 * 1000;

export function formeCommunaute(niveau = 1) {
  const n = Math.max(1, Math.min(FORMES_COMMUNAUTE.length, Number(niveau) || 1));
  return FORMES_COMMUNAUTE[n - 1];
}

export function niveauDepuisSupporters(membres) {
  const n = Math.max(0, Math.floor(Number(membres) || 0));
  let niveau = 1;
  for (const forme of FORMES_COMMUNAUTE) {
    if (n >= forme.seuil) niveau = forme.niveau;
  }
  return niveau;
}

/**
 * État de progression utilisé par le renderer des reliques.
 *
 * `niveauAtteint` est monotone quand il vient de Supabase. Sans backend V3
 * (mode démo / migration non encore appliquée), on retombe proprement sur le
 * niveau calculé à partir du nombre de supporters.
 */
export function palierFaction(membres, niveauAtteint = null) {
  const n = Math.max(0, Math.floor(Number(membres) || 0));
  const derive = niveauDepuisSupporters(n);
  const persistant = Number(niveauAtteint);
  const niveau = Math.max(
    derive,
    Number.isFinite(persistant) ? Math.max(1, Math.min(7, Math.floor(persistant))) : 1
  );

  const courant = formeCommunaute(niveau);
  const suivant = niveau < FORMES_COMMUNAUTE.length ? formeCommunaute(niveau + 1) : null;
  const plancher = courant.seuil;
  const objectif = suivant?.seuil ?? SATURATION_OCEAN;
  const denominateur = Math.max(1, objectif - plancher);
  const progression = Math.max(0, Math.min(1, (n - plancher) / denominateur));
  const restant = Math.max(0, objectif - n);
  const max = niveau === 7 && n >= SATURATION_OCEAN;

  return {
    membres: n,
    niveau,
    nom: courant.nom,
    code: courant.code,
    phrase: courant.phrase,
    lore: courant.lore,
    plancher,
    objectif,
    progression: max ? 1 : progression,
    restant: max ? 0 : restant,
    max,
    suivant,
    prochainNom: suivant?.nom ?? 'Océan saturé',
    recompenseSuivante: suivant?.recompense ?? 0,
  };
}

export function mutationDepuisNiveau(niveau) {
  const forme = formeCommunaute(niveau);
  const precedente = niveau > 1 ? formeCommunaute(niveau - 1) : null;
  return {
    ...forme,
    precedente,
  };
}

/** Palette d’énergie — volontairement distincte des couleurs d’interface. */
const TEINTES_FACTION = {
  VIT: 102, // jaune acide / vert Vitality
  KC: 252,  // bleu Karmine
  G2: 18,   // rouge chaud, le noir/blanc reste porté par l’écusson
  FNC: 52,  // orange Fnatic
  T1: 8,    // rouge T1
  TL: 232,  // bleu Team Liquid
  MKOI: 302,
  BDS: 338,
  TH: 12,
  SK: 205,
  GX: 154,
  RGE: 132,
  NAVI: 66,
  SPR: 214,
  FAZE: 5,
  MOUZ: 355,
  SEN: 348,
  DRX: 228,
  FUT: 196,
  M8: 190,
  SLY: 166,
  FLC: 158,
  AST: 355,
  PRX: 32,
  EDG: 4,
  VP: 20,
  HER: 350,
};

export function teinteFaction(tag, nom = '') {
  const cle = String(tag || '').trim().toUpperCase();
  if (TEINTES_FACTION[cle] != null) return TEINTES_FACTION[cle];
  let h = 2166136261;
  for (const c of String(nom || tag)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

export function croissanceTexte(valeur) {
  const n = Number(valeur) || 0;
  if (n > 0) return `+${n}`;
  return String(n);
}

export function cooldownFaction(changeLe, maintenant = Date.now()) {
  if (!changeLe) return { actif: false, restantMs: 0, disponibleLe: null };
  const debut = new Date(changeLe).getTime();
  if (!Number.isFinite(debut)) return { actif: false, restantMs: 0, disponibleLe: null };
  const disponible = debut + COOLDOWN_FACTION_MS;
  const restantMs = Math.max(0, disponible - maintenant);
  return {
    actif: restantMs > 0,
    restantMs,
    disponibleLe: new Date(disponible),
  };
}
