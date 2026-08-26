import {
  skiaBoilingBubbleCount,
  skiaHeartInstability,
  skiaMutationSurge,
  skiaRamificationLevel,
  skiaTapHeatEnvelope,
} from '@/src/features/social/faction/relicSkiaMotion';

describe('relic Skia motion', () => {
  it('makes every larger vessel more alive', () => {
    const instabilities = [1, 2, 3, 4, 5].map((stage) => (
      skiaHeartInstability(stage, 0, 0, 0)
    ));

    expect(instabilities).toEqual([...instabilities].sort((left, right) => left - right));
    expect(instabilities[0]).toBeLessThan(.1);
    expect(instabilities[4]).toBeGreaterThan(.85);
  });

  it('adds bubbles and ramifications at every evolution', () => {
    expect([1, 2, 3, 4, 5].map(skiaBoilingBubbleCount)).toEqual([3, 6, 9, 12, 15]);
    expect([1, 2, 3, 4, 5].map(skiaRamificationLevel)).toEqual([0, 1, 2, 3, 4]);
  });

  it('keeps tap heat and mutation energy inside a finite envelope', () => {
    const heat = [0, .1, .25, .5, .8, 1].map(skiaTapHeatEnvelope);
    const mutation = [0, .2, .47, .7, 1].map(skiaMutationSurge);

    expect(Math.max(...heat)).toBeGreaterThan(.8);
    expect(Math.max(...mutation)).toBeGreaterThan(.9);
    expect([...heat, ...mutation].every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(heat[0]).toBe(0);
    expect(heat[heat.length - 1]).toBeCloseTo(0, 8);
  });
});
