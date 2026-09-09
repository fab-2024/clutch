import { act, fireEvent, render } from '@testing-library/react-native';
import { AccessibilityInfo, AppState, type AppStateStatus } from 'react-native';
import { cancelAnimation, withTiming } from 'react-native-reanimated';
import TitanWavePreview from '../TitanWavePreview';

let mockFinish: ((finished: boolean) => void) | undefined;
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: jest.requireActual('react-native').View },
  Easing: { linear: (value: number) => value },
  cancelAnimation: jest.fn(),
  runOnJS: (callback: unknown) => callback,
  useSharedValue: (value: number) => jest.requireActual('react').useState(() => ({ value }))[0],
  useAnimatedStyle: (factory: () => object) => factory(),
  withTiming: jest.fn((value: number, _options: unknown, finish: (done: boolean) => void) => { mockFinish = finish; return value; }),
}));

let appListener: (state: AppStateStatus) => void;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appListener = listener; return { remove: jest.fn() };
  });
});
afterEach(() => jest.restoreAllMocks());

async function mount(reduced = false) {
  const screen = await render(<TitanWavePreview reduceMotionOverride={reduced} />);
  await fireEvent(screen.getByTestId('titan-wave-preview', { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { width: 350, height: 230 } } });
  return screen;
}

it('autoplays once, ignores repeated taps and permits replay after completion', async () => {
  const screen = await mount();
  expect(withTiming).toHaveBeenCalledTimes(1);
  await fireEvent.press(screen.getByTestId('titan-wave-preview', { includeHiddenElements: true }));
  await fireEvent.press(screen.getByTestId('titan-wave-preview', { includeHiddenElements: true }));
  expect(withTiming).toHaveBeenCalledTimes(1);
  await act(() => mockFinish?.(true));
  await fireEvent.press(screen.getByTestId('titan-wave-preview', { includeHiddenElements: true }));
  expect(withTiming).toHaveBeenCalledTimes(2);
});

it('cancels in the background and on unmount without replaying on foreground', async () => {
  const screen = await mount();
  const initialCancels = jest.mocked(cancelAnimation).mock.calls.length;
  await act(() => appListener('background'));
  expect(jest.mocked(cancelAnimation).mock.calls.length).toBeGreaterThan(initialCancels);
  await act(() => appListener('active'));
  expect(withTiming).toHaveBeenCalledTimes(1);
  const beforeUnmount = jest.mocked(cancelAnimation).mock.calls.length;
  await screen.unmount();
  expect(jest.mocked(cancelAnimation).mock.calls.length).toBeGreaterThan(beforeUnmount);
});

it('keeps a static illustration when motion is reduced', async () => {
  const screen = await mount(true);
  expect(withTiming).not.toHaveBeenCalled();
  expect(screen.getByText('Animations réduites')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('titan-wave-preview', { includeHiddenElements: true }));
  expect(withTiming).not.toHaveBeenCalled();
});

 it('projects only internal layers in the room and ignores replay requests during playback', async () => {
  const screen = await render(<TitanWavePreview presentation="scene" replaySignal={0} reduceMotionOverride={false} />);
  await fireEvent(screen.getByTestId('titan-wave-preview', { includeHiddenElements: true }), 'layout', { nativeEvent: { layout: { width: 768, height: 512 } } });
  expect(screen.queryByTestId('titan-wave-rest')).toBeNull();
  expect(screen.queryByText('Toucher pour rejouer')).toBeNull();
  expect(screen.getByTestId('titan-wave-preview', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
  await screen.rerender(<TitanWavePreview presentation="scene" replaySignal={1} reduceMotionOverride={false} />);
  expect(withTiming).toHaveBeenCalledTimes(1);
  await act(() => mockFinish?.(true));
  await screen.rerender(<TitanWavePreview presentation="scene" replaySignal={2} reduceMotionOverride={false} />);
  expect(withTiming).toHaveBeenCalledTimes(2);
});
