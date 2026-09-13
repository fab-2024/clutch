/// <reference types="jest" />

import { relicBackdropEnergy } from '../relicBackdropMotion';

describe('relic activation backdrop', () => {
  it('stays fully dormant at rest', () => {
    expect(relicBackdropEnergy(0, 0, false)).toBe(0);
  });

  it('lights during both a touch reaction and a mutation', () => {
    expect(relicBackdropEnergy(400, 0, false)).toBeGreaterThan(.9);
    expect(relicBackdropEnergy(0, 900, false)).toBeGreaterThan(.9);
  });

  it('returns to rest and honors reduced motion', () => {
    expect(relicBackdropEnergy(1_650, 0, false)).toBe(0);
    expect(relicBackdropEnergy(400, 900, true)).toBe(0);
  });
});
