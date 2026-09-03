import { act, render } from '@testing-library/react-native';
import { useEffect } from 'react';
import { AppState, Text, type AppStateStatus } from 'react-native';

import { OTHER_OWNER, OWNER, OPERATION, receipt, state } from '../__fixtures__/streak';
import { CallStreakProvider } from '../CallStreakProvider';
import { useCallStreak } from '../context';
import { notifyCallStreakChanged } from '../events';
import type { CallStreakState } from '../types';

const mockLoad = jest.fn();
const mockPurchase = jest.fn();
const mockSelect = jest.fn();
const mockRefreshEconomy = jest.fn().mockResolvedValue(undefined);
const mockConfirm = jest.fn();
const mockShow = jest.fn().mockReturnValue('streak-snackbar');
const mockDismiss = jest.fn();
let mockAuth = { status: 'ready', session: { user: { id: OWNER, is_anonymous: false } } };
jest.mock('../api', () => ({
  loadCallStreak: (...args: unknown[]) => mockLoad(...args),
  purchaseStreakProtector: (...args: unknown[]) => mockPurchase(...args),
  selectStreakMilestone: (...args: unknown[]) => mockSelect(...args),
}));
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => mockAuth }));
jest.mock('@/src/providers/EconomyProvider', () => ({ useEconomy: () => ({ refresh: mockRefreshEconomy, setConfirmedVolts: mockConfirm }) }));
jest.mock('@/src/providers/SnackbarProvider', () => ({ useSnackbar: () => ({ showSnackbar: mockShow, dismissSnackbar: mockDismiss }) }));

let context: ReturnType<typeof useCallStreak>;
function Probe() {
  const value = useCallStreak();
  useEffect(() => { context = value; }, [value]);
  return <Text>{value.state?.userId ?? 'no-account-state'}</Text>;
}
const tree = () => <CallStreakProvider><Probe /></CallStreakProvider>;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }

