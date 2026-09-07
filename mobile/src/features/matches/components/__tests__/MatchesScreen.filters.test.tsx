/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import type { ArenaMatch, MyCallsDashboard } from '../../types';
import { MatchesExperience } from '../MatchesScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() }, useLocalSearchParams: () => ({}) }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({}) }));
jest.mock('../../hooks/useMatchesDashboard', () => ({ useMatchesDashboard: jest.fn() }));
jest.mock('../../matchCenterCache', () => ({ prefetchMatchCenterData: jest.fn() }));
jest.mock('../../matchCenterNavigation', () => ({ warmMatchCenter: jest.fn(), openMatchCenter: jest.fn() }));
jest.mock('@/src/components/layout/GriffHeader', () => ({ GriffHeader: () => null }));
jest.mock('@/src/components/layout/Screen', () => ({ Screen: 'Screen' }));
jest.mock('@/src/components/layout/useResponsiveLayout', () => ({ useResponsiveLayout: () => ({ isShortLandscape: false }) }));
jest.mock('@/src/features/profile/components/ProfileHeaderButton', () => ({ __esModule: true, default: () => null }));
jest.mock('@/src/features/onboarding/components/GameLogo', () => ({ __esModule: true, default: () => null }));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => ({ __esModule: true, default: () => null }));
jest.mock('../InlinePredictionPanel', () => ({ InlinePredictionPanel: () => null }));
jest.mock('../MyCallsPanel', () => ({ MyCallsPanel: 'MyCallsPanel' }));
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return { __esModule: true, default: { View: RN.View }, FadeIn: { duration: () => ({}) } };
});

const CALLS: MyCallsDashboard = {
  saison_id: null, saison_nom: null,
  compteurs: { ouverts: 0, verrouilles: 2, reussis: 0, manques: 0 },
  ouverts: [], verrouilles: [], reussis: [], manques: [],
};

describe('Matches filters', () => {
  it('separates upcoming, live and finished matches and scopes the live badge to the chosen game', async () => {
    const screen = await render(<MatchesExperience
      calls={CALLS}
      error={null}
      finished={[match('result', 'termine', 'lol', '2026-09-01T10:00:00.000Z')]}
      followedGames={['lol', 'valorant']}
      isAdmin={false}
      loading={false}
      onRefresh={jest.fn()}
      onRetry={jest.fn()}
      refreshing={false}
      upcoming={[
        match('future', 'a_venir', 'lol', '2099-09-07T10:00:00.000Z'),
        match('live-lol', 'en_cours', 'lol', '2026-09-06T10:00:00.000Z'),
        match('live-val', 'en_cours', 'valorant', '2026-09-07T10:00:00.000Z'),
      ]}
    />);

    expect(screen.getByRole('button', { name: 'future A contre future B' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'live-lol A contre live-lol B, en direct' })).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'En cours, 2 matchs' }));
    expect(screen.getByRole('button', { name: 'live-lol A contre live-lol B, en direct' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'live-val A contre live-val B, en direct' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'future A contre future B' })).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'League of Legends' }));
    expect(screen.getByRole('tab', { name: 'En cours, 1 match' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'live-val A contre live-val B, en direct' })).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'RÉSULTATS' }));
    expect(screen.getByRole('button', { name: 'result A contre result B' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Mes calls, 2 verrouillés' }));
    expect(screen.getByRole('button', { name: 'Fermer Mes calls' }).props.accessibilityState.expanded).toBe(true);
    await fireEvent.press(screen.getByRole('tab', { name: 'À VENIR' }));
    expect(screen.getByRole('button', { name: 'future A contre future B' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Fermer Mes calls' })).toBeNull();
  });
});

function match(id: string, statut: ArenaMatch['statut'], jeu: string, debut: string): ArenaMatch {
  return {
    id, statut, jeu, debut, saison_id: 'season-1',
    equipe_a: `${id} A`, tag_a: 'A', equipe_b: `${id} B`, tag_b: 'B',
    evenement: 'Test League', format: 3, score_a: null, score_b: null, prediction: null,
  };
}
