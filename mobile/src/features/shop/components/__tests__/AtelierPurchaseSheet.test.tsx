/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { atelierProductById } from '../../atelierCatalog';
import { AtelierPurchaseSheet } from '../AtelierPurchaseSheet';

jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: identity, out: () => identity, quad: identity },
    runOnJS: (callback: () => void) => callback,
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withTiming: (value: number, _config: object, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return value;
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

const product = atelierProductById('material_steel');

if (!product) throw new Error('Missing Atelier fixture');

const defaultProps = {
  balance: 1280,
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  pending: false,
  price: 120,
  product,
  visible: true,
};

describe('AtelierPurchaseSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('states the item, debit and resulting balance before confirmation', async () => {
    const screen = await render(<AtelierPurchaseSheet {...defaultProps} />);

    expect(screen.getByRole('header')).toHaveTextContent('Débloquer Acier brossé ?');
    expect(screen.getByLabelText(
      'Achat de Acier brossé pour 120 Volts. Ton solde passera de 1 280 à 1 160 Volts.',
    )).toBeTruthy();
    expect(screen.getByText(/cosmétique uniquement/)).toBeTruthy();

    fireEvent.press(screen.getByTestId('atelier-purchase-confirm'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('locks confirmation and dismissal while the acquisition is pending', async () => {
    const screen = await render(<AtelierPurchaseSheet {...defaultProps} pending />);
    const close = screen.getByRole('button', { name: 'Fermer Débloquer Acier brossé ?' });

    expect(close.props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByTestId('atelier-purchase-confirm').props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });

    fireEvent.press(close);
    fireEvent.press(screen.getByTestId('atelier-purchase-cancel'));
    fireEvent.press(screen.getByTestId('atelier-purchase-confirm'));

    expect(defaultProps.onClose).not.toHaveBeenCalled();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('keeps the purchase context visible when a transaction fails', async () => {
    const screen = await render(
      <AtelierPurchaseSheet {...defaultProps} error="Ton solde vient de changer." />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('ACQUISITION NON FINALISÉE')).toBeTruthy();
    expect(screen.getByText('Ton solde vient de changer.')).toBeTruthy();
    expect(screen.getByTestId('atelier-purchase-sheet')).toBeTruthy();
  });
});
