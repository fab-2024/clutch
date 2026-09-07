export type MatchPhase = 'upcoming' | 'live' | 'finished' | 'cancelled' | 'pending';

// Safety horizon for an unresolved series, not an inferred final result.
export const LIVE_MATCH_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function classifyMatchPhase(match: { statut: string; debut: string }, now = Date.now()): MatchPhase {
  const status = String(match.statut || '').toLowerCase();
  if (['termine', 'terminee', 'finished'].includes(status)) return 'finished';
  if (['annule', 'cancelled'].includes(status)) return 'cancelled';
  const startsAt = Date.parse(match.debut);
  if (!Number.isFinite(startsAt)) return 'pending';
  if (['en_cours', 'live'].includes(status)) {
    return startsAt <= now && startsAt >= now - LIVE_MATCH_MAX_AGE_MS ? 'live' : 'pending';
  }
  return status === 'a_venir' && startsAt > now ? 'upcoming' : 'pending';
}
