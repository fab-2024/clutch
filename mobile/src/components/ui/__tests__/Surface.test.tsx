/// <reference types="jest" />

import { render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from '@/src/theme';

import { Surface } from '../Surface';

describe('Surface', () => {
  it('maps semantic visual props to the locked token scales', async () => {
    const screen = await render(
      <Surface border="strong" padding="lg" radius="lg" testID="surface" tone="interactive">
        <Text>Contenu</Text>
      </Surface>,
    );
    const style = StyleSheet.flatten(screen.getByTestId('surface').props.style);

    expect(style.backgroundColor).toBe(colors.surfaceInteractive);
    expect(style.borderColor).toBe(colors.borderStrong);
    expect(style.borderRadius).toBe(radius.lg);
    expect(style.padding).toBe(spacing.lg);
  });
});
