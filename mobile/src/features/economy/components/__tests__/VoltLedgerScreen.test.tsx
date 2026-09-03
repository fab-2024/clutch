/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import type { VoltLedger, VoltMovement } from '../../types';
import VoltLedgerScreen from '../VoltLedgerScreen';

const mockRefreshEconomy = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('../../api', () => ({ loadVoltLedger: jest.fn() }));
// Native artwork is checked in the browser preview. Keep these tests focused
// on ledger content and virtualization, without loading the full SVG renderer.
jest.mock('@/src/components/layout/Screen', () => ({ Screen: jest.requireActual('react-native').View }));
jest.mock('@/src/components/ui/CurrencyIcon', () => ({ CurrencyIcon: jest.requireActual('react-native').View }));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    cancelAnimation: jest.fn(),
    Easing: { inOut: () => identity, quad: identity },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withRepeat: (value: number) => value,
    withTiming: (value: number) => value,
  };
});
jest.mock('react-native-safe-area-context', () => {
  const ReactNative = jest.requireActual('react-native');
  return { SafeAreaView: ReactNative.View };
});
jest.mock('@/src/providers/EconomyProvider', () => ({
  useEconomy: () => ({ refresh: mockRefreshEconomy, volts: null }),
}));

const MOVEMENT_SOURCES: VoltMovement['source'][] = [
  'onboarding',
  'progression',
  'mission',
  'activation',
  'exceptionnelle',
  'achat_cosmetique',
  'ajustement',
];

describe('VoltLedgerScreen', () => {
  // FlatList lazily loads native modules on its first render. Allow the cold
  // transform on CI without relaxing the timeout of the remaining tests.
  it('shows the daily reward as a dated credit with the confirmed running balance', async () => {
    const ledger = makeLedger(1);
    ledger.balance = 310;
    ledger.hasMore = false;
    ledger.movements[0] = {
      ...ledger.movements[0], amount: 10, source: 'bonus_quotidien', origin: 'bonus_quotidien',
      reference: '2026-09-03', idempotencyKey: 'bonus_quotidien:2026-09-03',
      createdAt: '2026-09-03T12:00:00Z', balanceAfter: 310,
    };
    const screen = await render(<VoltLedgerScreen previewData={ledger} />);
    expect(screen.getByText('Bonus quotidien')).toBeTruthy();
    expect(screen.getByText('Première connexion de la journée')).toBeTruthy();
    expect(screen.getByText('SOLDE 310')).toBeTruthy();
    expect(screen.getByText('+10')).toBeTruthy();
    expect(screen.getByLabelText('BONUS QUOTIDIEN, Bonus quotidien, plus 10 Volts, solde 310')).toBeTruthy();
  }, 15_000);

  it('keeps a long journal on a bounded virtualized list', async () => {
    const ledger = makeLedger(48);
    const screen = await render(<VoltLedgerScreen previewData={ledger} />);
    const list = screen.getByTestId('volt-ledger-list');

    expect(list.props.data).toHaveLength(48);
    expect(list.props.initialNumToRender).toBe(10);
    expect(list.props.maxToRenderPerBatch).toBe(10);
    expect(list.props.windowSize).toBe(7);
    expect(list.props.removeClippedSubviews).toBe(true);
    expect(screen.getByText('48 AFFICHÉS')).toBeTruthy();
  });
});

function makeLedger(size: number): VoltLedger {
  return {
    balance: 870,
    hasMore: true,
    integrity: { affectsRanking: false, convertsToFrags: false },
    movements: Array.from({ length: size }, (_, index) => ({
      id: `movement-${index}`,
      amount: index % 4 === 0 ? -120 : 80,
      source: MOVEMENT_SOURCES[index % MOVEMENT_SOURCES.length],
      origin: 'test',
      reference: `reference-${index}`,
      object: null,
      campaignKey: null,
      createdAt: new Date(Date.UTC(2026, 7, 24, 12, index)).toISOString(),
      idempotencyKey: `test:${index}`,
      balanceAfter: 870 + index,
    })),
  };
}
