/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import type { HubData, HubMatch } from '../types';
import { HubExperience } from '../components/HubScreen';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('lucide-react-native/icons/chevron-right', () => ({ __esModule: true, default: 'ChevronRight' }));
jest.mock('@/src/components/layout/GriffHeader', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return { GriffHeader: () => React.createElement(Text, null, 'RESTORED HEADER') };
});
jest.mock('@/src/components/layout/Screen', () => ({ Screen: 'Screen' }));
jest.mock('@/src/components/layout/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isCompactWidth: false, isShortLandscape: false }),
}));
jest.mock('@/src/components/ui/FeatureStateView', () => ({
  FEATURE_STATE_COPY: { hub: { loading: { title: 'Chargement' } } },
  FeatureStateView: 'FeatureStateView',
}));
jest.mock('@/src/components/ui/Skeleton', () => ({
  Skeleton: 'Skeleton',
  SkeletonGroup: 'SkeletonGroup',
}));
jest.mock('@/src/features/matches/matchCenterCache', () => ({ prefetchMatchCenterData: jest.fn() }));
jest.mock('@/src/features/matches/matchCenterNavigation', () => ({
  openMatchCenter: jest.fn(),
  warmMatchCenter: jest.fn(),
}));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => ({ __esModule: true, default: 'TeamLogo' }));
jest.mock('@/src/features/profile/components/ProfileHeaderButton', () => ({ __esModule: true, default: 'ProfileHeaderButton' }));
jest.mock('@/src/features/ranking/components/RankEmblem', () => ({ RankEmblem: 'RankEmblem' }));
jest.mock('@/src/providers/AuthProvider', () => ({
  useAuth: () => ({ profile: null, session: null }),
}));
jest.mock('../api', () => ({ loadHubData: jest.fn() }));
jest.mock('../components/HubContextSlot', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    HubContextSkeleton: 'HubContextSkeleton',
    HubContextSlot: () => React.createElement(Text, null, 'RESTORED CONTEXT'),
  };
});
jest.mock('../components/MatchConfrontationCard', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    MatchConfrontationCard: () => React.createElement(Text, null, 'PRIMARY MATCH POSTER'),
  };
});

const MAIN_MATCH: HubMatch = {
  id: 'main-kc-vit',
  debut: '2026-08-30T20:00:00.000Z',
  jeu: 'lol',
  equipe_a: 'Karmine Corp',
  tag_a: 'KC',
  equipe_b: 'Team Vitality',
  tag_b: 'VIT',
  evenement: 'LFL Summer Split',
  format: 3,
  statut: 'a_venir',
  score_a: null,
  score_b: null,
};

const HUB: HubData = {
  seasonId: 'season-1',
  seasonName: 'Saison Zéro',
  frags: null,
  streak: 7,
  nextMatch: MAIN_MATCH,
  upNext: [{ ...MAIN_MATCH, id: 'next-g2-fnc', equipe_a: 'G2 Esports', tag_a: 'G2', equipe_b: 'Fnatic', tag_b: 'FNC' }],
  nextMatchPrediction: null,
  predictionsToday: 2,
  leagueCount: 4,
  faction: null,
  recentResult: null,
  factionMission: {
    id: 'mission-1',
    title: 'Verrouiller 12 calls en faction',
    goal: 12,
    progress: 8,
    personalContribution: 3,
    startsAt: '2026-08-29T12:00:00.000Z',
    endsAt: '2026-08-31T12:00:00.000Z',
    completed: false,
    participants: 6,
    team: { id: 'kc', name: 'Karmine Corp', tag: 'KC', logo: null },
  },
  latestReward: null,
};

describe('HubExperience restoration', () => {
  it('keeps the redesigned main poster without removing the rest of the Hub', async () => {
    const screen = await render(
      <HubExperience
        error={null}
        headerEconomy={{ frags: 1000, volts: 300 }}
        hub={HUB}
        loading={false}
        onRefresh={jest.fn()}
        onRetry={jest.fn()}
        refreshing={false}
      />,
    );

    expect(screen.getByText('RESTORED HEADER')).toBeTruthy();
    expect(screen.getByText('TON PROCHAIN CALL.')).toBeTruthy();
    expect(screen.getByText('PRIMARY MATCH POSTER')).toBeTruthy();
    expect(screen.getByTestId('hub-season-ranking')).toBeTruthy();
    expect(screen.getByText('Ton classement')).toBeTruthy();
    expect(screen.getByText('RATING FRAGS')).toBeTruthy();
    expect(screen.getByText('RESTORED CONTEXT')).toBeTruthy();
    expect(screen.getByTestId('hub-season-controls')).toBeTruthy();
    expect(screen.getByText('À SUIVRE')).toBeTruthy();
  });
});
