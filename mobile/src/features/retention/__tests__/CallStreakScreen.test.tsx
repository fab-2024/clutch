import { act, fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { OPERATION, OTHER_OPERATION, receipt, state } from '../__fixtures__/streak';
import CallStreakScreen from '../components/CallStreakScreen';
import { CallStreakError } from '../model';

const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockPurchase = jest.fn();
const mockSelect = jest.fn().mockResolvedValue(undefined);
const mockShow = jest.fn();
const mockLoadPending = jest.fn();
const mockRemember = jest.fn();
const mockForget = jest.fn();
const mockPrepareShare = jest.fn();
const mockShareLink = jest.fn();
let mockState = state;
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/src/components/layout/Screen', () => ({ Screen: jest.requireActual('react-native').View }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true, default: { View: jest.requireActual('react-native').View },
  Easing: { out: jest.fn(), quad: jest.fn(), cubic: jest.fn() },
  useAnimatedStyle: (factory: () => object) => factory(), useReducedMotion: () => true,
  useSharedValue: (value: number) => ({ value }), withTiming: (value: number) => value,
}));
jest.mock('@/src/components/overlays/BaseSheet', () => ({ BaseSheet: ({ visible, children, footer }: { visible: boolean; children: ReactNode; footer: ReactNode }) => {
  const React = jest.requireActual('react');
  return visible ? React.createElement(jest.requireActual('react-native').View, { testID: 'confirmation-sheet' }, children, footer) : null;
} }));
jest.mock('@/src/providers/SnackbarProvider', () => ({ useSnackbar: () => ({ showSnackbar: mockShow }) }));
jest.mock('@/src/features/profile/showcaseSocial/api', () => ({ prepareMilestoneShare: (...args: unknown[]) => mockPrepareShare(...args) }));
jest.mock('@/src/lib/share', () => ({ sharePublicLink: (...args: unknown[]) => mockShareLink(...args) }));
jest.mock('@/src/config/release', () => ({ publicAppUrl: (path: string) => `https://clutch.example${path}` }));
jest.mock('../context', () => ({ monotonicNow: () => 0, useCallStreak: () => ({
  state: mockState, loading: false, error: null, receivedAt: 0, refresh: mockRefresh,
  purchase: mockPurchase, selectMilestone: mockSelect,
}) }));
jest.mock('../purchaseOperation', () => ({
  loadPendingProtectorPurchase: (...args: unknown[]) => mockLoadPending(...args),
  rememberProtectorPurchase: (...args: unknown[]) => mockRemember(...args),
  forgetProtectorPurchase: (...args: unknown[]) => mockForget(...args),
}));
jest.mock('lucide-react-native/icons/arrow-left', () => ({ __esModule: true, default: 'ArrowLeft' }));
jest.mock('lucide-react-native/icons/check', () => ({ __esModule: true, default: 'Check' }));
jest.mock('lucide-react-native/icons/flame', () => ({ __esModule: true, default: 'Flame' }));
jest.mock('lucide-react-native/icons/shield-check', () => ({ __esModule: true, default: 'ShieldCheck' }));
jest.mock('lucide-react-native/icons/chevron-right', () => ({ __esModule: true, default: 'ChevronRight' }));

