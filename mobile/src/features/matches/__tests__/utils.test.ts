import { formatPredictionCountdown, gameKey, gameLabel } from '../utils';

describe('Rocket League game metadata', () => {
  it('recognizes the persisted id and human label before the generic League fallback', () => {
    expect(gameLabel('rocket_league')).toBe('RL');
    expect(gameLabel('Rocket League')).toBe('RL');
    expect(gameKey('rocket_league')).toBe('RL');
  });

  it('does not expose the retired Counter-Strike identifier as a supported game', () => {
    expect(gameKey('cs2')).toBe('Autres');
  });
});

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
