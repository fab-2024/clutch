import { fireEvent, render, waitFor } from '@testing-library/react-native';

import VisualConsumablesScreen, { PREVIEW_VISUAL_CONSUMABLES } from '../components/VisualConsumablesScreen';

const mockSetConfirmedVolts = jest.fn();

jest.mock('expo-linear-gradient', () => ({ LinearGradient: jest.requireActual('react-native').View }));
jest.mock('expo-router', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
    useFocusEffect: (effect: () => void | (() => void)) => React.useEffect(effect, [effect]),
  };
});
jest.mock('@/src/components/layout/Screen', () => ({ Screen: jest.requireActual('react-native').View }));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: identity, out: () => identity, quad: identity },
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number) => value,
  };
});
jest.mock('@/src/providers/AuthProvider', () => ({ useAuth: () => ({ session: null }) }));
jest.mock('@/src/providers/EconomyProvider', () => ({
  useEconomy: () => ({ setConfirmedVolts: mockSetConfirmedVolts }),
}));
jest.mock('../api', () => ({ loadVisualConsumables: jest.fn(), runConsumableOperation: jest.fn() }));
jest.mock('lucide-react-native/icons/arrow-left', () => ({ __esModule: true, default: 'ArrowLeft' }));
jest.mock('lucide-react-native/icons/activity', () => ({ __esModule: true, default: 'Activity' }));
jest.mock('lucide-react-native/icons/sparkles', () => ({ __esModule: true, default: 'Sparkles' }));

describe('P3 visual consumables screen', () => {
  beforeEach(() => mockSetConfirmedVolts.mockClear());

  it('keeps purchase and activation behind separate explicit confirmations', async () => {
    const preview = {
      ...PREVIEW_VISUAL_CONSUMABLES,
      items: PREVIEW_VISUAL_CONSUMABLES.items.map((item) => ({ ...item, activeUntil: null })),
    };
    const screen = await render(<VisualConsumablesScreen previewState={preview} />);

    await waitFor(() => expect(screen.getByText('320 VOLTS')).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'ACHETER · 60 VOLTS' }));
    expect(screen.getByTestId('consumable-confirmation')).toBeTruthy();
    expect(screen.queryByText('260 VOLTS')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'CONFIRMER · 60 VOLTS' }));
    await waitFor(() => expect(screen.getByText('260 VOLTS')).toBeTruthy());
    expect(screen.getAllByText('2/3 EN STOCK')).toHaveLength(2);

    await fireEvent.press(screen.getAllByRole('button', { name: 'ACTIVER 24 H' })[0]);
    expect(screen.getByText('Activer ÉCLAT DE VITRINE maintenant ?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'CONFIRMER L’ACTIVATION' }));

    await waitFor(() => expect(screen.getByText('1/3 EN STOCK')).toBeTruthy());
    expect(screen.getByText(/ACTIF · ENCORE 24 H/)).toBeTruthy();
    expect(screen.getByText('Activation · ÉCLAT DE VITRINE')).toBeTruthy();
    expect(mockSetConfirmedVolts).not.toHaveBeenCalled();
  });
});
