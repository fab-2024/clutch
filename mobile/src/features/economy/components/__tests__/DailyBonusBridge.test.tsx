import { act, render } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import type { DailyBonusReceipt } from '../../dailyBonus';
import DailyBonusBridge from '../DailyBonusBridge';

const mockClaim = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockConfirm = jest.fn();
const mockShow = jest.fn().mockReturnValue('snackbar-bonus');
const mockDismiss = jest.fn();
let mockAuth = { status: 'ready', session: { user: { id: 'player-a', is_anonymous: false } } };
jest.mock('../../api', () => ({ claimDailyVoltBonus: (...args: unknown[]) => mockClaim(...args) }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => mockAuth }));
jest.mock('@/src/providers/EconomyProvider', () => ({
  useEconomy: () => ({ refresh: mockRefresh, setConfirmedVolts: mockConfirm }),
}));
jest.mock('@/src/providers/SnackbarProvider', () => ({
  useSnackbar: () => ({ showSnackbar: mockShow, dismissSnackbar: mockDismiss }),
}));

const receipt: DailyBonusReceipt = {
  userId: 'player-a', awarded: true, amount: 10, balance: 310, movementId: 'bonus-1',
  rewardDay: '2026-09-03', timeZone: 'UTC', awardedAt: '2026-09-03T12:00:00Z',
  serverNow: '2026-09-03T12:00:00Z', nextAvailableAt: '2026-09-04T00:00:00Z',
};

describe('DailyBonusBridge', () => {
  let changeState: (state: AppStateStatus) => void;
  const remove = jest.fn();
  const initialState = AppState.currentState;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockAuth = { status: 'ready', session: { user: { id: 'player-a', is_anonymous: false } } };
    mockClaim.mockResolvedValue(receipt);
    AppState.currentState = 'active';
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      changeState = listener;
      return { remove };
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    AppState.currentState = initialState;
    jest.useRealTimers();
  });

  it('updates the wallet and shows one dismissible message only for a new award', async () => {
    const screen = await render(<DailyBonusBridge />);
    expect(mockConfirm).toHaveBeenCalledWith('player-a', 310);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith({
      message: 'Bonus quotidien : +10 Volts', tone: 'success', duration: 4_500, testID: 'daily-volt-bonus',
    });
    mockClaim.mockResolvedValue({ ...receipt, awarded: false, amount: 0 });
    await act(async () => { changeState('background'); changeState('active'); });
    expect(mockConfirm).toHaveBeenCalledTimes(2);
    expect(mockShow).toHaveBeenCalledTimes(1);
    await screen.unmount();
    expect(remove).toHaveBeenCalledTimes(1);
    expect(mockDismiss).toHaveBeenCalledWith('snackbar-bonus');
    await act(async () => { await jest.advanceTimersByTimeAsync(86_400_000); });
    expect(mockClaim).toHaveBeenCalledTimes(2);
  });

  it.each(['loading', 'anonymous'])('does not claim for an %s session', async (state) => {
    if (state === 'anonymous') mockAuth.session.user.is_anonymous = true;
    else mockAuth.status = 'loading';
    await render(<DailyBonusBridge />);
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('discards an old account’s late response after switching users', async () => {
    let resolveOld!: (value: DailyBonusReceipt) => void;
    mockClaim.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const screen = await render(<DailyBonusBridge />);
    mockAuth = { status: 'ready', session: { user: { id: 'player-b', is_anonymous: false } } };
    mockClaim.mockResolvedValue({ ...receipt, userId: 'player-b', balance: 10 });
    await screen.rerender(<DailyBonusBridge />);
    await act(async () => resolveOld(receipt));
    expect(mockConfirm).toHaveBeenCalledTimes(1);
    expect(mockConfirm).toHaveBeenCalledWith('player-b', 10);
    expect(mockShow).toHaveBeenCalledTimes(1);
  });
});
