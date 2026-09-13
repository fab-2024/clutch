export const FIGURINE_EVOLUTION_TIERS = [
  { form: 1, label: 'Forme initiale', settledCalls: 0, activeDays: 0 },
  { form: 2, label: 'Deuxième forme', settledCalls: 10, activeDays: 5 },
  { form: 3, label: 'Forme finale', settledCalls: 50, activeDays: 20 },
] as const;

// Presentation only. Acquisition and form ownership must be confirmed by the
// server; client counters never grant an item or authorize equipment.
export function eligibleFigurineForm(settledCalls: number, activeDays: number): 1 | 2 | 3 {
  const calls = Number.isFinite(settledCalls) ? Math.max(0, Math.floor(settledCalls)) : 0;
  const days = Number.isFinite(activeDays) ? Math.max(0, Math.floor(activeDays)) : 0;
  if (calls >= 50 && days >= 20) return 3;
  if (calls >= 10 && days >= 5) return 2;
  return 1;
}
