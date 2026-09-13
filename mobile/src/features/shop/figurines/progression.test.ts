import { eligibleFigurineForm } from './progression';
it.each([
  [0, 0, 1], [9, 5, 1], [10, 4, 1], [10, 5, 2],
  [49, 20, 2], [50, 19, 2], [50, 20, 3], [500, 100, 3],
  [NaN, 20, 1], [Infinity, 20, 1], [-10, -5, 1],
])('requires both cumulative thresholds for %s calls and %s days', (calls, days, expected) => {
  expect(eligibleFigurineForm(calls, days)).toBe(expected);
});
