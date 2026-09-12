import { forgeAttachment, forgeFill, FORGE_DURATION } from './forgeMotion';

describe('Forge demonstration choreography', () => {
  it('locks every incoming piece into its exact resting pose', () => {
    for (const piece of ['left', 'right', 'base-left', 'base-right']) {
      const pose = forgeAttachment(piece, true, FORGE_DURATION);
      expect(pose.visible).toBe(1);
      for (const value of [pose.x, pose.y, pose.angle]) expect(value).toBeCloseTo(0, 10);
      expect(forgeAttachment(piece, false, FORGE_DURATION).visible).toBe(0);
    }
  });
  it('holds the charged vessel through assembly, then returns to the new stage floor', () => {
    expect(forgeFill(0)).toBe(.72);
    expect(forgeFill(800)).toBe(1);
    expect(forgeFill(3400)).toBe(1);
    expect(forgeFill(FORGE_DURATION)).toBe(0);
  });
});
