/// <reference types="jest" />

import { resolveRelicInstability } from '../relicState';

describe('relic instability', () => {
  it('returns zero when the objective is zero', () => {
    expect(resolveRelicInstability(40, 0)).toEqual({
      ratio: 0,
      tier: 'calm',
      localIntensity: 0,
    });
  });

  it('clamps ratios outside the objective range', () => {
    expect(resolveRelicInstability(-10, 100).ratio).toBe(0);
    expect(resolveRelicInstability(150, 100).ratio).toBe(1);
  });

  it.each([
    [49, 'calm'],
    [50, 'awakening'],
    [74, 'awakening'],
    [75, 'charged'],
    [89, 'charged'],
    [90, 'critical'],
    [99, 'critical'],
    [100, 'mutationReady'],
  ] as const)('maps %i%% to %s', (charge, tier) => {
    expect(resolveRelicInstability(charge, 100).tier).toBe(tier);
  });

  it('progresses local intensity inside a tier', () => {
    const start = resolveRelicInstability(50, 100);
    const middle = resolveRelicInstability(62.5, 100);
    const end = resolveRelicInstability(74.999, 100);
    expect(start.localIntensity).toBe(0);
    expect(middle.localIntensity).toBeCloseTo(.5);
    expect(end.localIntensity).toBeGreaterThan(.99);
  });
});
