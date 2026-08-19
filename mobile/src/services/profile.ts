import { supabase } from '@/src/lib/supabase';

export type ProfileRanking = {
  saison_id: string | null;
  saison_nom: string | null;
  frags: number;
  rang: number | null;
  pronostics_regles: number;
  pronostics_gagnes: number;
  pic_frags: number;
};

export type ProfileTeam = {
  id: string;
  nom: string;
  tag: string;
  jeu: string;
  logo: string | null;
  supporters: number;
  relique: string;
  relique_niveau: number;
};

export type RecentPrediction = {
  id: string;
  match_id: string;
  statut: 'gagne' | 'perdu';
  choix: 'a' | 'b';
  conviction: string | null;
  delta_frags: number | null;
  cree_le: string;
  regle_le: string | null;
  jeu: string;
  evenement: string;
  equipe_a: string;
  equipe_b: string;
  tag_a: string;
  tag_b: string;
  score_a: number | null;
  score_b: number | null;
};

export type BadgeRarity = 'commun' | 'rare' | 'epique' | 'legendaire' | 'mythique';

export type ProfileBadge = {
  key: string;
  name: string;
  family: string;
  rarity: BadgeRarity;
  secret?: boolean;
  obtained: boolean;
};

export type LevelState = {
  xp: number;
  level: number;
  title: string;
  prestige: 'recrue' | 'initie' | 'challenger' | 'elite' | 'master' | 'clutch';
  prestigeLabel: string;
  progress: number;
  remaining: number;
};

export type ProfileData = {
  pseudo: string;
  createdAt: string;
  profileTitle: string | null;
  founder: boolean;
  publicProfile: boolean;
  ranking: ProfileRanking;
  recap: Record<string, unknown>;
  currentStreak: number;
  favoriteTeam: ProfileTeam | null;
  bestGame: { jeu: string; pronostics: number; gagnes: number; precision_pct: number } | null;
  recent: RecentPrediction[];
  badges: ProfileBadge[];
  pinnedBadges: ProfileBadge[];
  arsenalBadges: ProfileBadge[];
  level: LevelState;
};

type RawProfile = {
  pseudo?: string;
  cree_le?: string;
  titre_profil?: string | null;
  est_fondateur?: boolean;
  profil_public?: boolean;
  badge_vedette?: string | null;
  badges_exposes?: string[] | null;
  arsenal_exposes?: string[] | null;
  classement?: Partial<ProfileRanking> | null;
  recap?: Record<string, unknown> | null;
  serie_actuelle?: number | null;
  meilleur_jeu?: ProfileData['bestGame'];
  forme_recente?: RecentPrediction[] | null;
  equipe_favorite?: Partial<ProfileTeam> | null;
};

type BadgeDefinition = Omit<ProfileBadge, 'obtained'> & {
  test?: (recap: Record<string, unknown>) => boolean;
  meta?: boolean;
};

const RARITY_XP: Record<BadgeRarity, number> = {
  commun: 200,
  rare: 400,
  epique: 800,
  legendaire: 1200,
  mythique: 2000,
};

const RARITY_ORDER: Record<BadgeRarity, number> = {
  mythique: 0,
  legendaire: 1,
  epique: 2,
  rare: 3,
  commun: 4,
};

const XP_PRONO_REGLE = 30;
const XP_PRONO_GAGNE = 20;
const XP_SAISON = 500;
const XP_CALL = 300;

const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const yes = (value: unknown) => value === true || value === 'true' || value === 1 || value === '1';
const precision = (recap: Record<string, unknown>) => {
  if (Number.isFinite(Number(recap.precision_pct))) return Number(recap.precision_pct);
  const total = number(recap.paris);
  return total ? (number(recap.gagnes) / total) * 100 : 0;
};

