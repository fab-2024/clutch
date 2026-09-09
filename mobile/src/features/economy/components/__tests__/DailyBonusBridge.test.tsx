import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import type { DailyBonusReceipt, DailyBonusStatus } from '../../dailyBonus';
import DailyBonusBridge from '../DailyBonusBridge';

const mockClaim = jest.fn();
const mockStatus = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockConfirm = jest.fn();
const mockShow = jest.fn();
let mockAuth = { status: 'ready', session: { user: { id: 'player-a', is_anonymous: false } } };
jest.mock('../../api', () => ({ claimDailyVoltBonus: (...args: unknown[]) => mockClaim(...args), loadDailyVoltBonusStatus: (...args: unknown[]) => mockStatus(...args) }));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => mockAuth }));
jest.mock('@/src/providers/EconomyProvider', () => ({ useEconomy: () => ({ refresh: mockRefresh, setConfirmedVolts: mockConfirm }) }));
jest.mock('@/src/providers/SnackbarProvider', () => ({ useSnackbar: () => ({ showSnackbar: mockShow }) }));
jest.mock('../DailyBonusSheet', () => {
  const React = jest.requireActual('react');
  const { View, Text, Pressable } = jest.requireActual('react-native');
  return function MockDailyBonusSheet({ visible, pending, error, onClaim, onClose }: { visible: boolean; pending: boolean; error: string | null; onClaim: () => void; onClose: () => void }) { return visible ? React.createElement(View, { testID: 'daily-volt-bonus' },
    React.createElement(Pressable, { testID: 'claim', disabled: pending, onPress: onClaim }),
    React.createElement(Pressable, { testID: 'later', onPress: onClose }),
    error ? React.createElement(Text, null, error) : null) : null; };
});
const receipt: DailyBonusReceipt = {
  userId: 'player-a', awarded: true, amount: 10, balance: 310, movementId: 'bonus-1',
  rewardDay: '2026-09-03', timeZone: 'UTC', awardedAt: '2026-09-03T12:00:00Z',
  serverNow: '2026-09-03T12:00:00Z', nextAvailableAt: '2026-09-04T00:00:00Z',
};
const available: DailyBonusStatus = { ...receipt, available: true };

describe('DailyBonusBridge manual claim', () => {
  let changeState: (state: AppStateStatus) => void;
  const initialState = AppState.currentState;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockAuth = { status: 'ready', session: { user: { id: 'player-a', is_anonymous: false } } };
    mockStatus.mockResolvedValue(available);
    mockClaim.mockResolvedValue(receipt);
    AppState.currentState = 'active';
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      changeState = listener;
      return { remove: jest.fn() };
    });
  });
  afterEach(() => { jest.restoreAllMocks(); AppState.currentState = initialState; jest.useRealTimers(); });

  it('checks availability without awarding and credits only after pressing claim', async () => {
    const screen = await render(<DailyBonusBridge />);
    expect(screen.getByTestId('daily-volt-bonus')).toBeTruthy();
    expect(mockClaim).not.toHaveBeenCalled();
    expect(mockConfirm).not.toHaveBeenCalled();
    mockStatus.mockResolvedValue({ ...available, available: false });
    await fireEvent.press(screen.getByTestId('claim'));
    expect(mockClaim).toHaveBeenCalledTimes(1);
    expect(mockConfirm).toHaveBeenCalledWith('player-a', 310);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('daily-volt-bonus')).toBeNull();
  });

  it('lets players postpone without claiming and offers again on foreground', async () => {
    const screen = await render(<DailyBonusBridge />);
    await fireEvent.press(screen.getByTestId('later'));
    expect(screen.queryByTestId('daily-volt-bonus')).toBeNull();
    expect(mockClaim).not.toHaveBeenCalled();
    await act(async () => { changeState('background'); changeState('active'); });
    expect(screen.getByTestId('daily-volt-bonus')).toBeTruthy();
  });

  it('does not show a reward already claimed on another device', async () => {
    mockStatus.mockResolvedValue({ ...available, available: false });
    const screen = await render(<DailyBonusBridge />);
    expect(screen.queryByTestId('daily-volt-bonus')).toBeNull();
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('blocks repeated taps and allows retry after an error', async () => {
    let reject!: (error: Error) => void;
    mockClaim.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    const screen = await render(<DailyBonusBridge />);
    await fireEvent.press(screen.getByTestId('claim'));
    await fireEvent.press(screen.getByTestId('claim'));
    expect(mockClaim).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error('offline')));
    expect(screen.getByText('Impossible de récupérer tes Volts. Réessaie.')).toBeTruthy();
    mockStatus.mockResolvedValue({ ...available, available: false });
    await fireEvent.press(screen.getByTestId('claim'));
    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it.each(['loading', 'anonymous'])('does not query or claim for an %s session', async (state) => {
    if (state === 'anonymous') mockAuth.session.user.is_anonymous = true;
    else mockAuth.status = 'loading';
    await render(<DailyBonusBridge />);
    expect(mockStatus).not.toHaveBeenCalled();
    expect(mockClaim).not.toHaveBeenCalled();
  });

  it('discards an old account’s late claim after switching users', async () => {
    let resolveOld!: (value: DailyBonusReceipt) => void;
    mockClaim.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
    const screen = await render(<DailyBonusBridge />);
    await fireEvent.press(screen.getByTestId('claim'));
    mockAuth = { status: 'ready', session: { user: { id: 'player-b', is_anonymous: false } } };
    mockStatus.mockResolvedValue({ ...available, userId: 'player-b' });
    await screen.rerender(<DailyBonusBridge />);
    await act(async () => resolveOld(receipt));
    await waitFor(() => expect(mockStatus).toHaveBeenCalledWith('player-b', expect.any(String)));
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
  });
});
