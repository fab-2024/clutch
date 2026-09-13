/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import type { ArenaMatch } from '../../types';
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
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return { __esModule: true, default: { View: RN.View }, FadeIn: { duration: () => ({}) } };
});

describe('Matches filters', () => {
  it('shows one calendar feed and filters it with Tous, LOL, VALO and RL', async () => {
    const now = new Date();
    const screen = await render(<MatchesExperience
      error={null}
      finished={[match('result', 'termine', 'lol', dateAt(now, -2))]}
      loading={false}
      onRefresh={jest.fn()}
      onRetry={jest.fn()}
      refreshing={false}
      upcoming={[
        match('future', 'a_venir', 'lol', dateAt(now, 2)),
        match('live-lol', 'en_cours', 'lol', dateAt(now, -1)),
        match('live-val', 'en_cours', 'valorant', dateAt(now, -1)),
      ]}
    />);

    expect(screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel)).toEqual([
      'Tous les jeux',
      'League of Legends',
      'Valorant',
      'Rocket League',
    ]);
    expect(screen.getByRole('button', { name: 'future A contre future B' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'live-lol A contre live-lol B, en direct' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'live-val A contre live-val B, en direct' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'result A contre result B' })).toBeTruthy();
    expect(screen.queryByText('En cours')).toBeNull();
    expect(screen.queryByText('À venir')).toBeNull();
    expect(screen.queryByText('Résultats')).toBeNull();
    expect(screen.queryByText('Mes calls')).toBeNull();
    expect(screen.queryByText('ADMINISTRER LE CALENDRIER')).toBeNull();
    expect(screen.getByRole('button', { name: 'Ouvrir le calendrier' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Ouvrir le calendrier' }));
    expect(screen.getByTestId('matches-calendar-modal')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choisir aujourd’hui' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer' }));

    await fireEvent.press(screen.getByRole('tab', { name: 'League of Legends' }));
    expect(screen.queryByRole('button', { name: 'live-val A contre live-val B, en direct' })).toBeNull();
    expect(screen.getByRole('button', { name: 'live-lol A contre live-lol B, en direct' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Rechercher un match' }));
    await fireEvent.changeText(screen.getByLabelText('Rechercher une équipe ou une compétition'), 'unknown');
    expect(screen.queryByRole('button', { name: 'future A contre future B' })).toBeNull();
    expect(screen.getByText('Pas de match ce jour')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Fermer la recherche' }));
    expect(screen.getByRole('button', { name: 'future A contre future B' })).toBeTruthy();
  });
});

function dateAt(base: Date, hourOffset: number) {
  const date = new Date(base);
  date.setHours(date.getHours() + hourOffset);
  return date.toISOString();
}

function match(id: string, statut: ArenaMatch['statut'], jeu: string, debut: string): ArenaMatch {
  return {
    id, statut, jeu, debut, saison_id: 'season-1',
    equipe_a: `${id} A`, tag_a: 'A', equipe_b: `${id} B`, tag_b: 'B',
    evenement: 'Test League', format: 3, score_a: null, score_b: null, prediction: null,
  };
}
