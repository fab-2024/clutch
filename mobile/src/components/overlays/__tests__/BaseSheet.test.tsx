/// <reference types="jest" />

import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { layout } from '@/src/theme';

import { BaseSheet } from '../BaseSheet';

jest.mock('react-native-reanimated', () => {
  const ReactNative = jest.requireActual('react-native');
  const identity = (value: number) => value;
  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: { cubic: identity, out: () => identity },
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

describe('BaseSheet', () => {
  it('exposes modal semantics and closes from its explicit control', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <BaseSheet onClose={onClose} scrollable={false} testID="sheet" title="Confirmer" visible>
        <Text>Contenu</Text>
      </BaseSheet>,
    );

    expect(screen.getByTestId('sheet').props.accessibilityViewIsModal).toBe(true);
    expect(screen.getByRole('header')).toHaveTextContent('Confirmer');
    fireEvent.press(screen.getByRole('button', { name: 'Fermer Confirmer' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('prevents every dismiss action while locked', async () => {
    const onClose = jest.fn();
    const screen = await render(
      <BaseSheet dismissible={false} onClose={onClose} scrollable={false} title="Transaction" visible>
        <Text>En cours</Text>
      </BaseSheet>,
    );
    const close = screen.getByRole('button', { name: 'Fermer Transaction' });

    expect(close.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(close);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('uses the minimum shared touch target for close', async () => {
    const screen = await render(
      <BaseSheet onClose={jest.fn()} scrollable={false} title="Détail" visible>
        <Text>Contenu</Text>
      </BaseSheet>,
    );
    const style = StyleSheet.flatten(screen.getByRole('button', { name: 'Fermer Détail' }).props.style);

    expect(style.width).toBe(layout.minTouchTarget);
    expect(style.height).toBe(layout.minTouchTarget);
  });
});
