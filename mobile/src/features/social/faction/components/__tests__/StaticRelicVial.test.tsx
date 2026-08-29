/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import { RELIC_CONTAINER_SEQUENCE, RELIC_STAGE_ARTWORK } from '../../relicArtwork';
import StaticRelicVial from '../StaticRelicVial';

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: View,
    ClipPath: View,
    Defs: View,
    Ellipse: View,
    G: View,
    LinearGradient: View,
    Path: View,
    RadialGradient: View,
    Rect: View,
    Stop: View,
  };
});

describe('StaticRelicVial', () => {
  it.each(RELIC_CONTAINER_SEQUENCE)('keeps %s scene and elixir as separate layers', async (container) => {
    const id = `vial-${container}`;
    const screen = await render(
      <StaticRelicVial container={container} height={330} testID={id} width={300} />,
    );

    expect(screen.getByTestId(`${id}-elixir`)).toBeTruthy();
    expect(screen.getByTestId(`${id}-scene`).props.source).toBe(RELIC_STAGE_ARTWORK[container].asset);
    expect(screen.queryByTestId(`${id}-heart`)).toBeNull();
  });
});
