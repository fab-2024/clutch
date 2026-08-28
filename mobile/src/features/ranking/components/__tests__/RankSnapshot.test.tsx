/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import type { RankSeasonState } from '../../types';
import { nextMilestone, RankSnapshot } from '../RankSnapshot';

const STATE: RankSeasonState = {
  frags: 1032,
  peakFrags: 1084,
  settledCalls: 16,
  wonCalls: 10,
  grade: {
    classe: true,
    objectif_placements: 0,
    placements_restants: 0,
    progression: 0.91,
    cle: 'argent',
    libelle: 'Argent',
    ordre: 1,
    minimum: 850,
    plafond: 1050,
    prochaine_cle: 'or',
    prochain_libelle: 'Or',
    prochain_minimum: 1050,
  },
  rank: 148,
  percentile: 84.3,
  classifiedPlayers: 942,
  bestGrade: { cle: 'or', libelle: 'Or', ordre: 2, minimum: 1050 },
  bestRank: 121,
};

describe('RankSnapshot', () => {
  it('exposes the current position and next milestone as one concise summary', async () => {
    const screen = await render(<RankSnapshot seasonName="Saison 1" state={STATE} />);

    expect(screen.getByTestId('rank-snapshot').props.accessibilityLabel).toMatch(/ARGENT, 1.032 Frags, rang 148/);
    expect(screen.getByText('18 FRAGS AVANT OR')).toBeTruthy();
    expect(screen.getByText('#148')).toBeTruthy();
  });

  it('combines the score and verdict requirements for the final tier', () => {
    expect(nextMilestone({
      ...STATE,
      frags: 1510,
      settledCalls: 24,
      grade: {
        ...STATE.grade,
        cle: 'diamant',
        libelle: 'Diamant',
        prochain_libelle: 'Mythique',
        prochain_minimum: 1650,
        prochains_pronostics_restants: 6,
      },
    })).toBe('140 Frags et 6 verdicts avant Mythique');
  });
});
