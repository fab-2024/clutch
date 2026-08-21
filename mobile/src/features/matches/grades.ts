// Compatibility entry point for the Match feature. Grade thresholds are no
// longer present in mobile; Supabase owns the complete seasonal scale.
export {
  gradeAccent,
  gradeTransition,
  normalizeGradeState,
  type GradeTransition,
  type SeasonalGradeState,
} from '@/src/features/ranking/grades';
