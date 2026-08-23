import type { BadgeDefinition, BadgeRarity, ProfileBadge } from './types';
import { toNumber } from './utils';

const RARITY_ORDER: Record<BadgeRarity, number> = {
  mythique: 0,
  legendaire: 1,
  epique: 2,
  rare: 3,
  commun: 4,
};

const yes = (value: unknown) => value === true || value === 'true' || value === 1 || value === '1';
const precision = (recap: Record<string, unknown>) => {
  if (Number.isFinite(Number(recap.precision_pct))) return Number(recap.precision_pct);
  const total = toNumber(recap.paris);
  return total ? (toNumber(recap.gagnes) / total) * 100 : 0;
};

const PUBLIC_BADGES: BadgeDefinition[] = [
  { key: 'selectionneur', name: 'Sélectionneur', family: 'Précision', rarity: 'commun', test: (r) => toNumber(r.paris) >= 1 },
  { key: 'premier_frag', name: 'Premier Frag', family: 'Précision', rarity: 'commun', test: (r) => toNumber(r.gagnes) >= 1 },
  { key: 'sous_les_couleurs', name: 'Sous les couleurs', family: 'Communauté', rarity: 'commun', test: (r) => yes(r.a_equipe_favorite) },
  { key: 'premier_cercle', name: 'Premier cercle', family: 'Social', rarity: 'commun', test: (r) => toNumber(r.ligues_rejointes) >= 1 || toNumber(r.plus_grande_ligue) >= 1 },
  { key: 'serie_commence', name: 'La série commence', family: 'Régularité', rarity: 'commun', test: (r) => toNumber(r.serie_jours_actifs_max) >= 3 },
  { key: 'terrain_connu', name: 'Terrain connu', family: 'Connaissance', rarity: 'commun', test: (r) => toNumber(r.paris_jeu_max) >= 5 },
  { key: 'petit_arsenal', name: 'Petit Arsenal', family: 'Collection', rarity: 'commun', meta: true },
  { key: 'sans_trembler', name: 'Sans trembler', family: 'Précision', rarity: 'rare', test: (r) => toNumber(r.plus_longue_serie) >= 3 },
  { key: 'sniper', name: 'Sniper', family: 'Précision', rarity: 'rare', test: (r) => toNumber(r.paris) >= 10 && precision(r) >= 70 },
  { key: 'contre_courant', name: 'Contre-courant', family: 'Audace', rarity: 'rare', test: (r) => toNumber(r.gagnes) > 0 && toNumber(r.proba_min_gagnee) <= 0.4 },
  { key: 'deux_contre_tous', name: 'Deux contre tous', family: 'Audace', rarity: 'rare', test: (r) => toNumber(r.outsiders_220_meme_semaine_max) >= 2 },
  { key: 'specialiste', name: 'Spécialiste', family: 'Connaissance', rarity: 'rare', test: (r) => toNumber(r.paris_jeu_max) >= 15 },
  { key: 'inarretable', name: 'Inarrêtable', family: 'Régularité', rarity: 'rare', test: (r) => toNumber(r.serie_jours_actifs_max) >= 7 },
  { key: 'rival', name: 'Rival', family: 'Social', rarity: 'rare', test: (r) => yes(r.a_devance_ami) },
  { key: 'top_10', name: 'Top 10', family: 'Social', rarity: 'rare', test: (r) => yes(r.top10_ligue_20) },
  { key: 'porte_etendard', name: 'Porte-étendard', family: 'Communauté', rarity: 'rare', test: (r) => toNumber(r.communaute_membres) >= 10 },
  { key: 'chirurgien', name: 'Chirurgien', family: 'Précision', rarity: 'epique', test: (r) => toNumber(r.plus_longue_serie) >= 5 },
  { key: 'oracle', name: 'Oracle', family: 'Précision', rarity: 'epique', test: (r) => toNumber(r.paris) >= 15 && precision(r) >= 80 },
  { key: 'roi_upset', name: 'Roi de l’Upset', family: 'Audace', rarity: 'epique', test: (r) => toNumber(r.outsiders_250_gagnes) >= 3 },
  { key: 'expert_terrain', name: 'Expert du terrain', family: 'Connaissance', rarity: 'epique', test: (r) => toNumber(r.meilleure_precision_jeu_30) >= 75 },
  { key: 'pilier', name: 'Pilier', family: 'Régularité', rarity: 'epique', test: (r) => toNumber(r.plus_longue_serie_semaines) >= 4 },
  { key: 'podium', name: 'Podium', family: 'Social', rarity: 'epique', test: (r) => yes(r.podium_ligue_10) },
  { key: 'semaine_parfaite', name: 'Semaine parfaite', family: 'Précision', rarity: 'legendaire', test: (r) => yes(r.semaine_parfaite) },
  { key: 'roi_ligue', name: 'Roi de ligue', family: 'Social', rarity: 'legendaire', test: (r) => yes(r.roi_ligue_10) },
  { key: 'surcharge', name: 'Surcharge', family: 'Communauté', rarity: 'legendaire', test: (r) => toNumber(r.communaute_membres) >= 500 },
];

const SECRET_BADGES: BadgeDefinition[] = [
  { key: 'sixieme_sens', name: 'Le Sixième Sens', family: 'Audace', rarity: 'legendaire', secret: true },
  { key: 'main_froide', name: 'Main Froide', family: 'Précision', rarity: 'legendaire', secret: true },
  { key: 'david', name: 'David', family: 'Audace', rarity: 'legendaire', secret: true },
  { key: 'contre_le_monde', name: 'Contre le monde', family: 'Audace', rarity: 'legendaire', secret: true },
  { key: 'clutch_secret', name: 'GRIFF.', family: 'Prestige', rarity: 'legendaire', secret: true },
];

export function evaluateBadges(recap: Record<string, unknown>, founder: boolean): ProfileBadge[] {
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

export function resolveBadgeSelection(keys: string[], badges: ProfileBadge[], limit: number) {
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

function safeTest(badge: BadgeDefinition, recap: Record<string, unknown>) {
  try {
    return Boolean(badge.test?.(recap));
  } catch {
    return false;
  }
}
