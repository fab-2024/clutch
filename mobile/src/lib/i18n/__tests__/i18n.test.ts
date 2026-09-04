import AsyncStorage from '@react-native-async-storage/async-storage';

import { deviceTimeZone, formatDateTime, formatNumber, getActiveLocale, resolveLocale, setActiveLocale, t } from '..';
import { loadLocalePreference, saveLocalePreference } from '../preference';

describe('P3 localization', () => {
  afterEach(() => setActiveLocale('fr-FR'));

  it('falls back to French for unsupported or missing system locales', () => {
    for (const locale of ['fr-FR', 'fr-fr', 'invalid', null, undefined]) {
      expect(resolveLocale(locale)).toBe('fr-FR');
    }
    expect(resolveLocale('en-US')).toBe('en-US');
    expect(resolveLocale('en-GB')).toBe('en-US');
    expect(resolveLocale('fr-CA')).toBe('fr-FR');
  });

  it('switches copy, numbers, plurals and dates to English immediately', () => {
    setActiveLocale('en-US');
    expect(getActiveLocale()).toBe('en-US');
    expect(t('economy.dailyBonus.awarded', { amount: 10 })).toBe('Daily bonus: +10 Volts');
    expect(t('streak.days', { count: 1 })).toContain('DAY');
    expect(t('streak.days', { count: 2 })).toContain('DAYS');
    expect(formatNumber(12_345)).toBe('12,345');
    expect(formatDateTime('2026-09-03T23:30:00Z', 'UTC').toLowerCase()).toContain('sep');
  });

  it('persists only supported language preferences', async () => {
    await AsyncStorage.clear();
    expect(await loadLocalePreference()).toBe('system');
    await saveLocalePreference('en-US');
    expect(await loadLocalePreference()).toBe('en-US');
    await AsyncStorage.setItem('@clutch/locale-preference/v1', 'de-DE');
    expect(await loadLocalePreference()).toBe('system');
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
