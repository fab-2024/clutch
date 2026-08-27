import { formatPredictionCountdown } from '../utils';

describe('formatPredictionCountdown', () => {
  it('formats the time remaining before a call locks', () => {
    expect(formatPredictionCountdown('2026-08-27T16:12:18.000Z', Date.parse('2026-08-27T14:30:00.000Z')))
      .toBe('01:42:18');
  });

  it('never returns a negative countdown', () => {
    expect(formatPredictionCountdown('2026-08-27T14:00:00.000Z', Date.parse('2026-08-27T14:30:00.000Z')))
      .toBe('00:00:00');
  });

  it('handles an invalid closing date', () => {
    expect(formatPredictionCountdown('invalid', Date.parse('2026-08-27T14:30:00.000Z')))
      .toBe('--:--:--');
  });
});