describe('protector purchase interaction', () => {
  beforeEach(() => {
    jest.clearAllMocks(); mockState = state;
    mockLoadPending.mockResolvedValue(null);
    mockRemember.mockResolvedValue(undefined);
    mockForget.mockResolvedValue(undefined);
    mockPurchase.mockResolvedValue(receipt);
    mockPrepareShare.mockResolvedValue({ pseudo: 'Nova', milestone: 7, earnedAt: '2026-09-03T09:00:00Z' });
    mockShareLink.mockResolvedValue('shared');
  });

  it('shows a clear price, confirms, persists the operation, then debits once', async () => {
    const screen = await render(<CallStreakScreen />);
    await fireEvent.press(screen.getByTestId('streak-buy-protector'));
    expect(screen.getByTestId('confirmation-sheet')).toBeTruthy();
    expect(screen.getByText('Solde : 310 → 220 Volts')).toBeTruthy();
    expect(mockPurchase).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('streak-confirm-protector'));
    expect(mockPurchase).toHaveBeenCalledTimes(1);
    expect(mockPurchase).toHaveBeenCalledWith(OPERATION);
    expect(mockRemember.mock.invocationCallOrder[0]).toBeLessThan(mockPurchase.mock.invocationCallOrder[0]);
    expect(mockForget).toHaveBeenCalledWith(state.userId, OPERATION);
    expect(screen.queryByTestId('confirmation-sheet')).toBeNull();
    expect(mockShow).toHaveBeenCalledWith({ message: 'Protecteur ajouté à ton stock.', tone: 'success' });
  });

  it('never debits on cancel, full stock or insufficient balance', async () => {
    const screen = await render(<CallStreakScreen />);
    await fireEvent.press(screen.getByTestId('streak-buy-protector'));
    await fireEvent.press(screen.getByRole('button', { name: 'ANNULER' }));
    expect(mockPurchase).not.toHaveBeenCalled();
    mockState = { ...state, protectors: 2 };
    await screen.rerender(<CallStreakScreen />);
    expect(screen.getByTestId('streak-buy-protector')).toBeDisabled();
    mockState = { ...state, volts: 89 };
    await screen.rerender(<CallStreakScreen />);
    expect(screen.getByTestId('streak-buy-protector')).toBeDisabled();
  });

  it('blocks double taps while the server purchase is unresolved', async () => {
    let resolve!: (value: typeof receipt) => void;
    mockPurchase.mockReturnValue(new Promise((done) => { resolve = done; }));
    const screen = await render(<CallStreakScreen />);
    await fireEvent.press(screen.getByTestId('streak-buy-protector'));
    await fireEvent.press(screen.getByTestId('streak-confirm-protector'));
    expect(screen.getByTestId('streak-confirm-protector')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('streak-confirm-protector'));
    expect(mockPurchase).toHaveBeenCalledTimes(1);
    await act(async () => resolve(receipt));
  });

  it('retains an uncertain operation across remounts and replays it despite full stock', async () => {
    mockPurchase.mockRejectedValueOnce(new CallStreakError('network'));
    const first = await render(<CallStreakScreen />);
    await fireEvent.press(first.getByTestId('streak-buy-protector'));
    await fireEvent.press(first.getByTestId('streak-confirm-protector'));
    expect(mockForget).not.toHaveBeenCalled();
    await first.unmount();
    mockState = { ...state, protectors: 2, volts: 0, purchaseOperationId: OTHER_OPERATION };
    mockLoadPending.mockResolvedValue(OPERATION);
    mockPurchase.mockResolvedValue({ ...receipt, purchased: false });
    const second = await render(<CallStreakScreen />);
    expect(second.getByTestId('streak-buy-protector')).not.toBeDisabled();
    await fireEvent.press(second.getByTestId('streak-buy-protector'));
    await fireEvent.press(second.getByTestId('streak-confirm-protector'));
    expect(mockPurchase).toHaveBeenNthCalledWith(2, OPERATION);
    expect(mockShow).toHaveBeenCalledWith(expect.objectContaining({ message: 'Ton achat précédent est confirmé. Aucun nouveau débit.' }));
  });

  it('does not debit when durable storage is unavailable, and can retry its initial read', async () => {
    mockLoadPending.mockRejectedValueOnce(new Error('storage unavailable'));
    const screen = await render(<CallStreakScreen />);
    expect(screen.getByTestId('streak-buy-protector')).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'RÉESSAYER' }));
    expect(screen.getByTestId('streak-buy-protector')).not.toBeDisabled();
    mockRemember.mockRejectedValueOnce(new Error('storage full'));
    await fireEvent.press(screen.getByTestId('streak-buy-protector'));
    await fireEvent.press(screen.getByTestId('streak-confirm-protector'));
    expect(mockPurchase).not.toHaveBeenCalled();
  });

  it('only exposes earned milestones and selects them through the server', async () => {
    const screen = await render(<CallStreakScreen />);
    expect(screen.getByRole('button', { name: 'Choisir le jalon 30 jours' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Choisir le jalon 7 jours' }));
    expect(mockSelect).toHaveBeenCalledWith(7);
  });

  it('shares an earned, server-verified milestone link and preserves a selectable fallback', async () => {
    mockState = { ...state, selectedMilestone: 7 };
    const screen = await render(<CallStreakScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'PARTAGER' }));
    expect(mockPrepareShare).toHaveBeenCalledWith(7, state.userId);
    expect(mockShareLink).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'https://clutch.example/s/Nova/7');
    expect(screen.getByText('https://clutch.example/s/Nova/7')).toBeTruthy();
  });

  it('never fabricates a public milestone when verification fails', async () => {
    mockState = { ...state, selectedMilestone: 7 };
    mockPrepareShare.mockRejectedValue(new Error('hidden'));
    const screen = await render(<CallStreakScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'PARTAGER' }));
    expect(mockShareLink).not.toHaveBeenCalled();
  });
});
