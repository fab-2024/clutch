/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import ShowcaseAtmosphereFallback from '../showcase/ShowcaseAtmosphereFallback';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

describe('ShowcaseAtmosphereFallback', () => {
  it('keeps a fixed M8 star when animation is reduced', async () => {
    const screen = await render(
      <ShowcaseAtmosphereFallback
        atmosphere={{
          cosmeticColor: '#B9DCFF',
          driftDurationMs: 10_000,
          dustCount: 8,
          effect: 'm8-sparkle',
          intensity: 0.39,
          lightingColor: '#B9DCFF',
          rankColor: '#B87845',
          teamColor: '#B9DCFF',
        }}
        reason="reduced-motion"
      />,
    );

    expect(screen.getByTestId(
      'showcase-atmosphere-static-reduced-motion',
      { includeHiddenElements: true },
    )).toBeTruthy();
    expect(screen.getByTestId('showcase-m8-static-star', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('showcase-blue-wall-static-contour', { includeHiddenElements: true })).toBeNull();
  });

  it('keeps a fixed Protocole Néon pulse when animation is reduced', async () => {
    const screen = await render(
      <ShowcaseAtmosphereFallback
        atmosphere={{
          cosmeticColor: '#58DFFF',
          driftDurationMs: 9_000,
          dustCount: 10,
          effect: 'neon-pulse',
          intensity: 0.39,
          lightingColor: '#58DFFF',
          rankColor: '#B87845',
          teamColor: '#E27AFF',
        }}
        reason="reduced-motion"
      />,
    );

    expect(screen.getByTestId(
      'showcase-neon-static-pulse',
      { includeHiddenElements: true },
    )).toBeTruthy();
  });

  it('keeps a fixed Forge resonance when animation is reduced', async () => {
    const screen = await render(
      <ShowcaseAtmosphereFallback
        atmosphere={{
          cosmeticColor: '#F06A3A',
          driftDurationMs: 10_500,
          dustCount: 10,
          effect: 'forge-resonance',
          intensity: 0.39,
          lightingColor: '#F06A3A',
          rankColor: '#B87845',
          teamColor: '#43BFC1',
        }}
        reason="reduced-motion"
      />,
    );

    expect(screen.getByTestId(
      'showcase-forge-static-resonance',
      { includeHiddenElements: true },
    )).toBeTruthy();
  });
});
