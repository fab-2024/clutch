import { attachmentPose, machineRole, bubbleEnergy, coreEnergy, mutationFill, pressure, MUTATION_DURATION } from './motion';
import { createReactorLabState, reactorLabReducer, type ReactorStage } from './model';

describe('mechanical choreography', () => {
  it('never animates the preloaded form beyond the current destination', () => {
    expect(machineRole(3, 1, 2)).toBe('preloaded');
    expect(machineRole(4, 2, 3)).toBe('preloaded');
    expect(machineRole(5, 3, 4)).toBe('preloaded');
    expect(machineRole(2, 1, 2)).toBe('incoming');
    expect(machineRole(2, 2, 2)).toBe('resting');
    expect(machineRole(2, 2, 3)).toBe('outgoing');
  });
  it('holds the charged reservoir through assembly, then settles continuously to the new range', () => {
    expect(mutationFill(0, .63)).toBe(.63);
    for (const t of [760, 1260, 1800, 2400, 3100, 3150]) expect(mutationFill(t, .63)).toBe(1);
    expect(mutationFill(3500, .63)).toBeGreaterThan(mutationFill(3700, .63));
    expect(mutationFill(MUTATION_DURATION, .63)).toBe(0);
  });
  it('assembles asymmetric panels from the sides, satellites from below and rear framework from above', () => {
    expect(attachmentPose('left', 2, true, 2000, false).x).toBeLessThan(0);
    expect(attachmentPose('right', 2, true, 2000, false).x).toBeGreaterThan(Math.abs(attachmentPose('left', 2, true, 2000, false).x));
    expect(attachmentPose('left', 3, true, 2200, false).y).toBeGreaterThan(0);
    expect(attachmentPose('rear-left', 5, true, 2200, false).y).toBeLessThan(0);
  });
  it('ends every transformation with the destination pieces exactly assembled and the old pieces hidden', () => {
    for (const stage of [1, 2, 3, 4, 5] as ReactorStage[]) {
      for (const piece of ['left', 'right', 'base-left', 'base-right', 'rear-left', 'rear-right']) {
        const pose = attachmentPose(piece, stage, true, MUTATION_DURATION, false);
        expect(pose.visible).toBe(1);
        expect(pose.x).toBeCloseTo(0); expect(pose.y).toBeCloseTo(0);
        expect(attachmentPose(piece, stage, false, MUTATION_DURATION, false).visible).toBe(0);
      }
    }
  });
  it('uses a stationary reduced-motion transition and stays completely calm afterward', () => {
    for (const t of [0, 150, 300]) {
      const pose = attachmentPose('left', 3, true, t, true);
      expect([pose.x, pose.y]).toEqual([0, 0]);
    }
    expect(attachmentPose('left', 2, false, 300, true).visible).toBe(0);
    expect(attachmentPose('left', 3, true, 300, true).visible).toBe(1);
    expect(mutationFill(300, .7, 0, true)).toBe(0);
    for (const [touch, mutation] of [[0, 0], [1650, 0], [0, 3900]]) {
      expect(coreEnergy(touch, mutation)).toBe(0);
      expect(bubbleEnergy(touch, mutation)).toBe(0);
      expect(pressure(mutation)).toBe(0);
    }
  });
  it('cancels backgrounded evolution without advancing the faction and allows retry', () => {
    const prepared = reactorLabReducer(createReactorLabState(2500), { type: 'prepare' });
    const running = reactorLabReducer(prepared, { type: 'start' });
    const cancelled = reactorLabReducer(running, { type: 'cancel' });
    expect(cancelled).toEqual(prepared);
    expect(reactorLabReducer(cancelled, { type: 'finish' })).toEqual(prepared);
    expect(reactorLabReducer(cancelled, { type: 'start' }).running).toBe(true);
  });
});
