export const PLACEMENT_TARGET = 5;

export type SeasonalGradeKey = 'recrue' | 'challenger' | 'elite' | 'master' | 'clutch';

export type SeasonalGrade = {
  key: SeasonalGradeKey;
  label: string;
  minimum: number;
  accent: string;
};

export const SEASONAL_GRADES: readonly SeasonalGrade[] = [
  { key: 'recrue', label: 'Recrue', minimum: 0, accent: '#A8B1BA' },
  { key: 'challenger', label: 'Challenger', minimum: 1200, accent: '#60B7FF' },
  { key: 'elite', label: 'Élite', minimum: 1600, accent: '#A982FF' },
  { key: 'master', label: 'Master', minimum: 2000, accent: '#FFB454' },
  { key: 'clutch', label: 'Clutch', minimum: 2400, accent: '#E8FF3D' },
] as const;

export type GradeTransition = {
  before: SeasonalGrade | null;
  after: SeasonalGrade | null;
  kind: 'placement' | 'reveal' | 'promotion' | 'demotion' | 'stable';
};

export function seasonalGrade(frags: number, settledVerdicts: number) {
  if (settledVerdicts < PLACEMENT_TARGET) return null;

  for (let index = SEASONAL_GRADES.length - 1; index >= 0; index -= 1) {
    if (frags >= SEASONAL_GRADES[index].minimum) return SEASONAL_GRADES[index];
  }

  return SEASONAL_GRADES[0];
}

export function gradeTransition(
  fragsBefore: number,
  fragsAfter: number,
  verdictsBefore: number,
  verdictsAfter: number,
): GradeTransition {
  const before = seasonalGrade(fragsBefore, verdictsBefore);
  const after = seasonalGrade(fragsAfter, verdictsAfter);

  if (!after) return { before, after, kind: 'placement' };
  if (!before) return { before, after, kind: 'reveal' };

  const beforeIndex = SEASONAL_GRADES.findIndex((grade) => grade.key === before.key);
  const afterIndex = SEASONAL_GRADES.findIndex((grade) => grade.key === after.key);

  if (afterIndex > beforeIndex) return { before, after, kind: 'promotion' };
  if (afterIndex < beforeIndex) return { before, after, kind: 'demotion' };
  return { before, after, kind: 'stable' };
}
