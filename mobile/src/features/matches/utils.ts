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
