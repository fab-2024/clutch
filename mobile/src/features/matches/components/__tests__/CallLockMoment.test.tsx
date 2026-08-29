/// <reference types="jest" />

import { act, render } from '@testing-library/react-native';

import {
  CALL_LOCK_DURATION_MS,
  CALL_LOCK_MILESTONE_MS,
  CallLockMoment,
  REDUCED_CALL_LOCK_HOLD_MS,
} from '../CallLockMoment';

jest.mock('lucide-react-native/icons/lock', () => ({ __esModule: true, default: 'Lock' }));
jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: identity, out: () => identity },
    cancelAnimation: jest.fn(),
    interpolate: (value: number) => value,
    runOnJS: (callback: () => void) => callback,
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (value: number) => ({ value }),
    withSequence: (...values: number[]) => values.at(-1),
    withTiming: (value: number) => value,
  };
});

const baseProps = {
  accentA: '#69A7FF',
  accentB: '#FF5900',
  choice: 'a' as const,
  onComplete: jest.fn(),
  onLocked: jest.fn(),
  reduceMotion: false,
  tagA: 'G2',
  tagB: 'FNC',
  teamName: 'G2 Esports',
  visible: true,
};

describe('CallLockMoment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps the signature motion inside its 650–750 ms budget', () => {
    expect(CALL_LOCK_DURATION_MS).toBeGreaterThanOrEqual(650);
    expect(CALL_LOCK_DURATION_MS).toBeLessThanOrEqual(750);
    expect(CALL_LOCK_MILESTONE_MS).toBeLessThan(CALL_LOCK_DURATION_MS);
  });

  it('exposes the final Call Token as one accessible summary', async () => {
    const screen = await render(<CallLockMoment {...baseProps} fixedProgress={1} />);

    expect(screen.getByTestId('call-lock-moment').props.accessibilityRole).toBe('summary');
    expect(screen.getByLabelText('Call verrouillé pour G2 Esports. Ton choix est enregistré.')).toBeTruthy();
  });

  it('uses a static hold and fires the lock milestone once with reduced motion', async () => {
    jest.useFakeTimers();
    const onComplete = jest.fn();
    const onLocked = jest.fn();

    const screen = await render(
      <CallLockMoment
        {...baseProps}
        onComplete={onComplete}
        onLocked={onLocked}
        reduceMotion
      />,
    );

    expect(screen.getByText('CALL VERROUILLÉ', { includeHiddenElements: true })).toBeTruthy();
    expect(onLocked).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(REDUCED_CALL_LOCK_HOLD_MS));
    expect(onComplete).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
