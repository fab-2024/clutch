import type { SeasonalGradeState } from '../grades';
import type { RankDashboard, RankLeaderboardRow } from '../types';
import RankScreen from './RankScreen';

const ELITE: SeasonalGradeState = {
  classe: true,
  objectif_placements: 5,
  placements_restants: 0,
  progression: 0.61,
  cle: 'elite',
  libelle: 'Élite',
  ordre: 2,
  minimum: 1600,
  plafond: 2000,
  prochaine_cle: 'master',
  prochain_libelle: 'Master',
  prochain_minimum: 2000,
};

const MASTER: SeasonalGradeState = {
  ...ELITE,
  progression: 0.34,
  cle: 'master',
  libelle: 'Master',
  ordre: 3,
  minimum: 2000,
  plafond: 2400,
  prochaine_cle: 'clutch',
  prochain_libelle: 'Clutch',
  prochain_minimum: 2400,
};

const CHALLENGER: SeasonalGradeState = {
  ...ELITE,
  progression: 0.72,
  cle: 'challenger',
  libelle: 'Challenger',
  ordre: 1,
  minimum: 1200,
  plafond: 1600,
  prochaine_cle: 'elite',
  prochain_libelle: 'Élite',
  prochain_minimum: 1600,
};

const GLOBAL: RankLeaderboardRow[] = [
  row('nova', 'Nova', 1, 2218, 31, 23, MASTER),
  row('akira', 'Akira', 2, 2074, 28, 20, MASTER),
  row('pierre-louis', 'Pierre-Louis', 128, 1842, 35, 24, ELITE, true),
  row('melo', 'Melo', 129, 1827, 26, 18, ELITE),
  row('sora', 'Sora', 130, 1574, 19, 12, CHALLENGER),
];

const PREVIEW: RankDashboard = {
  season: {
    id: 'preview-season',
    name: 'Saison Zéro',
    startsAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString(),
  },
  state: {
    frags: 1842,
    peakFrags: 1917,
    settledCalls: 35,
    wonCalls: 24,
    placementsRemaining: 0,
    provisional: false,
    grade: ELITE,
    rank: 128,
    percentile: 86.4,
    classifiedPlayers: 942,
    bestGrade: { cle: 'elite', libelle: 'Élite', ordre: 2, minimum: 1600 },
    bestRank: 96,
  },
  leaderboards: {
    global: GLOBAL,
    cercle: [GLOBAL[1], GLOBAL[2], GLOBAL[4]],
    faction: [GLOBAL[0], GLOBAL[2], GLOBAL[3], GLOBAL[4]],
  },
  reward: {
    status: 'a_annoncer',
    title: 'Récompense de fin de saison',
    detail: 'La signature cosmétique de ton meilleur grade sera révélée avant la clôture. Aucun objet n’est encore attribué.',
  },
};

export default function RankPreviewScreen() {
  return <RankScreen previewData={PREVIEW} />;
}

function row(
  id: string,
  pseudo: string,
  rank: number,
  frags: number,
  settledCalls: number,
  wonCalls: number,
  grade: SeasonalGradeState,
  me = false,
): RankLeaderboardRow {
  return {
    id,
    pseudo,
    rank,
    frags,
    peakFrags: frags + 38,
    settledCalls,
    wonCalls,
    accuracy: Math.round((wonCalls / settledCalls) * 1000) / 10,
    provisional: false,
    me,
    grade,
  };
}
