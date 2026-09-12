import { createReactorLabState, nextReactorStage, reactorFillRatio, reactorLabReducer, reactorLiquidY, REACTOR_CAVITY, REACTOR_STAGES } from './model';

describe('reactor liquid progression', () => {
  it('rises continuously for consecutive supporters', () => {
    for (const count of [1, 19, 20, 50, 51, 90, 99]) {
      expect(reactorLiquidY(reactorFillRatio(count + 1, 1, 100))).toBeLessThan(reactorLiquidY(reactorFillRatio(count, 1, 100)));
    }
  });
  it('uses the new stage range after evolution', () => {
    expect(reactorFillRatio(100, 1, 100)).toBe(1);
    expect(reactorFillRatio(100, 100, 500)).toBe(0);
    expect(reactorFillRatio(101, 100, 500)).toBeCloseTo(.0025);
  });
  it('keeps the liquid inside the measured cavity', () => {
    expect(reactorLiquidY(-1)).toBe(REACTOR_CAVITY.bottom);
    expect(reactorLiquidY(2)).toBe(REACTOR_CAVITY.top);
    expect(reactorFillRatio(Number.NaN, 1, 100)).toBe(0);
    expect(reactorFillRatio(10, 100, 100)).toBe(0);
  });
});

describe('five reactor stages', () => {
  it('matches existing supporter thresholds and keeps the terminal state on Nexus', () => {
    expect([1, 99, 100, 499, 500, 1999, 2000, 4999, 5000, 10000].map((count) => createReactorLabState(count).stage)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(nextReactorStage(5)).toBeNull();
  });
  it('requires a prepared mutation and finishes each transition exactly once', () => {
    let state = createReactorLabState();
    expect(reactorLabReducer(state, { type: 'start' })).toBe(state);
    for (const stage of REACTOR_STAGES.slice(0, 4)) {
      state = reactorLabReducer(state, { type: 'prepare' });
      expect(state.supporters).toBe(stage.ceiling - 1);
      state = reactorLabReducer(state, { type: 'start' });
      expect(reactorLabReducer(state, { type: 'start' })).toBe(state);
      state = reactorLabReducer(state, { type: 'finish' });
      expect(state.stage).toBe(stage.level + 1);
      expect(state.supporters).toBe(stage.ceiling);
      expect(reactorLabReducer(state, { type: 'finish' })).toBe(state);
    }
    expect(reactorLabReducer(state, { type: 'prepare' })).toBe(state);
  });
  it('ignores a stale completion after resetting a running transformation', () => {
    let state = reactorLabReducer(createReactorLabState(1200), { type: 'prepare' });
    state = reactorLabReducer(state, { type: 'start' });
    state = reactorLabReducer(state, { type: 'reset', supporters: 63 });
    expect(reactorLabReducer(state, { type: 'finish' })).toEqual(createReactorLabState(63));
  });
  it('bounds invalid preview input and invalid liquid values', () => {
    expect(createReactorLabState(Number.NaN).supporters).toBe(63);
    expect(createReactorLabState(-10).supporters).toBe(1);
    expect(createReactorLabState(50000).supporters).toBe(10000);
    expect(reactorLiquidY(Number.NaN)).toBe(REACTOR_CAVITY.bottom);
    expect(reactorFillRatio(10, 1, Infinity)).toBe(0);
  });
});