describe('CallStreakProvider', () => {
  let changeState: (state: AppStateStatus) => void;
  const initialAppState = AppState.currentState;
  beforeEach(() => {
    jest.useFakeTimers(); jest.clearAllMocks();
    mockAuth = { status: 'ready', session: { user: { id: OWNER, is_anonymous: false } } };
    mockLoad.mockResolvedValue(state);
    mockPurchase.mockResolvedValue(receipt);
    mockSelect.mockResolvedValue(state);
    AppState.currentState = 'active';
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
      changeState = (next) => { AppState.currentState = next; listener(next); };
      return { remove: jest.fn() };
    });
  });
  afterEach(() => { jest.restoreAllMocks(); AppState.currentState = initialAppState; jest.useRealTimers(); });

  it('loads once, deduplicates reads, and never credits a login bonus or an invented call', async () => {
    await render(tree());
    expect(context.state).toMatchObject({ current: 6, volts: 310 });
    expect(mockLoad).toHaveBeenCalledTimes(1);
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
    const pending = deferred<CallStreakState>();
    mockLoad.mockReturnValue(pending.promise);
    await act(async () => { void context.refresh(); void context.refresh(); });
    expect(mockLoad).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(state));
  });

  it.each(['anonymous', 'loading'])('does not enroll an %s session', async (condition) => {
    if (condition === 'anonymous') mockAuth.session.user.is_anonymous = true;
    else mockAuth.status = 'loading';
    await render(tree());
    expect(mockLoad).not.toHaveBeenCalled();
    expect(context.state).toBeNull();
  });

  it('drops late reads and receipts from a different account', async () => {
    const oldRead = deferred<CallStreakState>();
    mockLoad.mockReturnValueOnce(oldRead.promise);
    const screen = await render(tree());
    mockAuth.session.user = { id: OTHER_OWNER, is_anonymous: false };
    mockLoad.mockResolvedValue({ ...state, userId: OTHER_OWNER, current: 0 });
    await screen.rerender(tree());
    await act(async () => oldRead.resolve(state));
    expect(context.state?.userId).toBe(OTHER_OWNER);
    expect(context.state?.current).toBe(0);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('ignores an old read arriving after a purchase and updates the wallet from the receipt only', async () => {
    await render(tree());
    const oldRead = deferred<CallStreakState>();
    mockLoad.mockReturnValueOnce(oldRead.promise);
    await act(async () => { void context.refresh(true); });
    await act(async () => { await context.purchase(OPERATION); });
    await act(async () => oldRead.resolve(state));
    expect(context.state).toMatchObject({ volts: 220, protectors: 2 });
    expect(mockConfirm).toHaveBeenCalledWith(OWNER, 220);
    expect(mockRefreshEconomy).toHaveBeenCalledTimes(1);
  });

  it('does not apply a purchase to a new account if the user switches during the request', async () => {
    const screen = await render(tree());
    const purchase = deferred<typeof receipt>();
    mockPurchase.mockReturnValueOnce(purchase.promise);
    let result!: Promise<unknown>;
    await act(async () => { result = context.purchase(OPERATION).catch((error: unknown) => error); });
    mockAuth.session.user = { id: OTHER_OWNER, is_anonymous: false };
    mockLoad.mockResolvedValue({ ...state, userId: OTHER_OWNER, volts: 10 });
    await screen.rerender(tree());
    await act(async () => purchase.resolve(receipt));
    expect(await result).toMatchObject({ code: 'account_changed', definitive: false });
    expect(context.state?.volts).toBe(10);
    expect(mockConfirm).not.toHaveBeenCalled();
  });

  it('celebrates a newly earned milestone once, but not old milestones on login', async () => {
    mockLoad.mockResolvedValueOnce({ ...state, best: 6, totalValidatedDays: 6, selectedMilestone: null,
      milestones: [{ days: 3, earnedAt: state.serverNow }] });
    const screen = await render(tree());
    expect(mockShow).not.toHaveBeenCalled();
    mockLoad.mockResolvedValue({ ...state, current: 7, best: 7, totalValidatedDays: 7, todayValidated: true,
      serverNow: '2026-09-03T08:00:01Z', milestones: state.milestones.slice(0, 2), selectedMilestone: null });
    await act(async () => { notifyCallStreakChanged(); });
    expect(context.state?.current).toBe(7);
    expect(mockShow).toHaveBeenCalledWith(expect.objectContaining({ tone: 'success', duration: 4_500,
      message: 'Jalon atteint : 7 jours de calls !', action: expect.objectContaining({ label: 'PARTAGER' }) }));
    await act(async () => { notifyCallStreakChanged(); });
    expect(mockShow).toHaveBeenCalledTimes(1);
    await screen.unmount();
    expect(mockDismiss).toHaveBeenCalledWith('streak-snackbar');
  });

  it('refreshes at server midnight without polling in the background or incrementing locally', async () => {
    mockLoad.mockResolvedValueOnce({ ...state, dayEndsAt: '2026-09-03T08:00:02Z' });
    const screen = await render(tree());
    jest.setSystemTime(new Date('2099-01-01'));
    await act(async () => { await jest.advanceTimersByTimeAsync(2_000); });
    expect(mockLoad).toHaveBeenCalledTimes(2);
    expect(context.state?.current).toBe(6);
    await act(async () => changeState('background'));
    await act(async () => { await jest.advanceTimersByTimeAsync(86_400_000); });
    expect(mockLoad).toHaveBeenCalledTimes(2);
    await act(async () => changeState('active'));
    expect(mockLoad).toHaveBeenCalledTimes(3);
    await screen.unmount();
    await act(async () => { await jest.advanceTimersByTimeAsync(86_400_000); });
    expect(mockLoad).toHaveBeenCalledTimes(3);
  });

  it('exposes a recoverable error and no estimated offline award', async () => {
    mockLoad.mockRejectedValueOnce(new Error('Offline'));
    await render(tree());
    expect(context).toMatchObject({ state: null, error: 'Offline', loading: false });
    expect(mockConfirm).not.toHaveBeenCalled();
    await act(async () => { await context.refresh(); });
    expect(context.state?.current).toBe(6);
    expect(context.error).toBeNull();
  });
});
