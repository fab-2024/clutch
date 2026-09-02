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
  ])('keeps all pedestals on screen at $width × $height', (viewport) => {
    const layout = showcaseSceneLayout(viewport, EMPTY_ROOM);

    expect(layout.canvas.left).toBeGreaterThanOrEqual(0);
    expect(layout.canvas.top).toBeGreaterThanOrEqual(0);
    expect(layout.canvas.left + layout.canvas.width).toBeLessThanOrEqual(viewport.width);
    expect(layout.canvas.top + layout.canvas.height).toBeLessThanOrEqual(viewport.height);
    expect(layout.canvas.width / layout.canvas.height).toBeCloseTo(1844 / 853);
    expect(layout.image.width).toBe(layout.canvas.width);
    expect(layout.image.height).toBe(layout.canvas.height);
    expect(layout.image.top).toBe(0);
  });

  it('crops the existing catalog UI without shifting its relative slot coordinates', () => {
    const layout = showcaseSceneLayout({ width: 844, height: 390 });

    expect(layout.canvas.width).toBe(844);
    expect(layout.canvas.height).toBeCloseTo(844 * 589 / 1844);
    expect(layout.image.top).toBeCloseTo(-844 * 87 / 1844);
    expect(layout.image.height).toBeCloseTo(844 * 853 / 1844);
  });
});
