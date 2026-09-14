import AsyncStorage from '@react-native-async-storage/async-storage';

import { deviceTimeZone, formatDateTime, formatNumber, getActiveLocale, resolveLocale, setActiveLocale, t } from '..';
import { loadLocalePreference, saveLocalePreference } from '../preference';

describe('P3 localization', () => {
  afterEach(() => setActiveLocale('fr-FR'));

  it('starts and translates plurals when the native runtime lacks Intl.PluralRules', () => {
    const descriptor = Object.getOwnPropertyDescriptor(Intl, 'PluralRules')!;
    try {
      Reflect.deleteProperty(Intl, 'PluralRules');
      jest.isolateModules(() => {
        const nativeI18n = jest.requireActual('..') as typeof import('..');
        expect(nativeI18n.t('economy.dailyBonus.awarded', { amount: 10 })).toBe('Bonus quotidien : +10 Volts');
        expect(nativeI18n.t('economy.displayed', { count: 0 })).toBe('0 AFFICHÉ');
        expect(nativeI18n.t('economy.displayed', { count: 2 })).toBe('2 AFFICHÉS');
        expect(nativeI18n.t('streak.days', { count: 1 })).toContain('JOUR');
        expect(nativeI18n.t('streak.days', { count: 2 })).toContain('JOURS');
      });
    } finally {
      Object.defineProperty(Intl, 'PluralRules', descriptor);
    }
  });

  it('falls back to French for unsupported or missing system locales', () => {
    for (const locale of ['fr-FR', 'fr-fr', 'invalid', null, undefined]) {
      expect(resolveLocale(locale)).toBe('fr-FR');
    }
    expect(resolveLocale('en-US')).toBe('fr-FR');
    expect(resolveLocale('en-GB')).toBe('fr-FR');
    expect(resolveLocale('fr-CA')).toBe('fr-FR');
  });

  it('keeps copy, numbers, plurals and dates in French', () => {
    expect(getActiveLocale()).toBe('fr-FR');
    expect(t('economy.dailyBonus.awarded', { amount: 10 })).toBe('Bonus quotidien : +10 Volts');
    expect(t('streak.days', { count: 1 })).toContain('JOUR');
    expect(t('streak.days', { count: 2 })).toContain('JOURS');
    expect(formatNumber(12_345)).toMatch(/^12\s345$/);
    expect(formatDateTime('2026-09-03T23:30:00Z', 'UTC').toLowerCase()).toContain('sept');
  });

  it('migrates every stored language preference to French', async () => {
    await AsyncStorage.clear();
    expect(await loadLocalePreference()).toBe('fr-FR');
    await expect(AsyncStorage.getItem('@clutch/locale-preference/v1')).resolves.toBe('fr-FR');
    await AsyncStorage.setItem('@clutch/locale-preference/v1', 'en-US');
    expect(await loadLocalePreference()).toBe('fr-FR');
    await expect(AsyncStorage.getItem('@clutch/locale-preference/v1')).resolves.toBe('fr-FR');
    await AsyncStorage.setItem('@clutch/locale-preference/v1', 'de-DE');
    expect(await loadLocalePreference()).toBe('fr-FR');
    await saveLocalePreference('system');
    await expect(AsyncStorage.getItem('@clutch/locale-preference/v1')).resolves.toBe('fr-FR');
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
