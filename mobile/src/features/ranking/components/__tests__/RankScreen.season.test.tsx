jest.mock('@/src/features/profile/api', () => ({ loadProfileData: jest.fn().mockRejectedValue(new Error('Profil indisponible')) }));
/// <reference types="jest" />

import { fireEvent, render, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { normalizeGradeState } from '../../grades';
import type { RankDashboard } from '../../types';
import RankScreen from '../RankScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('lucide-react-native', () => ({ ChevronDown: () => null, ChevronUp: () => null, ChevronRight: () => null }));
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
jest.mock('../RankEmblem', () => ({ RankEmblem: () => null, rankEmblemSource: () => 1 }));
jest.mock('../SeasonJourneyCard', () => {
  const ReactNative = jest.requireActual('react-native');
  return { SeasonJourneyCard: () => <ReactNative.View testID="season-journey-card" /> };
});
jest.mock('../../api', () => ({ loadRankDashboard: jest.fn() }));

describe('RankScreen season horizon', () => {
  it('shows the current grade and reveals the existing journey on demand', async () => {
    const screen = await render(<RankScreen previewData={DASHBOARD} previewReduceMotion />);
    const horizon = within(screen.getByTestId('rank-season-hero'));

    expect(horizon.getByText('BRONZE')).toBeTruthy();
    expect(horizon.getByText('430 FRAGS AVANT ARGENT')).toBeTruthy();
    expect(horizon.getByText('RANG #714')).toBeTruthy();
    expect(screen.queryByTestId('season-journey-card')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Voir le parcours complet de la saison' }));

    expect(screen.getByTestId('season-journey-card')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Réduire le parcours de saison' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Réduire le parcours de saison' }));

    expect(screen.queryByTestId('season-journey-card')).toBeNull();
  });

  it('shows an awaiting rank at the start and opens matches from the main action', async () => {
    const screen = await render(<RankScreen previewData={{
      ...DASHBOARD,
      state: { ...DASHBOARD.state!, frags: 0, settledCalls: 0, grade: normalizeGradeState(null, { frags: 0 }) },
    }} />);

    expect(screen.getByText('RANG EN ATTENTE')).toBeTruthy();
    expect(screen.getByText('850 FRAGS AVANT ARGENT')).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(0);
    await fireEvent.press(screen.getByRole('button', { name: 'FAIRE MON PREMIER CALL' }));
    expect(router.push).toHaveBeenCalledWith('/matches-preview');
  });

  it('keeps the verdict requirement visible after reaching the next score threshold', async () => {
    const screen = await render(<RankScreen previewData={{
      ...DASHBOARD,
      state: { ...DASHBOARD.state!, frags: 1700, settledCalls: 24, grade: normalizeGradeState(null, { frags: 1700, settledCalls: 24 }) },
    }} />);

    expect(screen.getByText('6 VERDICTS AVANT MYTHIQUE')).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(100);
    expect(screen.getByRole('button', { name: 'FAIRE UN CALL' })).toBeTruthy();
  });

  it('shows the seasonal summit without an invented next score target', async () => {
    const screen = await render(<RankScreen previewData={{
      ...DASHBOARD,
      state: { ...DASHBOARD.state!, frags: 1924, settledCalls: 42, grade: normalizeGradeState(null, { frags: 1924, settledCalls: 42 }) },
    }} />);

    expect(screen.getByText('ÉTERNEL')).toBeTruthy();
    expect(screen.getByText('PALIER SAISONNIER MAXIMAL ATTEINT')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'FAIRE UN CALL' })).toBeTruthy();
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
