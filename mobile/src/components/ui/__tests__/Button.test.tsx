/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, layout } from '@/src/theme';

import { Button } from '../Button';

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

describe('Button', () => {
  it('exposes a stable accessible button contract', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <Button
        accessibilityHint="Confirme la sélection"
        label="VERROUILLER"
        onPress={onPress}
        testID="button"
      />,
    );
    const button = screen.getByTestId('button');

    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('VERROUILLER');
    expect(button.props.accessibilityHint).toBe('Confirme la sélection');
    expect(button.props.accessibilityState).toEqual({ busy: false, disabled: false });

    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps its active tone while loading and blocks repeated presses', async () => {
    const onPress = jest.fn();
    const screen = await render(<Button label="ACHETER" loading onPress={onPress} testID="button" />);
    const button = screen.getByTestId('button');

    expect(button.props.accessibilityState).toEqual({ busy: true, disabled: true });
    const [indicator] = screen.container.queryAll((node) => node.type === 'ActivityIndicator');
    expect(indicator?.props.color).toBe(colors.background);
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('uses a readable disabled label and blocks the action', async () => {
    const onPress = jest.fn();
    const screen = await render(<Button disabled label="ACHETER" onPress={onPress} testID="button" />);

    expect(StyleSheet.flatten(screen.getByText('ACHETER').props.style).color).toBe(colors.textDisabled);
    fireEvent.press(screen.getByTestId('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('enforces the shared touch target', async () => {
    const screen = await render(<Button label="CONTINUER" onPress={jest.fn()} testID="button" />);
    const style = StyleSheet.flatten(screen.getByTestId('button').props.style);

    expect(style.minHeight).toBe(layout.controlHeight);
  });
});
