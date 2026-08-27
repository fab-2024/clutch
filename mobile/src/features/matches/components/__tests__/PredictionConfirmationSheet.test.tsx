/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';

import { PredictionConfirmationSheet } from '../PredictionConfirmationSheet';

jest.mock('lucide-react-native/icons/lock', () => ({ __esModule: true, default: 'Lock' }));
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

const defaultProps = {
  gain: 19,
  loss: 23,
  onChangeChoice: jest.fn(),
  onClose: jest.fn(),
  onConfirm: jest.fn(),
  submitting: false,
  teamName: 'G2 Esports',
  teamTag: 'G2',
  visible: true,
};

describe('PredictionConfirmationSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('makes the selected team, rating impact and irreversibility explicit', async () => {
    const screen = await render(<PredictionConfirmationSheet {...defaultProps} />);

    expect(screen.getByRole('header')).toHaveTextContent('Verrouiller ce call ?');
    expect(screen.getByLabelText('Ton choix : G2 Esports, G2')).toBeTruthy();
    expect(screen.getByLabelText('Gain possible : 19 Frags')).toBeTruthy();
    expect(screen.getByLabelText('Perte possible : 23 Frags')).toBeTruthy();
    expect(screen.getByText(/Validation définitive/)).toBeTruthy();

    fireEvent.press(screen.getByTestId('prediction-lock-confirm'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('blocks dismissal and repeated actions while the call is being submitted', async () => {
    const screen = await render(<PredictionConfirmationSheet {...defaultProps} submitting />);
    const close = screen.getByRole('button', { name: 'Fermer Verrouiller ce call ?' });

    expect(close.props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByTestId('prediction-lock-confirm').props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });

    fireEvent.press(close);
    fireEvent.press(screen.getByTestId('prediction-change-choice'));
    fireEvent.press(screen.getByTestId('prediction-lock-confirm'));

    expect(defaultProps.onClose).not.toHaveBeenCalled();
    expect(defaultProps.onChangeChoice).not.toHaveBeenCalled();
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('announces a submission failure without discarding the review context', async () => {
    const screen = await render(
      <PredictionConfirmationSheet {...defaultProps} error="Le marché vient de fermer." />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('CALL NON VERROUILLÉ');
    expect(screen.getByText('Le marché vient de fermer.')).toBeTruthy();
    expect(screen.getByTestId('prediction-confirmation-sheet')).toBeTruthy();
  });
});
