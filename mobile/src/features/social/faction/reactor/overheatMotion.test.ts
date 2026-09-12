import { OVERHEAT_DURATION, overheatFill, overheatMachineTime, overheatTemperature } from './overheatMotion';

describe('overheat evolution', () => {
  it('heats, ruptures, then cools before the new level settles', () => {
    expect(overheatTemperature(0)).toBe(0);
    expect(overheatTemperature(2000)).toBe(1);
    expect(overheatTemperature(4250)).toBe(0);
    expect(overheatMachineTime(2000)).toBe(1120);
    expect(overheatMachineTime(3700)).toBe(3150);
    expect(overheatFill(4250, .72, .23)).toBeCloseTo(.96);
  });
  it.each([0, .23, .9, 1])('preserves the actual destination ratio %s, including Nexus completion', target => {
    expect(overheatFill(0, .72, target)).toBe(.72);
    expect(overheatFill(OVERHEAT_DURATION, .72, target)).toBeCloseTo(target);
    for (let time = 0; time <= OVERHEAT_DURATION; time += 10) {
      const fill = overheatFill(time, .72, target);
      expect(fill).toBeGreaterThanOrEqual(0);
      expect(fill).toBeLessThanOrEqual(1);
    }
  });
  it('never lowers a full old tank during charge', () => {
    expect(overheatFill(2000, 1, 0)).toBe(1);
  });
  it('settles directly in 300 ms with reduced motion', () => {
    expect(overheatFill(0, .72, .31, true)).toBe(.72);
    expect(overheatFill(300, .72, .31, true)).toBeCloseTo(.31);
  });
});
