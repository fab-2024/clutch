/// <reference types="jest" />

import { fireEvent, render, within } from '@testing-library/react-native';

import type { RankDashboard } from '../../types';
import RankScreen from '../RankScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/src/features/analytics/api', () => ({ trackAnalyticsEvent: jest.fn() }));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    cancelAnimation: jest.fn(),
    Easing: { inOut: () => identity, quad: identity },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withRepeat: (value: number) => value,
    withTiming: (value: number) => value,
  };
});
jest.mock('react-native-safe-area-context', () => {
  const ReactNative = jest.requireActual('react-native');
  return { SafeAreaView: ReactNative.View };
});
jest.mock('@/src/components/layout/GriffHeader', () => ({ GriffHeader: () => null }));
jest.mock('@/src/features/profile/components/ProfileHeaderButton', () => ({ __esModule: true, default: () => null }));
jest.mock('../RankEmblem', () => ({ RankEmblem: () => null }));
jest.mock('../SeasonJourneyCard', () => {
  const ReactNative = jest.requireActual('react-native');
  return { SeasonJourneyCard: () => <ReactNative.View testID="season-journey-card" /> };
});
jest.mock('../../api', () => ({ loadRankDashboard: jest.fn() }));

describe('RankScreen season horizon', () => {
  it('starts with the compact horizon and reveals the existing journey on demand', async () => {
    const screen = await render(<RankScreen previewData={DASHBOARD} previewReduceMotion />);
    const horizon = within(screen.getByTestId('rank-next-horizon'));

    expect(horizon.getByText('BRONZE')).toBeTruthy();
    expect(horizon.getByText('ARGENT')).toBeTruthy();
    expect(horizon.getByText('850 FRAGS')).toBeTruthy();
    expect(screen.queryByTestId('season-journey-card')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Voir le parcours complet de la saison' }));

    expect(screen.getByTestId('season-journey-card')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Réduire le parcours de saison' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Réduire le parcours de saison' }));

    expect(screen.queryByTestId('season-journey-card')).toBeNull();
  });
});

const DASHBOARD: RankDashboard = {
  season: {
    id: 'season-1',
    name: 'Saison 1',
    startsAt: '2026-08-01T00:00:00.000Z',
    endsAt: '2026-10-01T00:00:00.000Z',
  },
  state: {
    frags: 420,
    peakFrags: 460,
    settledCalls: 7,
    wonCalls: 5,
    grade: {
      classe: true,
      objectif_placements: 0,
      placements_restants: 0,
      progression: 420 / 850,
      cle: 'bronze',
      libelle: 'Bronze',
      ordre: 0,
      minimum: 0,
      plafond: 849,
      prochaine_cle: 'argent',
      prochain_libelle: 'Argent',
      prochain_minimum: 850,
    },
    rank: 714,
    percentile: 24,
    classifiedPlayers: 942,
    bestGrade: { cle: 'bronze', libelle: 'Bronze', ordre: 0, minimum: 0 },
    bestRank: 714,
  },
  leaderboards: { global: [], cercle: [], faction: [] },
  recentMovements: [],
  rules: { base: 0, rankedK: 40 },
  reward: {
    status: 'a_annoncer',
    title: 'Récompense de fin de saison',
    detail: 'La récompense suit le meilleur grade atteint.',
  },
};
