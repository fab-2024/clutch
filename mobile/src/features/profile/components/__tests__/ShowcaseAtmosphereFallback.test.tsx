/// <reference types="jest" />

import { render } from '@testing-library/react-native';

import ShowcaseAtmosphereFallback from '../showcase/ShowcaseAtmosphereFallback';

jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

describe('ShowcaseAtmosphereFallback', () => {
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

  it('keeps the Forge atmosphere without the rings and crosshair overlay', async () => {
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

    expect(screen.queryByTestId(
      'showcase-forge-static-resonance',
      { includeHiddenElements: true },
    )).toBeNull();
    expect(screen.getByTestId('showcase-atmosphere-static-reduced-motion', { includeHiddenElements: true })).toBeTruthy();
  });

  it('keeps a fixed Circuit Zéro afterimage when animation is reduced', async () => {
    const screen = await render(
      <ShowcaseAtmosphereFallback
        atmosphere={{
          cosmeticColor: '#C7F000',
          driftDurationMs: 8_500,
          dustCount: 9,
          effect: 'circuit-afterimage',
          intensity: 0.39,
          lightingColor: '#C7F000',
          rankColor: '#B87845',
          teamColor: '#EA4FC9',
        }}
        reason="reduced-motion"
      />,
    );

    expect(screen.getByTestId(
      'showcase-circuit-static-afterimage',
      { includeHiddenElements: true },
    )).toBeTruthy();
  });
});
