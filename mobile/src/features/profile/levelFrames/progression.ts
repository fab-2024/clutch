export type SignalAscendantStage = 1 | 2 | 3 | 4 | 5 | 6;

export function getSignalAscendantStage(level: number): SignalAscendantStage {
  const normalized = Math.max(1, Math.floor(Number(level) || 1));
  if (normalized >= 100) return 6;
  if (normalized >= 75) return 5;
  if (normalized >= 50) return 4;
  if (normalized >= 25) return 3;
  if (normalized >= 10) return 2;
  return 1;
}
