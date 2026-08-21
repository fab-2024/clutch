export type SeasonalGradeKey = 'recrue' | 'challenger' | 'elite' | 'master' | 'clutch';

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

const GRADE_ACCENTS: Record<SeasonalGradeKey, string> = {
  recrue: '#A8B1BA',
  challenger: '#60B7FF',
  elite: '#A982FF',
  master: '#FFB454',
  clutch: '#E8FF3D',
};

export function gradeAccent(grade?: SeasonalGradeState | SeasonalGradeSummary | null) {
  return grade?.cle ? GRADE_ACCENTS[grade.cle] : '#E8FF3D';
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
  return value === 'recrue'
    || value === 'challenger'
    || value === 'elite'
    || value === 'master'
    || value === 'clutch';
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
