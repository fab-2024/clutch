import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import { state } from '../__fixtures__/streak';
import CallStreakCard, { ProtectorShopCard, StreakShowcaseBadge } from '../components/CallStreakCard';
import type { CallStreakState } from '../types';

let mockState: CallStreakState | null = state;
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../context', () => ({
  monotonicNow: () => 0,
  useCallStreak: () => ({ state: mockState, error: null, receivedAt: 0 }),
}));

describe('shared streak entry points', () => {
  beforeEach(() => { jest.clearAllMocks(); mockState = { ...state, selectedMilestone: null }; });

  it('waits for confirmed state instead of inventing a streak or welcome stock', async () => {
    mockState = null;
    const card = await render(<CallStreakCard />);
    const showcase = await render(<StreakShowcaseBadge />);
    expect(card.queryByTestId('call-streak-card')).toBeNull();
    expect(showcase.queryByTestId('showcase-streak-badge')).toBeNull();
  });

  it('shows current and best streaks and opens the real detail screen', async () => {
    const screen = await render(<CallStreakCard />);
    expect(screen.getByText(`${state.current} JOURS`)).toBeTruthy();
    expect(screen.getByText(`MEILLEURE SÉRIE · ${state.best}`)).toBeTruthy();
    expect(screen.getByText(`${state.protectors}/${state.maxProtectors}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Voir ma série et mes protecteurs' }));
    expect(router.push).toHaveBeenCalledWith('/streak');
  });

  it('keeps the Hub preview in its local-only detail flow', async () => {
    mockState = null;
    const screen = await render(<CallStreakCard previewState={state} />);
    await fireEvent.press(screen.getByTestId('call-streak-card'));
    expect(router.push).toHaveBeenCalledWith('/streak-preview');
  });

  it('keeps the showcase record visible before and after milestone selection', async () => {
    const screen = await render(<StreakShowcaseBadge />);
    expect(screen.getByText('TA SÉRIE DE CALLS')).toBeTruthy();
    expect(screen.getByText(`${state.current} J · MEILLEURE SÉRIE ${state.best}`)).toBeTruthy();
    mockState = { ...state, selectedMilestone: 7 };
    await screen.rerender(<StreakShowcaseBadge />);
    expect(screen.getByText('7 JOURS · ÉQUIPÉ')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('showcase-streak-badge'));
    expect(router.push).toHaveBeenCalledWith('/streak');
  });

  it('shows the explicit consumable price and separates shop preview navigation', async () => {
    const screen = await render(<ProtectorShopCard />);
    expect(screen.getByText('OBTENIR · 90 VOLTS')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('shop-streak-protector'));
    expect(router.push).toHaveBeenLastCalledWith('/streak');
    await screen.rerender(<ProtectorShopCard preview />);
    await fireEvent.press(screen.getByTestId('shop-streak-protector'));
    expect(router.push).toHaveBeenLastCalledWith('/streak-preview');
  });
});
