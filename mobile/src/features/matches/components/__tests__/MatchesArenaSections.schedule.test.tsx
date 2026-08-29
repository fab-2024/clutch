/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { layout } from '@/src/theme';

import { ScheduleHero, dateKey } from '../MatchesArenaSections';

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
        visualGame="lol"
      />,
    );

    const heroStyle = StyleSheet.flatten(screen.getByTestId('matches-schedule-hero').props.style);
    expect(heroStyle.minHeight).toBeGreaterThanOrEqual(120);
    expect(heroStyle.minHeight).toBeLessThanOrEqual(150);
    expect(screen.getByText('PROCHAINS MATCHS')).toBeTruthy();
    expect(screen.getByText('AOÛT 2026')).toBeTruthy();

    const dayButtons = screen.getAllByRole('button').filter(
      (button) => button.props.accessibilityState?.selected !== undefined,
    );
    expect(dayButtons).toHaveLength(7);
    expect(dayButtons.filter((button) => button.props.accessibilityState.selected)).toHaveLength(1);
    for (const day of dayButtons) {
      expect(StyleSheet.flatten(day.props.style).height).toBeGreaterThanOrEqual(layout.minTouchTarget);
    }

    await fireEvent.press(dayButtons[1]);
    expect(onSelectDay).toHaveBeenCalledWith(dateKey(calendarDays[1]));
  });
});
