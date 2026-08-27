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
  kind: 'promotion' | 'demotion' | 'stable';
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

export const RANK_INITIAL_FRAGS = 0;
export const ZERO_RANK_ACCENT = '#66D9E8';

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
  const beforeOrder = Number(before?.ordre ?? 0);
  const afterOrder = Number(after?.ordre ?? 0);
  if (afterOrder > beforeOrder) return { before, after, kind: 'promotion' };
  if (afterOrder < beforeOrder) return { before, after, kind: 'demotion' };
  return { before, after, kind: 'stable' };
}

export function normalizeGradeState(
  value: unknown,
  context: { frags?: number; settledCalls?: number } = {},
): SeasonalGradeState {
  const row = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const key = isGradeKey(row.cle) ? row.cle : undefined;
  const parsedFrags = Number(context.frags ?? RANK_INITIAL_FRAGS);
  const frags = Number.isFinite(parsedFrags) ? Math.max(RANK_INITIAL_FRAGS, parsedFrags) : RANK_INITIAL_FRAGS;
  const settledCalls = nonNegativeInteger(context.settledCalls);
  const definition = key
    ? SEASONAL_GRADE_LADDER.find((item) => item.key === key) ?? gradeForScore(frags, settledCalls)
    : gradeForScore(frags, settledCalls);
  const definitionIndex = SEASONAL_GRADE_LADDER.indexOf(definition);
  const nextDefinition = SEASONAL_GRADE_LADDER[definitionIndex + 1];
  const nextKey = isGradeKey(row.prochaine_cle) ? row.prochaine_cle : nextDefinition?.key;
  const rawProgress = Number(row.progression);
  const progression = row.classe === true && key && Number.isFinite(rawProgress)
    ? clamp(rawProgress, 0, 1)
    : gradeProgress(frags, definition, nextDefinition);
  return {
    classe: true,
    objectif_placements: 0,
    placements_restants: 0,
    progression,
    cle: definition.key,
    libelle: typeof row.libelle === 'string' && key ? row.libelle : definition.label,
    ordre: optionalNumber(row.ordre) ?? definitionIndex,
    minimum: optionalNumber(row.minimum) ?? definition.minimum,
    plafond: optionalNumber(row.plafond) ?? definition.maximum ?? undefined,
    prochaine_cle: nextKey,
    prochain_libelle: typeof row.prochain_libelle === 'string' ? row.prochain_libelle : nextDefinition?.label,
    prochain_minimum: optionalNumber(row.prochain_minimum) ?? nextDefinition?.minimum,
    prochain_objectif_pronostics: optionalNumber(row.prochain_objectif_pronostics)
      ?? (nextDefinition?.key === 'mythique' ? 30 : undefined),
    prochains_pronostics_restants: optionalNumber(row.prochains_pronostics_restants)
      ?? (nextDefinition?.key === 'mythique' ? Math.max(0, 30 - settledCalls) : undefined),
  };
}

export function isZeroRank(frags: number | null | undefined) {
  const value = Number(frags ?? RANK_INITIAL_FRAGS);
  return !Number.isFinite(value) || value <= RANK_INITIAL_FRAGS;
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

function nonNegativeInteger(value: unknown) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function gradeForScore(frags: number, settledCalls: number) {
  return SEASONAL_GRADE_LADDER.filter((grade) => (
    grade.minimum <= frags && (grade.key !== 'mythique' || settledCalls >= 30)
  )).at(-1) ?? SEASONAL_GRADE_LADDER[0];
}

function gradeProgress(
  frags: number,
  current: SeasonalGradeDefinition,
  next?: SeasonalGradeDefinition,
) {
  if (!next) return 1;
  return clamp((frags - current.minimum) / Math.max(1, next.minimum - current.minimum), 0, 1);
}

function clamp(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, value));
}
