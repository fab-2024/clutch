import type { GameId } from './types';

export type GameChoice = {
  id: GameId;
  short: string;
  name: string;
  code: string;
  accent: string;
  copy: string;
  gradient: readonly [string, string, string];
  activeGradient: readonly [string, string, string];
};

export const GAMES: GameChoice[] = [
  {
    id: 'lol', short: 'LOL', name: 'League of Legends', code: 'L', accent: '#D8B35A', copy: 'LEC · Worlds · rivalités européennes',
    gradient: ['#211B0C', '#11151A', '#080B0F'], activeGradient: ['#392D10', '#151810', '#080B0F'],
  },
  {
    id: 'valorant', short: 'VAL', name: 'VALORANT', code: 'V', accent: '#FF5B70', copy: 'VCT · Masters · Champions',
    gradient: ['#291015', '#141218', '#080B0F'], activeGradient: ['#42141D', '#191315', '#080B0F'],
  },
  {
    id: 'cs2', short: 'CS2', name: 'Counter-Strike 2', code: 'C', accent: '#55A7FF', copy: 'Majors · BLAST · ESL',
    gradient: ['#0B1C2C', '#10161D', '#080B0F'], activeGradient: ['#102D48', '#12191D', '#080B0F'],
  },
];
