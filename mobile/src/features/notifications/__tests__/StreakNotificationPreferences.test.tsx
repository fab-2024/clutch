import { fireEvent, render } from '@testing-library/react-native';

import StreakNotificationPreferences, { formatQuietTime } from '../components/StreakNotificationPreferences';
import { applyNotificationRecommendation, DEFAULT_NOTIFICATION_PREFERENCES as defaults, type NotificationPreferences } from '../types';

describe('streak preferences controls', () => {
  it('toggles streak reminders without changing calls/results or social preferences', async () => {
    const change = jest.fn();
    const screen = await render(<StreakNotificationPreferences preferences={defaults} onChange={change} />);
    const switches = screen.getAllByRole('switch');
    await fireEvent.press(switches[0]);
    expect(change).toHaveBeenCalledWith({ ...defaults, streakRisk: false });
    await fireEvent.press(switches[1]);
    expect(change).toHaveBeenLastCalledWith({ ...defaults, streakProtected: false });
    await fireEvent.press(switches[2]);
    expect(change).toHaveBeenLastCalledWith({ ...defaults, quietHoursEnabled: true });
  });

  it('wraps midnight and never makes start and end equal', async () => {
    const change = jest.fn();
    const prefs = { ...defaults, quietHoursEnabled: true, quietHoursStart: 1410, quietHoursEnd: 0 };
    const screen = await render(<StreakNotificationPreferences preferences={prefs} onChange={change} />);
    expect(screen.getByText('23:30')).toBeTruthy();
    expect(screen.getByText('00:00')).toBeTruthy();
    // Start +30 would equal the end, so it advances to 00:30 instead.
    await fireEvent.press(screen.getAllByRole('button')[1]);
    expect(change).toHaveBeenCalledWith({ ...prefs, quietHoursStart: 30 });
    expect(formatQuietTime(480)).toBe('08:00');
    expect(formatQuietTime(1439)).toBe('23:59');
  });

  it('does not offer controls the old server cannot persist', async () => {
    const screen = await render(<StreakNotificationPreferences preferences={{ ...defaults, retentionAvailable: false }} onChange={jest.fn()} />);
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('applies a server recommendation only after an explicit press', async () => {
    const change = jest.fn();
    const preferences: NotificationPreferences = { ...defaults, quietHoursEnabled: false, matchStart: false, streakRisk: false,
      recommendation: { source: 'activity', sampleSize: 12, quietHoursStart: 1380, quietHoursEnd: 540,
        categories: ['matchStart', 'streakRisk'], generatedAt: '2026-09-04T08:00:00Z' } };
    const screen = await render(<StreakNotificationPreferences preferences={preferences} onChange={change} />);
    expect(change).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'APPLIQUER LES CONSEILS' }));
    expect(change).toHaveBeenCalledWith(applyNotificationRecommendation(preferences));
  });
});
