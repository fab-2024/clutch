import { deviceTimeZone, formatDateTime, formatNumber, resolveLocale, t } from '..';

describe('French localization foundation', () => {
  it('falls back to French for unsupported or missing system locales', () => {
    for (const locale of ['fr-FR', 'fr-fr', 'en-US', 'invalid', null, undefined]) {
      expect(resolveLocale(locale)).toBe('fr-FR');
    }
  });

  it('interpolates copy and applies French plural rules', () => {
    expect(t('economy.dailyBonus.awarded', { amount: 10 })).toBe('Bonus quotidien : +10 Volts');
    expect(t('economy.displayed', { count: 0 })).toBe('0 AFFICHÉ');
    expect(t('economy.displayed', { count: 1 })).toBe('1 AFFICHÉ');
    expect(t('economy.displayed', { count: 2 })).toBe('2 AFFICHÉS');
    expect(formatNumber(12_345)).toMatch(/^12\s345$/);
  });

  it('formats timestamps in the chosen timezone and handles invalid inputs', () => {
    expect(formatDateTime('2026-09-03T23:30:00Z', 'Europe/Paris')).toContain('04 sept.');
    expect(formatDateTime('2026-09-03T23:30:00Z', 'UTC')).toContain('03 sept.');
    expect(formatDateTime('2026-09-03T23:30:00Z', 'invalid/timezone'))
      .toBe(formatDateTime('2026-09-03T23:30:00Z', 'UTC'));
    expect(formatDateTime('invalid')).toBe('DATE INCONNUE');
    expect(deviceTimeZone().length).toBeGreaterThan(0);
  });
});
