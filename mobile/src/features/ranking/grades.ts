export type SeasonalGradeKey = 'bronze' | 'argent' | 'or' | 'platine' | 'diamant' | 'mythique';

export type SeasonalGradeState = {
  classe: boolean;
  objectif_placements: number;
  placements_restants: number;
  progression: number;
  cle?: SeasonalGradeKey;
  libelle?: string;
  ordre?: number;
  minimum?: number;
  plafond?: number;
  prochaine_cle?: SeasonalGradeKey;
  prochain_libelle?: string;
  prochain_minimum?: number;
  prochain_objectif_pronostics?: number;
  prochains_pronostics_restants?: number;
};

export type SeasonalGradeSummary = {
  cle: SeasonalGradeKey;
  libelle: string;
  ordre: number;
  minimum: number;
};

export type GradeTransition = {
  before: SeasonalGradeState | null;
  after: SeasonalGradeState | null;
  kind: 'placement' | 'reveal' | 'promotion' | 'demotion' | 'stable';
};

export type SeasonalGradeDefinition = {
  key: SeasonalGradeKey;
  label: string;
  minimum: number;
  maximum: number | null;
  accent: string;
  rewardType: string;
  rewardName: string;
  rewardDetail: string;
};

export const SEASONAL_GRADE_LADDER: SeasonalGradeDefinition[] = [
  {
    key: 'bronze',
    label: 'Bronze',
    minimum: 0,
    maximum: 849,
    accent: '#B87845',
    rewardType: 'CADRE',
    rewardName: 'Entaille Bronze',
    rewardDetail: 'Un cadre graphite marqué d’une première facette.',
  },
  {
    key: 'argent',
    label: 'Argent',
    minimum: 850,
    maximum: 1049,
    accent: '#AAB4C0',
    rewardType: 'TITRE',
    rewardName: 'Trace nette',
    rewardDetail: 'Un titre saisonnier visible sur ton profil public.',
  },
  {
    key: 'or',
    label: 'Or',
    minimum: 1050,
    maximum: 1249,
    accent: '#E6B84A',
    rewardType: 'BANNIÈRE',
    rewardName: 'Éclat de saison',
    rewardDetail: 'Une bannière traversée par trois fragments dorés.',
  },
  {
    key: 'platine',
    label: 'Platine',
    minimum: 1250,
    maximum: 1449,
    accent: '#67D4C1',
    rewardType: 'VOLTS',
    rewardName: 'Réserve Platine',
    rewardDetail: 'Une allocation cosmétique de 300 Volts.',
  },
  {
    key: 'diamant',
    label: 'Diamant',
    minimum: 1450,
    maximum: 1649,
    accent: '#8AA8FF',
    rewardType: 'RELIQUE',
    rewardName: 'Cristal classé',
    rewardDetail: 'Une relique saisonnière aux facettes complètes.',
  },
  {
    key: 'mythique',
    label: 'Mythique',
    minimum: 1650,
    maximum: null,
    accent: '#E8FF3D',
    rewardType: 'ENSEMBLE',
    rewardName: 'Cœur Mythique',
    rewardDetail: 'Le set complet de la saison. Requiert aussi 30 verdicts classés.',
  },
];

const GRADE_ACCENTS = Object.fromEntries(
  SEASONAL_GRADE_LADDER.map((grade) => [grade.key, grade.accent]),
) as Record<SeasonalGradeKey, string>;

export function gradeAccent(grade?: SeasonalGradeState | SeasonalGradeSummary | null) {
  return grade?.cle ? GRADE_ACCENTS[grade.cle] : '#E8FF3D';
}

export function gradeDefinition(grade?: SeasonalGradeState | SeasonalGradeSummary | SeasonalGradeKey | null) {
  const key = typeof grade === 'string' ? grade : grade?.cle;
  return SEASONAL_GRADE_LADDER.find((item) => item.key === key) ?? null;
}

export function gradeTransition(
  before: SeasonalGradeState | null,
  after: SeasonalGradeState | null,
): GradeTransition {
  if (!after?.classe) return { before, after, kind: 'placement' };
  if (!before?.classe) return { before, after, kind: 'reveal' };

  const beforeOrder = Number(before.ordre ?? 0);
  const afterOrder = Number(after.ordre ?? 0);
  if (afterOrder > beforeOrder) return { before, after, kind: 'promotion' };
  if (afterOrder < beforeOrder) return { before, after, kind: 'demotion' };
  return { before, after, kind: 'stable' };
}

export function normalizeGradeState(value: unknown): SeasonalGradeState {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const key = isGradeKey(row.cle) ? row.cle : undefined;
  const nextKey = isGradeKey(row.prochaine_cle) ? row.prochaine_cle : undefined;
  return {
    classe: Boolean(row.classe),
    objectif_placements: positiveInteger(row.objectif_placements, 5),
    placements_restants: nonNegativeInteger(row.placements_restants),
    progression: clamp(Number(row.progression ?? 0), 0, 1),
    cle: key,
    libelle: typeof row.libelle === 'string' ? row.libelle : undefined,
    ordre: optionalNumber(row.ordre),
    minimum: optionalNumber(row.minimum),
    plafond: optionalNumber(row.plafond),
    prochaine_cle: nextKey,
    prochain_libelle: typeof row.prochain_libelle === 'string' ? row.prochain_libelle : undefined,
    prochain_minimum: optionalNumber(row.prochain_minimum),
    prochain_objectif_pronostics: optionalNumber(row.prochain_objectif_pronostics),
    prochains_pronostics_restants: optionalNumber(row.prochains_pronostics_restants),
  };
}

export function normalizeGradeSummary(value: unknown): SeasonalGradeSummary | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (!isGradeKey(row.cle) || typeof row.libelle !== 'string') return null;
  return {
    cle: row.cle,
    libelle: row.libelle,
    ordre: Number(row.ordre ?? 0),
    minimum: Number(row.minimum ?? 0),
  };
}

function isGradeKey(value: unknown): value is SeasonalGradeKey {
  return value === 'bronze'
    || value === 'argent'
    || value === 'or'
    || value === 'platine'
    || value === 'diamant'
    || value === 'mythique';
}

function optionalNumber(value: unknown) {
  if (value == null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(value: unknown) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}
