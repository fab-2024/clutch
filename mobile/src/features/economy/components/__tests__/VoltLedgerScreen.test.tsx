/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import type { VoltLedger, VoltMovement } from '../../types';
import VoltLedgerScreen from '../VoltLedgerScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('../../api', () => ({ loadVoltLedger: jest.fn() }));
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
  useEconomy: () => ({ refresh: jest.fn().mockResolvedValue(undefined) }),
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
