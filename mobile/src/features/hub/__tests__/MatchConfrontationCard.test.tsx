/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import { MatchConfrontationCard } from '../components/MatchConfrontationCard';
import { getMatchConfrontationState } from '../matchPresentation';
import type { HubMatch } from '../types';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Defs: 'Defs',
  G: 'G',
  LinearGradient: 'SvgLinearGradient',
  Path: 'Path',
  Rect: 'Rect',
  Stop: 'Stop',
}));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => ({
  __esModule: true,
  default: 'TeamLogo',
}));

const NOW = Date.parse('2026-09-05T12:00:00.000Z');
const MATCH: HubMatch = {
  id: 'blg-we-live',
  debut: '2026-09-05T11:00:00.000Z',
  jeu: 'lol',
  equipe_a: 'Bilibili Gaming',
  tag_a: 'BLG',
  equipe_b: 'Team WE',
  tag_b: 'WE',
  evenement: 'LPL · Playoffs',
  format: 5,
  statut: 'en_cours',
  score_a: 1,
  score_b: 0,
};

describe('MatchConfrontationCard typography', () => {
  it('presents a live match with the editorial hierarchy used by the Hub poster', async () => {
    const state = getMatchConfrontationState(MATCH, null, NOW);
    const screen = await render(
      <MatchConfrontationCard
        match={MATCH}
        onPress={jest.fn()}
        state={state}
      />,
    );

    expect(screen.getByText('EN DIRECT', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('LPL · PLAYOFFS', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('BO5', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('BLG — WE', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('1 – 0', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('EN COURS', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Bilibili Gaming', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Team WE', { includeHiddenElements: true })).toBeTruthy();
  });

  it('keeps the same hierarchy before kickoff without inventing a score', async () => {
    const upcoming = { ...MATCH, debut: '2026-09-05T18:00:00.000Z', statut: 'a_venir', score_a: null, score_b: null };
    const state = getMatchConfrontationState(upcoming, null, NOW);
    const screen = await render(
      <MatchConfrontationCard
        match={upcoming}
        onPress={jest.fn()}
        state={state}
      />,
    );

    expect(screen.getByText('BLG — WE', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('VS', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('PRONOSTIC OUVERT', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('0 – 0', { includeHiddenElements: true })).toBeNull();
  });
});