const PUBLIC_BADGES: BadgeDefinition[] = [
  { key: 'selectionneur', name: 'Sélectionneur', family: 'Précision', rarity: 'commun', test: (r) => number(r.paris) >= 1 },
  { key: 'premier_frag', name: 'Premier Frag', family: 'Précision', rarity: 'commun', test: (r) => number(r.gagnes) >= 1 },
  { key: 'sous_les_couleurs', name: 'Sous les couleurs', family: 'Communauté', rarity: 'commun', test: (r) => yes(r.a_equipe_favorite) },
  { key: 'premier_cercle', name: 'Premier cercle', family: 'Social', rarity: 'commun', test: (r) => number(r.ligues_rejointes) >= 1 || number(r.plus_grande_ligue) >= 1 },
  { key: 'serie_commence', name: 'La série commence', family: 'Régularité', rarity: 'commun', test: (r) => number(r.serie_jours_actifs_max) >= 3 },
  { key: 'terrain_connu', name: 'Terrain connu', family: 'Connaissance', rarity: 'commun', test: (r) => number(r.paris_jeu_max) >= 5 },
  { key: 'petit_arsenal', name: 'Petit Arsenal', family: 'Collection', rarity: 'commun', meta: true },
  { key: 'sans_trembler', name: 'Sans trembler', family: 'Précision', rarity: 'rare', test: (r) => number(r.plus_longue_serie) >= 3 },
  { key: 'sniper', name: 'Sniper', family: 'Précision', rarity: 'rare', test: (r) => number(r.paris) >= 10 && precision(r) >= 70 },
  { key: 'contre_courant', name: 'Contre-courant', family: 'Audace', rarity: 'rare', test: (r) => number(r.gagnes) > 0 && number(r.proba_min_gagnee) <= 0.4 },
  { key: 'deux_contre_tous', name: 'Deux contre tous', family: 'Audace', rarity: 'rare', test: (r) => number(r.outsiders_220_meme_semaine_max) >= 2 },
  { key: 'specialiste', name: 'Spécialiste', family: 'Connaissance', rarity: 'rare', test: (r) => number(r.paris_jeu_max) >= 15 },
  { key: 'inarretable', name: 'Inarrêtable', family: 'Régularité', rarity: 'rare', test: (r) => number(r.serie_jours_actifs_max) >= 7 },
  { key: 'rival', name: 'Rival', family: 'Social', rarity: 'rare', test: (r) => yes(r.a_devance_ami) },
  { key: 'top_10', name: 'Top 10', family: 'Social', rarity: 'rare', test: (r) => yes(r.top10_ligue_20) },
  { key: 'porte_etendard', name: 'Porte-étendard', family: 'Communauté', rarity: 'rare', test: (r) => number(r.communaute_membres) >= 10 },
  { key: 'chirurgien', name: 'Chirurgien', family: 'Précision', rarity: 'epique', test: (r) => number(r.plus_longue_serie) >= 5 },
  { key: 'oracle', name: 'Oracle', family: 'Précision', rarity: 'epique', test: (r) => number(r.paris) >= 15 && precision(r) >= 80 },
  { key: 'roi_upset', name: 'Roi de l’Upset', family: 'Audace', rarity: 'epique', test: (r) => number(r.outsiders_250_gagnes) >= 3 },
  { key: 'expert_terrain', name: 'Expert du terrain', family: 'Connaissance', rarity: 'epique', test: (r) => number(r.meilleure_precision_jeu_30) >= 75 },
  { key: 'pilier', name: 'Pilier', family: 'Régularité', rarity: 'epique', test: (r) => number(r.plus_longue_serie_semaines) >= 4 },
  { key: 'podium', name: 'Podium', family: 'Social', rarity: 'epique', test: (r) => yes(r.podium_ligue_10) },
  { key: 'semaine_parfaite', name: 'Semaine parfaite', family: 'Précision', rarity: 'legendaire', test: (r) => yes(r.semaine_parfaite) },
  { key: 'roi_ligue', name: 'Roi de ligue', family: 'Social', rarity: 'legendaire', test: (r) => yes(r.roi_ligue_10) },
  { key: 'surcharge', name: 'Surcharge', family: 'Communauté', rarity: 'legendaire', test: (r) => number(r.communaute_membres) >= 500 },
];

