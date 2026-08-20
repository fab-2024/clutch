import type { GameId } from './types';

export type GameChoice = {
  id: GameId;
  short: string;
  name: string;
  code: string;
  accent: string;
  copy: string;
};

export const GAMES: GameChoice[] = [
  { id: 'lol', short: 'LOL', name: 'League of Legends', code: 'L', accent: '#D8B35A', copy: 'LEC · Worlds · rivalités européennes' },
  { id: 'valorant', short: 'VAL', name: 'VALORANT', code: 'V', accent: '#FF5B70', copy: 'VCT · Masters · Champions' },
  { id: 'cs2', short: 'CS2', name: 'Counter-Strike 2', code: 'C', accent: '#55A7FF', copy: 'Majors · BLAST · ESL' },
];
