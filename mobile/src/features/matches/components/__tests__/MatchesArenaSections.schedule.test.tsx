/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { layout } from '@/src/theme';

import { openMatchCenter } from '../../matchCenterNavigation';
import type { ArenaMatch } from '../../types';
import { LiveMatchCard, MatchRow, ScheduleHero, dateKey } from '../MatchesArenaSections';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    FadeIn: { duration: () => ({}) },
  };
});
jest.mock('@/src/components/layout/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isShortLandscape: false }),
}));
jest.mock('@/src/features/onboarding/components/TeamLogo', () => ({ __esModule: true, default: 'TeamLogo' }));
jest.mock('../../matchCenterNavigation', () => ({
  openMatchCenter: jest.fn(),
  warmMatchCenter: jest.fn(),
}));

describe('ScheduleHero', () => {
  it('keeps the schedule compact while preserving seven accessible day targets', async () => {
    const calendarDays = Array.from(
      { length: 7 },
      (_, index) => new Date(2026, 7, 29 + index, 12),
    );
    const onSelectDay = jest.fn();
    const screen = await render(
      <ScheduleHero
        activeDayKey={dateKey(calendarDays[0])}
        calendarDays={calendarDays}
        matches={[]}
        monthLabel="AOÛT 2026"
        onQueryChange={jest.fn()}
        onSelectDay={onSelectDay}
        onToggleHistory={jest.fn()}
        onToggleSearch={jest.fn()}
        query=""
        searchOpen={false}
        status="upcoming"
        game="followed"
      />,
    );

    const heroStyle = StyleSheet.flatten(screen.getByTestId('matches-schedule-hero').props.style);
    expect(heroStyle.minHeight).toBeGreaterThanOrEqual(120);
    expect(heroStyle.minHeight).toBeLessThanOrEqual(160);
    expect(heroStyle.paddingBottom).toBe(20);
    expect(screen.getByText('PROCHAINS MATCHS')).toBeTruthy();
    expect(screen.getByText('AOÛT 2026')).toBeTruthy();

    const dayButtons = screen.getAllByRole('button').filter(
      (button) => button.props.accessibilityState?.selected !== undefined,
    );
    expect(dayButtons).toHaveLength(7);
    expect(dayButtons.filter((button) => button.props.accessibilityState.selected)).toHaveLength(1);
    for (const day of dayButtons) {
      const style = StyleSheet.flatten(day.props.style);
      expect(style.height).toBeGreaterThanOrEqual(layout.minTouchTarget);
      expect(style.minWidth).toBeGreaterThanOrEqual(layout.minTouchTarget);
    }

    await fireEvent.press(dayButtons[1]);
    expect(onSelectDay).toHaveBeenCalledWith(dateKey(calendarDays[1]));
  });
});

describe('match card navigation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('expands an open upcoming prediction instead of opening a route', async () => {
    const onOpenPrediction = jest.fn();
    const match = matchFixture('a_venir');
    const screen = await render(<MatchRow match={match} onOpenPrediction={onOpenPrediction} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Alpha Team contre Beta Esports' }));

    expect(onOpenPrediction).toHaveBeenCalledWith(match);
    expect(openMatchCenter).not.toHaveBeenCalled();
  });

  it('keeps the classic Match Center navigation for a live match', async () => {
    const match = matchFixture('en_cours');
    const screen = await render(<LiveMatchCard match={match} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Alpha Team contre Beta Esports, en direct' }));

    expect(openMatchCenter).toHaveBeenCalledTimes(1);
  });
});

function matchFixture(statut: ArenaMatch['statut']): ArenaMatch {
  return {
    id: `match-${statut}`,
    saison_id: 'season-1',
    debut: statut === 'a_venir' ? '2099-09-05T16:00:00.000Z' : '2026-09-05T12:00:00.000Z',
    jeu: 'lol',
    equipe_a: 'Alpha Team',
    tag_a: 'ALP',
    equipe_b: 'Beta Esports',
    tag_b: 'BET',
    evenement: 'Hitpoint Masters',
    format: 3,
    statut,
    score_a: statut === 'en_cours' ? 0 : null,
    score_b: statut === 'en_cours' ? 0 : null,
    prediction: null,
  };
}