const SECRET_BADGES: BadgeDefinition[] = [
  { key: 'sixieme_sens', name: 'Le Sixième Sens', family: 'Audace', rarity: 'legendaire', secret: true },
  { key: 'main_froide', name: 'Main Froide', family: 'Précision', rarity: 'legendaire', secret: true },
  { key: 'david', name: 'David', family: 'Audace', rarity: 'legendaire', secret: true },
  { key: 'contre_le_monde', name: 'Contre le monde', family: 'Audace', rarity: 'legendaire', secret: true },
  { key: 'clutch_secret', name: 'CLUTCH.', family: 'Prestige', rarity: 'legendaire', secret: true },
];

export async function loadProfileData(pseudo: string): Promise<ProfileData> {
  const { data, error } = await supabase.rpc('clutch_profil_public_v1', { p_pseudo: pseudo });
  if (error) throw error;
  if (!data) throw new Error('Profil Clutch introuvable.');

  const raw = data as RawProfile;
  const recap = raw.recap ?? {};
  const founder = Boolean(raw.est_fondateur);
  const badges = evaluateBadges(recap, founder);
  const pinnedBadges = resolveSelection(
    [raw.badge_vedette ?? '', ...(raw.badges_exposes ?? [])],
    badges,
    4,
  );
  const arsenalBadges = resolveSelection(raw.arsenal_exposes ?? [], badges, 5);
  const xp = calculateXp(recap, badges);

  return {
    pseudo: raw.pseudo || pseudo,
    createdAt: raw.cree_le || new Date().toISOString(),
    profileTitle: raw.titre_profil ?? null,
    founder,
    publicProfile: raw.profil_public !== false,
    ranking: normalizeRanking(raw.classement),
    recap,
    currentStreak: number(raw.serie_actuelle),
    favoriteTeam: raw.equipe_favorite ? normalizeTeam(raw.equipe_favorite) : null,
    bestGame: raw.meilleur_jeu
      ? {
          jeu: String(raw.meilleur_jeu.jeu || ''),
          pronostics: number(raw.meilleur_jeu.pronostics),
          gagnes: number(raw.meilleur_jeu.gagnes),
          precision_pct: number(raw.meilleur_jeu.precision_pct),
        }
      : null,
    recent: Array.isArray(raw.forme_recente) ? raw.forme_recente.map(normalizeRecent) : [],
    badges,
    pinnedBadges,
    arsenalBadges,
    level: levelFromXp(xp),
  };
}

function evaluateBadges(recap: Record<string, unknown>, founder: boolean): ProfileBadge[] {
  const publicBadges = PUBLIC_BADGES.map((badge) => ({
    key: badge.key,
    name: badge.name,
    family: badge.family,
    rarity: badge.rarity,
    secret: false,
    obtained: founder || (!badge.meta && safeTest(badge, recap)),
  }));

  const otherObtained = publicBadges.filter((badge) => badge.key !== 'petit_arsenal' && badge.obtained).length;
  const smallArsenal = publicBadges.find((badge) => badge.key === 'petit_arsenal');
  if (smallArsenal) smallArsenal.obtained = founder || otherObtained >= 3;

  const secretKeys = new Set(
    Array.isArray(recap.secrets_obtenus) ? (recap.secrets_obtenus as unknown[]).map(String) : [],
  );
  const secretBadges = SECRET_BADGES.map((badge) => ({
    key: badge.key,
    name: badge.name,
    family: badge.family,
    rarity: badge.rarity,
    secret: true,
    obtained: founder || secretKeys.has(badge.key),
  }));

  return [...publicBadges, ...secretBadges];
}

function safeTest(badge: BadgeDefinition, recap: Record<string, unknown>) {
  try {
    return Boolean(badge.test?.(recap));
  } catch {
    return false;
  }
}

