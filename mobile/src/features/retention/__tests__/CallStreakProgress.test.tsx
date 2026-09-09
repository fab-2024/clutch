import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import CompactCallStreakCard from '../components/CompactCallStreakCard';
import { CallStreakProgress } from '../components/CallStreakProgress';
import { CallStreakRewards } from '../components/CallStreakRewards';
import { PREVIEW_STREAK_FIVE } from '../preview';
import { nextStreakTarget } from '../presentation';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../context', () => ({ monotonicNow: () => 0, useCallStreak: () => ({ state: null, error: null, receivedAt: 0 }) }));
jest.mock('lucide-react-native/icons/check', () => ({ __esModule: true, default: 'Check' }));
jest.mock('lucide-react-native/icons/gift', () => ({ __esModule: true, default: 'Gift' }));
jest.mock('lucide-react-native/icons/lock', () => ({ __esModule: true, default: 'Lock' }));
jest.mock('lucide-react-native/icons/trophy', () => ({ __esModule: true, default: 'Trophy' }));
jest.mock('lucide-react-native/icons/chevron-right', () => ({ __esModule: true, default: 'ChevronRight' }));
jest.mock('lucide-react-native/icons/flame', () => ({ __esModule: true, default: 'Flame' }));
jest.mock('lucide-react-native/icons/shield-check', () => ({ __esModule: true, default: 'ShieldCheck' }));

describe('streak milestone presentation', () => {
  it('shows the next real reward and keeps the Hub preview navigation local', async () => {
    const screen = await render(<CompactCallStreakCard previewState={PREVIEW_STREAK_FIVE} />);
    expect(screen.getByText('50 Volts')).toBeTruthy();
    expect(screen.getByText('Encore 2 jours')).toBeTruthy();
    expect(screen.getByLabelText('Jour 6 : À valider')).toBeTruthy();
    expect(screen.queryByLabelText('Jour 6 : Call validé')).toBeNull();
    await fireEvent.press(screen.getByTestId('call-streak-card'));
    expect(router.push).toHaveBeenCalledWith('/streak-preview');
  });

  it('moves today from pending to validated without awarding an extra day', async () => {
    const screen = await render(<CallStreakProgress state={PREVIEW_STREAK_FIVE} />);
    await screen.rerender(<CallStreakProgress state={{ ...PREVIEW_STREAK_FIVE, current: 6, todayValidated: true }} />);
    expect(screen.getByLabelText('Jour 6 : Call validé')).toBeTruthy();
    expect(screen.getByLabelText('Jour 7 : À venir')).toBeTruthy();
  });

  it('does not infer a paid reward from an old badge or a restarted streak', async () => {
    const legacy = { ...PREVIEW_STREAK_FIVE, rewards: undefined };
    const screen = await render(<CallStreakRewards state={legacy} />);
    expect(screen.queryByText('50 Volts')).toBeNull();
    const paid = { ...PREVIEW_STREAK_FIVE, current: 0, rewards: PREVIEW_STREAK_FIVE.rewards?.map((reward) => ({ ...reward, rewardedAt: '2026-09-07T12:00:00Z' })) };
    await screen.rerender(<CallStreakRewards state={paid} />);
    expect(screen.getAllByText('Crédité')).toHaveLength(2);
    expect(nextStreakTarget(paid).volts).toBeNull();
  });

  it('keeps the seven-day strip readable for a long streak', async () => {
    const screen = await render(<CallStreakProgress state={{ ...PREVIEW_STREAK_FIVE, current: 128, todayValidated: false }} />);
    expect(screen.getByLabelText('Jour 129 : À valider')).toBeTruthy();
    expect(screen.getByLabelText('Jour 133 : À venir')).toBeTruthy();
  });
});
