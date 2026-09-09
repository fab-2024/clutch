import { showcaseRankDisplayLayout } from '../showcase/showcaseRankDisplayLayout';

describe('showcase rank display placement', () => {
  it.each([
    'rank_carbon_cradle', 'rank_crystal_capsule', 'rank_royal_crown',
    'rank_orbital_core', 'rank_volcanic_forge', 'rank_clutch_revelation',
  ])('keeps %s inside a short viewport without moving the base or stretching the object', (displayId) => {
    const input = { displayId, roomId: 'dernier-round-extraction-pedestal',
      imageLayout: { left: 0, top: -20, width: 1500, height: 300 } };
    const unconstrained = showcaseRankDisplayLayout(input)!;
    const fitted = showcaseRankDisplayLayout({ ...input, viewportHeight: 250 })!;
    const scale = fitted.image.width / unconstrained.image.width;
    expect(fitted.image.top).toBeGreaterThanOrEqual(250 * 0.12 - 0.001);
    expect(fitted.groundY).toBe(unconstrained.groundY);
    expect(fitted.centerX).toBe(unconstrained.centerX);
    expect(fitted.image.height / unconstrained.image.height).toBeCloseTo(scale);
    expect(fitted.maxArtworkSize / unconstrained.maxArtworkSize).toBeCloseTo(scale);
    expect(fitted.groundY - fitted.seatY).toBeCloseTo((unconstrained.groundY - unconstrained.seatY) * scale);
  });

  it('lets portrait objects fill the display height without moving its ground anchor', () => {
    const input = { displayId: 'rank_clutch_revelation', roomId: 'obsidian-gallery',
      imageLayout: { left: 0, top: 0, width: 1000, height: 500 } };
    const square = showcaseRankDisplayLayout(input)!;
    const dragon = showcaseRankDisplayLayout({ ...input, artworkAspectRatio: 656 / 768 })!;
    const wideObject = showcaseRankDisplayLayout({ ...input, artworkAspectRatio: 2 })!;
    expect(dragon.maxArtworkSize).toBeGreaterThan(square.maxArtworkSize);
    expect(wideObject.maxArtworkSize).toBe(square.maxArtworkSize);
    expect(dragon.seatY).toBe(square.seatY);
    expect(dragon.groundY).toBe(square.groundY);
    expect(dragon.image).toEqual(square.image);
  });

  it('anchors the visible crystal base to the removed pedestal instead of the old object box', () => {
    const layout = showcaseRankDisplayLayout({
      displayId: 'rank_crystal_capsule', roomId: 'obsidian-gallery',
      imageLayout: { left: 0, top: 0, width: 1000, height: 500 },
    })!;
    expect(layout.image.top + layout.image.height * 653 / 709).toBeCloseTo(345);
    expect(layout.image.left + layout.image.width * 509.5 / 1024).toBeCloseTo(500);
    expect(layout.image.width * 435 / 1024).toBeCloseTo(169.2);
    expect(layout.image.width / layout.image.height).toBeCloseTo(1024 / 709);
    expect(layout.seatY).toBeLessThan(layout.groundY);
    expect(layout.maxArtworkSize).toBeGreaterThan(0);
  });

  it('keeps the same ground anchor for different displays and follows viewport resizing', () => {
    const input = { roomId: 'mythes-forge-magma-pedestals', imageLayout: { left: 0, top: -30, width: 844, height: 450 } };
    const crystal = showcaseRankDisplayLayout({ ...input, displayId: 'rank_crystal_capsule' })!;
    const crown = showcaseRankDisplayLayout({ ...input, displayId: 'rank_royal_crown' })!;
    expect(crown.groundY).toBe(crystal.groundY);
    expect(crown.centerX).toBe(crystal.centerX);
    const resized = showcaseRankDisplayLayout({ ...input, displayId: 'rank_crystal_capsule',
      imageLayout: { left: 0, top: -60, width: 1688, height: 900 },
    })!;
    expect(resized.image.top).toBeCloseTo(crystal.image.top * 2);
    expect(resized.image.left).toBeCloseTo(crystal.image.left * 2);
    expect(resized.seatY).toBeCloseTo(crystal.seatY * 2);
  });
});
