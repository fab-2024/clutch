/// <reference types="jest" />

import { showcaseSceneLayout } from '../showcase/showcaseSceneLayout';

const EMPTY_ROOM = { width: 1844, height: 853, top: 0, bottom: 853 };

describe('showcaseSceneLayout', () => {
  it.each([
    { width: 844, height: 390 },
    { width: 1708, height: 790 },
    { width: 932, height: 430 },
    { width: 844, height: 320 },
    { width: 390, height: 844 },
  ])('fills the available viewport at $width × $height', (viewport) => {
    const layout = showcaseSceneLayout(viewport, EMPTY_ROOM);

    expect(layout.canvas).toEqual({ left: 0, top: 0, width: viewport.width, height: viewport.height });
    expect(layout.image.width).toBe(viewport.width);
    expect(layout.image.height).toBe(viewport.height);
    expect(layout.image.top).toBe(0);
  });

  it('maps the cropped catalog frame onto the full viewport without exposing its legacy UI', () => {
    const layout = showcaseSceneLayout({ width: 844, height: 390 });

    expect(layout.canvas.width).toBe(844);
    expect(layout.canvas.height).toBe(390);
    expect(layout.image.top).toBeCloseTo(-390 * 87 / 589);
    expect(layout.image.height).toBeCloseTo(390 * 853 / 589);
  });
});
