/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import { RELIC_CONTAINER_SEQUENCE, RELIC_STAGE_ARTWORK } from '../../relicArtwork';
import StaticRelicVial from '../StaticRelicVial';

jest.mock('react-native-svg', () => {
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: View,
    ClipPath: View,
    Defs: View,
    Ellipse: View,
    G: View,
    Image: View,
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
    expect(Boolean(screen.queryByTestId(`${id}-foreground`))).toBe(
      Boolean(RELIC_STAGE_ARTWORK[container].foregroundPaths?.length),
    );
    expect(screen.queryByTestId(`${id}-heart`)).toBeNull();
  });

  it('can omit its static elixir when an interactive volume owns the rendering', async () => {
    const screen = await render(
      <StaticRelicVial
        container="ampoule"
        height={330}
        renderLiquid={false}
        testID="interactive-shell"
        width={300}
      />,
    );

    expect(screen.getByTestId('interactive-shell-scene')).toBeTruthy();
    expect(screen.queryByTestId('interactive-shell-elixir')).toBeNull();
  });
});
