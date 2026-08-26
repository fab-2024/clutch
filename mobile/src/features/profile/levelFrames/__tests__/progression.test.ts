/// <reference types="jest" />

import { getSignalAscendantStage } from '../progression';

describe('getSignalAscendantStage', () => {
  it.each([
    [1, 1],
    [9, 1],
    [10, 2],
    [24, 2],
    [25, 3],
    [49, 3],
    [50, 4],
    [74, 4],
    [75, 5],
    [99, 5],
    [100, 6],
    [248, 6],
  ])('maps level %i to stage %i', (level, expected) => {
    expect(getSignalAscendantStage(level)).toBe(expected);
  });
});