function resolveSelection(keys: string[], badges: ProfileBadge[], limit: number) {
  const obtained = badges
    .filter((badge) => badge.obtained)
    .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || a.name.localeCompare(b.name, 'fr'));
  const byKey = new Map(obtained.map((badge) => [badge.key, badge]));
  const selected: ProfileBadge[] = [];

  for (const key of keys.filter(Boolean)) {
    const badge = byKey.get(key);
    if (badge && !selected.some((item) => item.key === badge.key)) selected.push(badge);
    if (selected.length >= limit) break;
  }
  for (const badge of obtained) {
    if (selected.length >= limit) break;
    if (!selected.some((item) => item.key === badge.key)) selected.push(badge);
  }
  return selected;
}

function calculateXp(recap: Record<string, unknown>, badges: ProfileBadge[]) {
  const badgeXp = badges
    .filter((badge) => badge.obtained)
    .reduce((total, badge) => total + RARITY_XP[badge.rarity], 0);

  return badgeXp
    + number(recap.paris) * XP_PRONO_REGLE
    + number(recap.gagnes) * XP_PRONO_GAGNE
    + number(recap.saisons_jouees) * XP_SAISON
    + number(recap.calls_gagnes) * XP_CALL
    + number(recap.xp_quetes);
}

function levelFromXp(xp: number): LevelState {
  const level = Math.floor(Math.sqrt(Math.max(0, xp) / 30));
  const floor = 30 * level * level;
  const ceiling = 30 * (level + 1) * (level + 1);
  const progress = Math.max(0, Math.min(1, (xp - floor) / Math.max(1, ceiling - floor)));
  const title = level >= 30
    ? 'Légende'
    : level >= 25
      ? 'Vétéran'
      : level >= 20
        ? 'Expert des Frags'
        : level >= 15
          ? 'Fin renard'
          : level >= 10
            ? 'Analyste'
            : level >= 5
              ? 'Habitué'
              : 'Recrue';

  const prestige = level >= 50
    ? 'clutch'
    : level >= 35
      ? 'master'
      : level >= 20
        ? 'elite'
        : level >= 10
          ? 'challenger'
          : level >= 5
            ? 'initie'
            : 'recrue';
  const prestigeLabel = {
    recrue: 'Recrue',
    initie: 'Initié',
    challenger: 'Challenger',
    elite: 'Elite',
    master: 'Master',
    clutch: 'CLUTCH',
  }[prestige];

  return {
    xp,
    level,
    title,
    prestige,
    prestigeLabel,
    progress,
    remaining: Math.max(0, ceiling - xp),
  };
}

function normalizeRanking(value?: Partial<ProfileRanking> | null): ProfileRanking {
  return {
    saison_id: value?.saison_id ?? null,
    saison_nom: value?.saison_nom ?? null,
    frags: number(value?.frags ?? 1000),
    rang: value?.rang == null ? null : number(value.rang),
    pronostics_regles: number(value?.pronostics_regles),
    pronostics_gagnes: number(value?.pronostics_gagnes),
    pic_frags: number(value?.pic_frags ?? 1000),
  };
}

function normalizeTeam(value: Partial<ProfileTeam>): ProfileTeam {
  return {
    id: String(value.id ?? ''),
    nom: String(value.nom ?? ''),
    tag: String(value.tag ?? ''),
    jeu: String(value.jeu ?? ''),
    logo: value.logo ?? null,
    supporters: number(value.supporters),
    relique: String(value.relique ?? 'Fiole'),
    relique_niveau: Math.max(1, number(value.relique_niveau) || 1),
  };
}

function normalizeRecent(value: RecentPrediction): RecentPrediction {
  return {
    ...value,
    delta_frags: value.delta_frags == null ? null : number(value.delta_frags),
    score_a: value.score_a == null ? null : number(value.score_a),
    score_b: value.score_b == null ? null : number(value.score_b),
  };
}
