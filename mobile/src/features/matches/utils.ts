export function gameLabel(game: string) {
  const key = String(game || '').toLowerCase();
  if (key.includes('lol') || key.includes('league')) return 'LoL';
  if (key.includes('valorant')) return 'VALORANT';
  if (key.includes('cs')) return 'CS2';
  return String(game || 'ESPORT').toUpperCase();
}

export function gameKey(game: string) {
  const label = gameLabel(game);
  return label === 'LoL' || label === 'VALORANT' || label === 'CS2' ? label : 'Autres';
}

export type MatchPhase = 'upcoming' | 'live' | 'finished' | 'cancelled';

export function matchPhase(match: { statut: string; debut: string }, now = Date.now()): MatchPhase {
  if (match.statut === 'termine') return 'finished';
  if (match.statut === 'annule') return 'cancelled';
  if (match.statut === 'en_cours') return 'live';
  return new Date(match.debut).getTime() <= now ? 'live' : 'upcoming';
}

export function predictionIsOpen(match: { statut: string; debut: string }, now = Date.now()) {
  return match.statut === 'a_venir' && new Date(match.debut).getTime() > now;
}
