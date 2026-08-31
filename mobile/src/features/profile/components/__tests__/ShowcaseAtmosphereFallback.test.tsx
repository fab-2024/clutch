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
});
