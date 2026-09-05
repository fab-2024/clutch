/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import type { RankDashboard, RankLeaderboardRow } from '../../types';
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
jest.mock('../SeasonJourneyCard', () => ({ SeasonJourneyCard: () => null }));
jest.mock('../../api', () => ({ loadRankDashboard: jest.fn() }));

describe('RankScreen leaderboard', () => {
  it('renders a long ladder through a bounded virtualized list', async () => {
    const screen = await render(<RankScreen previewData={makeDashboard(24)} />);

    await fireEvent.press(screen.getByRole('tab', { name: 'Classements' }));
    const list = await screen.findByTestId('rank-leaderboard-list');

    expect(list.props.data).toHaveLength(24);
    expect(list.props.initialNumToRender).toBe(10);
    expect(list.props.maxToRenderPerBatch).toBe(10);
    expect(list.props.windowSize).toBe(7);
    expect(list.props.removeClippedSubviews).toBe(true);
  });
});

function makeDashboard(size: number): RankDashboard {
  return {
    season: null,
    state: null,
    leaderboards: {
      global: Array.from({ length: size }, (_, index) => row(index + 1)),
      cercle: [],
      faction: [],
    },
    recentMovements: [],
    rules: { base: 0, rankedK: 40 },
    reward: {
      status: 'intersaison',
      title: 'Intersaison',
      detail: 'La prochaine saison arrive.',
    },
  };
}

function row(rank: number): RankLeaderboardRow {
  return {
    rank,
    id: `player-${rank}`,
    pseudo: `Player ${rank}`,
    frags: 1700 - rank,
    peakFrags: 1720 - rank,
    settledCalls: 20,
    wonCalls: 12,
    accuracy: 60,
    me: rank === 18,
    grade: {
      classe: true,
      objectif_placements: 0,
      placements_restants: 0,
      progression: 0.5,
      cle: 'or',
      libelle: 'Or',
      ordre: 2,
      minimum: 1050,
      plafond: 1250,
      prochaine_cle: 'platine',
      prochain_libelle: 'Platine',
      prochain_minimum: 1250,
    },
  };
}
